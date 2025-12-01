const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const { settlementJob, manualSettlement } = require('./jobs/settlementJob'); // ✅ Import backfill
const Transaction = require('./models/Transaction');
const Payout = require('./models/Payout');
const { getProductBySlug, getAllProducts, getProductsByCategory } = require('./ecommerce/products');

dotenv.config();
connectDB();

const app = express();

// Enable CORS
app.use(cors());

// Parse bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf.toString();
    }
}));

// ✅ Start settlement job (runs daily at 4 PM IST)
settlementJob.start();
console.log('✅ Settlement cron job started - runs daily at 4:00 PM IST');

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

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
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

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/superadmin', require('./routes/superAdminRoutes')); // Must be before /api to avoid conflicts
app.use('/api', require('./routes/apiRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/razorpay', require('./routes/razorpayRoutes'));
app.use('/api/paytm', require('./routes/paytmRoutes'));
app.use('/api/easebuzz', require('./routes/easebuzzRoutes')); // ✅ NEW
app.use('/api/sabpaisa', require('./routes/sabpaisaRoutes')); // ✅ NEW

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {console.log(`🚀 Server running on port ${PORT} and env is ${process.env.PAYTM_MERCHANT_KEY}`)});