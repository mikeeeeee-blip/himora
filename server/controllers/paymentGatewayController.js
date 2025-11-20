const Settings = require('../models/Settings');
const { createRazorpayPaymentLink } = require('./razorpayController');
const { createPaytmPaymentLink } = require('./paytmController');
const { createEasebuzzPaymentLink } = require('./easebuzzController');
const { createPhonePeDeepLink } = require('./razorpayController');

/**
 * Unified payment link creation endpoint
 * Automatically uses the enabled/default payment gateway from settings
 */
exports.createPaymentLink = async (req, res) => {
    try {
        // Get payment gateway settings
        const settings = await Settings.getSettings();
        const defaultGateway = settings.getDefaultGateway();
        const enabledGateways = settings.getEnabledGateways();

        // Check if any gateway is enabled
        if (enabledGateways.length === 0) {
            return res.status(503).json({
                success: false,
                error: 'No payment gateway is enabled. Please contact administrator.'
            });
        }

        // Use default gateway or first enabled gateway
        const selectedGateway = defaultGateway || enabledGateways[0];

        console.log(`🔀 Routing payment link creation to ${selectedGateway} gateway`);
        console.log(`   Enabled gateways: ${enabledGateways.join(', ')}`);
        console.log(`   Default gateway: ${defaultGateway}`);

        // Route to appropriate gateway controller
        switch (selectedGateway) {
            case 'razorpay':
                return await createRazorpayPaymentLink(req, res);
            
            case 'paytm':
                return await createPaytmPaymentLink(req, res);
            
            case 'easebuzz':
                return await createEasebuzzPaymentLink(req, res);
            
            case 'phonepe':
                return await createPhonePeDeepLink(req, res);
            
            default:
                return res.status(503).json({
                    success: false,
                    error: `Payment gateway '${selectedGateway}' is not supported or not properly configured.`
                });
        }

    } catch (error) {
        console.error('❌ Unified Payment Link Creation Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create payment link',
            detail: error.message
        });
    }
};

/**
 * Get available payment gateways (for frontend display)
 */
exports.getAvailableGateways = async (req, res) => {
    try {
        const settings = await Settings.getSettings();
        const defaultGateway = settings.getDefaultGateway();
        const enabledGateways = settings.getEnabledGateways();

        res.json({
            success: true,
            default_gateway: defaultGateway,
            enabled_gateways: enabledGateways,
            all_gateways: {
                razorpay: {
                    name: 'Razorpay',
                    enabled: settings.paymentGateways.razorpay.enabled,
                    isDefault: settings.paymentGateways.razorpay.isDefault
                },
                paytm: {
                    name: 'Paytm',
                    enabled: settings.paymentGateways.paytm.enabled,
                    isDefault: settings.paymentGateways.paytm.isDefault
                },
                phonepe: {
                    name: 'PhonePe',
                    enabled: settings.paymentGateways.phonepe.enabled,
                    isDefault: settings.paymentGateways.phonepe.isDefault
                },
                easebuzz: {
                    name: 'Easebuzz',
                    enabled: settings.paymentGateways.easebuzz.enabled,
                    isDefault: settings.paymentGateways.easebuzz.isDefault
                },
                cashfree: {
                    name: 'Cashfree',
                    enabled: settings.paymentGateways.cashfree.enabled,
                    isDefault: settings.paymentGateways.cashfree.isDefault
                }
            }
        });

    } catch (error) {
        console.error('❌ Get Available Gateways Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch available gateways',
            detail: error.message
        });
    }
};

