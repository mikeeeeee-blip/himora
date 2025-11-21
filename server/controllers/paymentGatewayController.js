const Settings = require('../models/Settings');
const { createRazorpayPaymentLink } = require('./razorpayController');
const { createPaytmPaymentLink } = require('./paytmController');
const { createEasebuzzPaymentLink } = require('./easebuzzController');
const { createPhonePeDeepLink } = require('./razorpayController');
const { createSabpaisaPaymentLink } = require('./sabpaisaController');

/**
 * Unified payment link creation endpoint
 * Automatically uses the enabled/default payment gateway from settings
 * 
 * This endpoint automatically selects the payment gateway configured by the administrator.
 * You don't need to specify which gateway to use - it's handled automatically.
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
                error: 'No payment gateway is enabled. Please contact administrator.',
                message: 'The administrator needs to enable at least one payment gateway in the system settings.'
            });
        }

        // Gateway selection logic
        let selectedGateway;
        
        // Sort enabled gateways for consistent rotation order
        const sortedEnabledGateways = [...enabledGateways].sort();
        
        // If multiple gateways are enabled, use rotation logic
        if (sortedEnabledGateways.length > 1) {
            // Check if rotation is enabled (when multiple gateways are enabled)
            // Use round-robin rotation based on a counter stored in settings
            if (settings.rotationCounter === undefined || settings.rotationCounter === null) {
                settings.rotationCounter = 0;
            }
            
            // Get the gateway at the current rotation index
            const rotationIndex = settings.rotationCounter % sortedEnabledGateways.length;
            selectedGateway = sortedEnabledGateways[rotationIndex];
            
            // Increment rotation counter for next request
            settings.rotationCounter = (settings.rotationCounter + 1) % sortedEnabledGateways.length;
            await settings.save();
            
            console.log(`🔄 Rotation Mode: Using gateway ${rotationIndex + 1} of ${sortedEnabledGateways.length}`);
            console.log(`   Rotation index: ${rotationIndex}, Selected: ${selectedGateway}, Next: ${settings.rotationCounter}`);
            console.log(`   Enabled gateways (sorted): ${sortedEnabledGateways.join(', ')}`);
        } else {
            // Single gateway or default gateway
            selectedGateway = defaultGateway || sortedEnabledGateways[0];
        }

        console.log(`🔀 Routing payment link creation to ${selectedGateway} gateway`);
        console.log(`   Enabled gateways: ${sortedEnabledGateways.join(', ')}`);
        console.log(`   Default gateway: ${defaultGateway}`);
        console.log(`   Selected gateway: ${selectedGateway}`);
        if (sortedEnabledGateways.length > 1) {
            console.log(`   🔄 Rotation mode active (${sortedEnabledGateways.length} gateways enabled)`);
        }

        // Store original json method to intercept response
        const originalJson = res.json.bind(res);
        res.json = function(data) {
            // Add gateway information and helpful message to response
            if (data && data.success !== false) {
                const gatewayName = selectedGateway.charAt(0).toUpperCase() + selectedGateway.slice(1);
                data.gateway_used = selectedGateway;
                data.gateway_name = gatewayName;
                
                // Different messages based on rotation mode
                if (sortedEnabledGateways.length > 1) {
                    data.gateway_message = `Payment link created using ${gatewayName} gateway (rotation mode: ${sortedEnabledGateways.length} gateways active)`;
                    data.rotation_mode = true;
                    data.enabled_gateways_count = sortedEnabledGateways.length;
                    data.enabled_gateways = sortedEnabledGateways;
                } else {
                    data.gateway_message = `Payment link created using ${gatewayName} gateway (automatically selected by system administrator)`;
                    data.rotation_mode = false;
                }
                
                // Update message to include gateway info
                if (data.message) {
                    data.message = `${data.message} Gateway: ${gatewayName}.`;
                } else {
                    data.message = `Payment link created successfully using ${gatewayName}. Share this URL with customer.`;
                }
                
                // Add helpful note about automatic gateway selection
                if (sortedEnabledGateways.length > 1) {
                    data.note = `Rotation mode active: Payment requests are distributed across ${sortedEnabledGateways.length} enabled gateways (${sortedEnabledGateways.join(', ')}).`;
                } else {
                    data.note = 'The payment gateway is automatically selected by the system administrator. You don\'t need to specify which gateway to use.';
                }
            }
            return originalJson(data);
        };

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
            
            case 'sabpaisa':
                return await createSabpaisaPaymentLink(req, res);
            
            default:
                return res.status(503).json({
                    success: false,
                    error: `Payment gateway '${selectedGateway}' is not supported or not properly configured.`,
                    message: 'Please contact administrator to configure a valid payment gateway.'
                });
        }

    } catch (error) {
        console.error('❌ Unified Payment Link Creation Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create payment link',
            detail: error.message,
            message: 'An error occurred while creating the payment link. Please try again or contact support.'
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
                sabpaisa: {
                    name: 'SabPaisa',
                    enabled: settings.paymentGateways.sabpaisa?.enabled || false,
                    isDefault: settings.paymentGateways.sabpaisa?.isDefault || false
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

