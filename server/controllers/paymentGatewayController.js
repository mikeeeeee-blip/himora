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
        const enabledGateways = settings.getEnabledGateways();

        // Check if any gateway is enabled
        if (enabledGateways.length === 0) {
            return res.status(503).json({
                success: false,
                error: 'No payment gateway is enabled. Please contact administrator.',
                message: 'The administrator needs to enable at least one payment gateway in the system settings.'
            });
        }

        // Gateway selection logic - Always use round-robin rotation
        let selectedGateway;
        
        // Sort enabled gateways for consistent rotation order
        const sortedEnabledGateways = [...enabledGateways].sort();
        
        // Always use round-robin rotation (even for single gateway, though it won't rotate)
        // Initialize rotation counter if not set
        if (settings.rotationCounter === undefined || settings.rotationCounter === null) {
            settings.rotationCounter = 0;
        }
        
        // Get the gateway at the current rotation index
        const rotationIndex = settings.rotationCounter % sortedEnabledGateways.length;
        selectedGateway = sortedEnabledGateways[rotationIndex];
        
        // Increment rotation counter for next request
        settings.rotationCounter = (settings.rotationCounter + 1) % sortedEnabledGateways.length;
        await settings.save();
        
        console.log(`🔄 Round-Robin Selection: Using gateway ${rotationIndex + 1} of ${sortedEnabledGateways.length}`);
        console.log(`   Rotation index: ${rotationIndex}, Selected: ${selectedGateway}, Next: ${settings.rotationCounter}`);
        console.log(`   Enabled gateways (sorted): ${sortedEnabledGateways.join(', ')}`);
        if (sortedEnabledGateways.length > 1) {
            console.log(`   🔄 Round-robin mode active (${sortedEnabledGateways.length} gateways enabled)`);
        } else {
            console.log(`   ℹ️ Single gateway enabled (round-robin will always select this gateway)`);
        }

        console.log(`🔀 Routing payment link creation to ${selectedGateway} gateway`);
        console.log(`   Enabled gateways: ${sortedEnabledGateways.join(', ')}`);
        console.log(`   Selected gateway: ${selectedGateway}`);

        // Store original json method to intercept response
        const originalJson = res.json.bind(res);
        res.json = function(data) {
            // Add gateway information and helpful message to response
            if (data && data.success !== false) {
                const gatewayName = selectedGateway.charAt(0).toUpperCase() + selectedGateway.slice(1);
                data.gateway_used = selectedGateway;
                data.gateway_name = gatewayName;
                
                // Round-robin mode information
                data.gateway_message = sortedEnabledGateways.length > 1
                    ? `Payment link created using ${gatewayName} gateway (round-robin: ${sortedEnabledGateways.length} gateways active)`
                    : `Payment link created using ${gatewayName} gateway (round-robin mode)`;
                data.rotation_mode = true; // Always true now (round-robin is always active)
                data.enabled_gateways_count = sortedEnabledGateways.length;
                data.enabled_gateways = sortedEnabledGateways;
                
                // Update message to include gateway info
                if (data.message) {
                    data.message = `${data.message} Gateway: ${gatewayName}.`;
                } else {
                    data.message = `Payment link created successfully using ${gatewayName}. Share this URL with customer.`;
                }
                
                // Add helpful note about round-robin selection
                if (sortedEnabledGateways.length > 1) {
                    data.note = `Round-robin mode: Payment requests are automatically distributed across ${sortedEnabledGateways.length} enabled gateways (${sortedEnabledGateways.join(', ')}).`;
                } else {
                    data.note = 'Round-robin mode: Payment gateway is automatically selected. You don\'t need to specify which gateway to use.';
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
        const enabledGateways = settings.getEnabledGateways();

        res.json({
            success: true,
            enabled_gateways: enabledGateways,
            rotation_mode: true, // Round-robin is always active
            all_gateways: {
                razorpay: {
                    name: 'Razorpay',
                    enabled: settings.paymentGateways.razorpay.enabled
                },
                paytm: {
                    name: 'Paytm',
                    enabled: settings.paymentGateways.paytm.enabled
                },
                phonepe: {
                    name: 'PhonePe',
                    enabled: settings.paymentGateways.phonepe.enabled
                },
                easebuzz: {
                    name: 'Easebuzz',
                    enabled: settings.paymentGateways.easebuzz.enabled
                },
                sabpaisa: {
                    name: 'SabPaisa',
                    enabled: settings.paymentGateways.sabpaisa?.enabled || false
                },
                cashfree: {
                    name: 'Cashfree',
                    enabled: settings.paymentGateways.cashfree.enabled
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

