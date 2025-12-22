// Load environment variables FIRST, before any other imports
// This ensures all modules can access process.env when they load
const dotenv = require('dotenv');
const path = require('path');

// Explicitly specify the .env file path to ensure it's found
const envPath = path.join(__dirname, '.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.warn('⚠️  Warning: Could not load .env file:', result.error.message);
    console.warn('   Attempted path:', envPath);
    console.warn('   Current working directory:', process.cwd());
} else {
    console.log('✅ Environment variables loaded from:', envPath);
}

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { settlementJob, manualSettlement } = require('./jobs/settlementJob'); // ✅ Import backfill
const Transaction = require('./models/Transaction');
const Payout = require('./models/Payout');
const User = require('./models/User');
const { getProductBySlug, getAllProducts, getProductsByCategory } = require('./ecommerce/products');
const { createSabpaisaPaymentLink } = require('./controllers/sabpaisaController');

const app = express();

// ✅ MongoDB connection check middleware
const checkMongoConnection = (req, res, next) => {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
            success: false,
            error: 'Database connection not available. Please try again in a moment.',
            connectionState: mongoose.connection.readyState
        });
    }
    next();
};

// Enable CORS
app.use(cors());

// Parse bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf.toString();
    }
}));

// ✅ Settlement job will be started after MongoDB connection (moved to startServer function)

// Serve e-commerce static files (CSS, JS, etc.)
app.use('/ecommerce', express.static(path.join(__dirname, 'ecommerce')));
app.use(express.static(path.join(__dirname, 'ecommerce'))); // Also serve at root for assets
app.use('/assets', express.static(path.join(__dirname, 'assets'))); // Serve assets folder

// Serve e-commerce pages
app.get('/ecommerce', (req, res) => {
    res.sendFile(path.join(__dirname, 'ecommerce', 'index.html'));
});
app.get('/ecommerce/shop.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'ecommerce', 'shop.html'));
});
app.get('/ecommerce/collections.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'ecommerce', 'collections.html'));
});
app.get('/ecommerce/about.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'ecommerce', 'about.html'));
});
app.get('/ecommerce/contact.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'ecommerce', 'contact.html'));
});

// Serve e-commerce at root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'ecommerce', 'index.html'));
});
app.get('/shop.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'ecommerce', 'shop.html'));
});
app.get('/shop', (req, res) => {
    res.sendFile(path.join(__dirname, 'ecommerce', 'shop.html'));
});
app.get('/collections.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'ecommerce', 'collections.html'));
});
app.get('/about.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'ecommerce', 'about.html'));
});
app.get('/contact.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'ecommerce', 'contact.html'));
});

// Policy pages
app.get('/privacy-policy.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'ecommerce', 'privacy-policy.html'));
});
app.get('/refund-policy.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'ecommerce', 'refund-policy.html'));
});
app.get('/terms-conditions.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'ecommerce', 'terms-conditions.html'));
});
app.get('/shipping-policy.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'ecommerce', 'shipping-policy.html'));
});

// Product slug pages
app.get('/product/:slug', (req, res) => {
    res.sendFile(path.join(__dirname, 'ecommerce', 'product.html'));
});

// Checkout page
app.get('/checkout.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'ecommerce', 'checkout.html'));
});

// Cart page
app.get('/cart.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'ecommerce', 'cart.html'));
});

// E-commerce API routes
app.get('/api/ecommerce/product/:slug', (req, res) => {
    try {
        const { slug } = req.params;
        const product = getProductBySlug(slug);
        
        if (product) {
            res.json({ success: true, product });
        } else {
            res.status(404).json({ success: false, error: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/ecommerce/products', (req, res) => {
    try {
        const { category } = req.query;
        let products;
        
        if (category) {
            products = getProductsByCategory(category);
        } else {
            products = getAllProducts();
        }
        
        res.json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// E-commerce checkout endpoint (guest checkout with Subpaisa)
app.post('/api/ecommerce/checkout', async (req, res) => {
    try {
        const {
            customer_name,
            customer_email,
            customer_phone,
            customer_address,
            customer_city,
            customer_state,
            customer_pincode,
            amount,
            description,
            items
        } = req.body;

        // Validate required fields
        if (!customer_name || !customer_email || !customer_phone || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: customer_name, customer_email, customer_phone, amount'
            });
        }

        // Validate phone number
        if (!/^[0-9]{10}$/.test(customer_phone)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid phone number. Must be 10 digits.'
            });
        }

        // Validate email
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email address'
            });
        }

        // Validate amount
        if (parseFloat(amount) < 1) {
            return res.status(400).json({
                success: false,
                error: 'Amount must be at least ₹1'
            });
        }

        // Get default merchant for ecommerce (from environment or first merchant)
        let defaultMerchant = null;
        const defaultMerchantId = process.env.ECOM_DEFAULT_MERCHANT_ID;
        
        if (defaultMerchantId) {
            defaultMerchant = await User.findById(defaultMerchantId);
        }
        
        // If no default merchant set, get the first merchant
        if (!defaultMerchant) {
            defaultMerchant = await User.findOne({ role: { $ne: 'superAdmin' } });
        }

        if (!defaultMerchant) {
            return res.status(500).json({
                success: false,
                error: 'No merchant configured for ecommerce checkout'
            });
        }

        // Create a mock request object with merchant info for createSabpaisaPaymentLink
        const mockReq = {
            body: {
                amount: amount.toString(),
                customer_name,
                customer_email,
                customer_phone,
                description: description || `Ecommerce order: ${items?.map(i => i.product?.title || 'Item').join(', ') || 'Order'}`,
                success_url: `${process.env.FRONTEND_URL || process.env.BACKEND_URL || 'http://localhost:5000'}/payment-success`,
                failure_url: `${process.env.FRONTEND_URL || process.env.BACKEND_URL || 'http://localhost:5000'}/payment-failed`
            },
            merchantId: defaultMerchant._id,
            merchantName: defaultMerchant.name || 'Ecommerce Store'
        };

        // Create payment link using Subpaisa controller
        await createSabpaisaPaymentLink(mockReq, res);

    } catch (error) {
        console.error('Ecommerce checkout error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process checkout',
            detail: error.message
        });
    }
});

