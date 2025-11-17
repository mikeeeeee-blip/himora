const User = require('../models/User');

module.exports = async function(req, res, next) {
    try {
        // Get API key from header (case-insensitive)
        const apiKey = req.header('x-api-key') || req.header('X-API-Key') || req.header('X-Api-Key');
        
        if (!apiKey) {
            console.log('❌ API Key Auth Failed: No API key provided');
            return res.status(401).json({ 
                success: false,
                error: 'API key is required. Please provide x-api-key header.' 
            });
        }

        // Trim whitespace from API key
        const trimmedApiKey = apiKey.trim();
        
        console.log('🔍 API Key Auth Check:', {
            providedKey: trimmedApiKey.substring(0, 20) + '...',
            keyLength: trimmedApiKey.length
        });

        // Find user by API key (exact match)
        const user = await User.findOne({ apiKey: trimmedApiKey });
        
        if (!user) {
            console.log('❌ API Key Auth Failed: Invalid API key');
            // Check if any user has an API key (for debugging)
            const userWithApiKey = await User.findOne({ apiKey: { $exists: true, $ne: null } });
            console.log('🔍 Debug: User with API key exists:', !!userWithApiKey);
            
            return res.status(401).json({ 
                success: false,
                error: 'Invalid API key. Please check your credentials and ensure the API key is correct.' 
            });
        }

        // Check if user is active
        if (user.status === 'inactive' || user.status === 'suspended') {
            console.log('❌ API Key Auth Failed: User account is', user.status);
            return res.status(403).json({ 
                success: false,
                error: `Account is ${user.status}. Please contact support.` 
            });
        }

        // Attach user info to request
        req.user = user;
        req.merchantId = user._id;  // MongoDB ObjectId
        req.merchantName = user.name || user.businessName;
        
        console.log('✅ API Key Auth Success:', {
            merchantId: user._id.toString(),
            merchantName: req.merchantName,
            email: user.email
        });
        
        next();
    } catch (error) {
        console.error('❌ API Key Auth Error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Authentication service unavailable',
            detail: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
