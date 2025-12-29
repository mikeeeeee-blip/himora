const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function (req, res, next) {
    try {
        // Log incoming auth request for device routes
        if (req.path && req.path.includes('/device')) {
            console.log('🔐 Auth middleware - Device route:', {
                path: req.path,
                method: req.method,
                hasToken: !!req.header('x-auth-token') || !!req.header('Authorization')
            });
        }

        // Check for token in different header formats
        const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            if (req.path && req.path.includes('/device')) {
                console.error('❌ Auth failed - No token provided for device route');
            }
            return res.status(401).json({ 
                success: false,
                error: 'No token provided. Authorization denied.' 
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Find user by ID from token
        const user = await User.findById(decoded.user.id);
        
        if (!user) {
            if (req.path && req.path.includes('/device')) {
                console.error('❌ Auth failed - User not found:', decoded.user.id);
            }
            return res.status(401).json({ 
                success: false,
                error: 'User not found. Token invalid.' 
            });
        }

        // Check if user is active
        if (user.status === 'inactive' || user.status === 'suspended') {
            if (req.path && req.path.includes('/device')) {
                console.error('❌ Auth failed - User account is:', user.status);
            }
            return res.status(403).json({ 
                success: false,
                error: `Account is ${user.status}. Please contact support.` 
            });
        }

        // ✅ CONSISTENT WITH apiKeyAuth.js
        req.user = user;
        req.merchantId = user._id;  // MongoDB ObjectId
        req.merchantName = user.name || user.businessName;
        
        if (req.path && req.path.includes('/device')) {
            console.log('✅ JWT Auth Success for device route:', {
                userId: user._id.toString(),
                email: user.email,
                role: user.role
            });
        }
        
        next();
    } catch (err) {
        console.error('JWT Auth Error:', err.message);
        
        if (req.path && req.path.includes('/device')) {
            console.error('❌ Auth error for device route:', {
                error: err.message,
                name: err.name,
                path: req.path
            });
        }
        
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false,
                error: 'Token has expired. Please login again.' 
            });
        }
        
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid token. Please login again.' 
            });
        }
        
        res.status(500).json({ 
            success: false,
            error: 'Authentication service unavailable' 
        });
    }
};