// Health check endpoint (excluded from MongoDB check)
app.get('/api/health', (req, res) => {
    const mongoose = require('mongoose');
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    res.status(200).json({
        success: true,
        status: dbStatus === 'connected' ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        database: {
            status: dbStatus,
            readyState: mongoose.connection.readyState
        }
    });
});

// ✅ Backfill missin
app.get('/api/superadmin/manual-settlement', async (req, res) => {
    try {
        await manualSettlement();
        res.json({ success: true, message: 'Manual settlement completed' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ================= TEMP DEBUG ROUTE: Reject a payout by payoutId =================
// Usage: POST /api/debug/reject-payout/PAYOUT_ID
// Body (optional): { reason: "some text" }
app.post('/api/debug/reject-payout/:payoutId', async (req, res) => {
    try {
        const payoutId = req.params.payoutId || req.body.payoutId;
        const reason = (req.body && req.body.reason) || 'Rejected via temporary debug route';

        if (!payoutId) {
            return res.status(400).json({ success: false, error: 'payoutId is required' });
        }

        const payout = await Payout.findOne({ payoutId });
        if (!payout) {
            return res.status(404).json({ success: false, error: 'Payout not found' });
        }

        payout.status = 'rejected';
        payout.rejectedAt = new Date();
        payout.rejectionReason = reason;
        payout.rejectedByName = 'TEMP_DEBUG_ROUTE';
        await payout.save();

        return res.json({ success: true, message: 'Payout rejected successfully', payout: {
            payoutId: payout.payoutId,
            status: payout.status,
            rejectedAt: payout.rejectedAt,
            rejectionReason: payout.rejectionReason
        }});
    } catch (error) {
        console.error('Temp reject payout error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ Apply MongoDB connection check to all API routes (except /api/health)
app.use('/api', (req, res, next) => {
    if (req.path === '/health') {
        return next(); // Skip MongoDB check for health endpoint
    }
    checkMongoConnection(req, res, next);
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/superadmin', require('./routes/superAdminRoutes')); // Must be before /api to avoid conflicts
app.use('/api', require('./routes/apiRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/razorpay', require('./routes/razorpayRoutes'));
app.use('/api/paytm', require('./routes/paytmRoutes'));
app.use('/api/easebuzz', require('./routes/easebuzzRoutes')); // ✅ NEW
app.use('/api/sabpaisa', require('./routes/sabpaisaRoutes')); // ✅ NEW
app.use('/api/cashfree', require('./routes/cashfreeRoutes')); // ✅ NEW

// Ensure logs are flushed immediately (important for PM2)
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = function(...args) {
    originalLog.apply(console, args);
    if (process.stdout.isTTY === false) {
        process.stdout.write('\n');
    }
};

console.error = function(...args) {
    originalError.apply(console, args);
    if (process.stderr.isTTY === false) {
        process.stderr.write('\n');
    }
};

console.warn = function(...args) {
    originalWarn.apply(console, args);
    if (process.stdout.isTTY === false) {
        process.stdout.write('\n');
    }
};

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

const PORT = process.env.PORT || 5000;

// ✅ Start server only after MongoDB connection is established
async function startServer() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await connectDB();
        console.log('✅ MongoDB connection established');
        
        // Start settlement job after DB connection
        settlementJob.start();
        console.log('✅ Settlement cron job started - runs daily at 4:00 PM IST');
        
        app.listen(PORT, () => {
            const message = `🚀 Server running on port ${PORT} and env is ${process.env.PAYTM_MERCHANT_KEY ? 'set' : 'not set'}`;
            console.log(message);
            // Force flush
            if (process.stdout) process.stdout.write('');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        console.error('❌ MongoDB connection failed. Please check:');
        console.error('   1. MONGO_URI is set correctly in .env file');
        console.error('   2. MongoDB server is running and accessible');
        console.error('   3. Network connectivity to MongoDB host');
        console.error('   4. MongoDB credentials are correct');
        process.exit(1);
    }
}

// Start the server
startServer();