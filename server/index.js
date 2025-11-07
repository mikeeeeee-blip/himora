const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const { settlementJob, manualSettlement } = require('./jobs/settlementJob'); // ✅ Import backfill
const Transaction = require('./models/Transaction');
const Payout = require('./models/Payout');

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
app.use('/api', require('./routes/apiRoutes'));
app.use('/api/superadmin', require('./routes/superAdminRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/razorpay', require('./routes/razorpayRoutes')); // ✅ NEW
app.use('/api/crypto', require('./routes/cryptoRoutes')); // ✅ NEW: Crypto payout webhook

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));