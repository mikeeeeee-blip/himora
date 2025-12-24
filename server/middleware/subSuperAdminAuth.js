// middleware/subSuperAdminAuth.js

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to authenticate sub-superadmin or superadmin
module.exports = async function(req, res, next) {
    try {
        // Get token from header
        const token = req.header('x-auth-token');
        
        if (!token) {
            return res.status(401).json({ 
                success: false,
                error: 'No token provided. Authorization denied.' 
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from token
        const user = await User.findById(decoded.user.id).select('-password');
        
        if (!user) {
            return res.status(401).json({ 
                success: false,
                error: 'User not found. Invalid token.' 
            });
        }

        // Check if user is subSuperAdmin or superAdmin
        if (user.role !== 'subSuperAdmin' && user.role !== 'superAdmin') {
            return res.status(403).json({ 
                success: false,
                error: 'Access denied. Sub-SuperAdmin or SuperAdmin privileges required.' 
            });
        }

        // Attach user to request
        req.user = user;
        req.isSubSuperAdmin = user.role === 'subSuperAdmin';
        req.isSuperAdmin = user.role === 'superAdmin';
        
        console.log(`✅ ${user.role} authenticated: ${user.name} (${user.email})`);
        
        next();
    } catch (error) {
        console.error('Sub-SuperAdmin Auth Error:', error.message);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid token.' 
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false,
                error: 'Token expired. Please login again.' 
            });
        }
        
        res.status(500).json({ 
            success: false,
            error: 'Authentication service unavailable.' 
        });
    }
};

// Middleware to check specific access control
module.exports.checkAccess = (permission) => {
    return async (req, res, next) => {
        try {
            // SuperAdmin has all permissions
            if (req.isSuperAdmin) {
                return next();
            }

            // Check if subSuperAdmin has the required permission
            if (req.isSubSuperAdmin && req.user.accessControls && req.user.accessControls[permission]) {
                return next();
            }

            return res.status(403).json({
                success: false,
                error: `Access denied. You do not have permission to ${permission}.`
            });
        } catch (error) {
            console.error('Access Check Error:', error.message);
            res.status(500).json({
                success: false,
                error: 'Access check failed.'
            });
        }
    };
};

