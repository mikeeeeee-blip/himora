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

        // Gateway selection logic - Use round-robin/alternating rotation
        const sortedEnabledGateways = [...enabledGateways].sort();
        
        console.log(`🔍 Round-Robin Debug Info:`);
        console.log(`   Enabled gateways: ${sortedEnabledGateways.join(', ')}`);
        console.log(`   Current roundRobinRotation state:`, JSON.stringify(settings.roundRobinRotation));
        
        // Get current active gateway (before rotation) for display
        const currentActiveGateway = settings.getCurrentActiveGateway();
        console.log(`   Current active gateway (before): ${currentActiveGateway}`);
        
        // Get next gateway using round-robin (alternates between enabled gateways)
        // This will update the lastUsedGatewayIndex
        let selectedGateway = settings.getNextGatewayRoundRobin();
        
        if (!selectedGateway) {
            return res.status(503).json({
                success: false,
                error: 'No gateway selected. Round-robin rotation failed.',
                message: 'Failed to select a payment gateway for rotation.'
            });
        }
        
        // Mark as modified and save settings to persist rotation state
        settings.markModified('roundRobinRotation');
        await settings.save();
        
        console.log(`🔄 Round-Robin Selection: Using gateway ${selectedGateway}`);
        console.log(`   Enabled gateways: ${sortedEnabledGateways.join(', ')}`);
        console.log(`   Rotation: Alternating between ${sortedEnabledGateways.length} enabled gateway(s)`);
        console.log(`   Previous gateway: ${currentActiveGateway || 'N/A'} → Selected gateway: ${selectedGateway}`);
        console.log(`   Saved roundRobinRotation state:`, JSON.stringify(settings.roundRobinRotation));

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
                
                // Round-robin rotation information
                // Get the next gateway that will be used (after current one)
                const nextActiveGateway = settings.getCurrentActiveGateway();
                const lastUsedIndex = settings.roundRobinRotation?.lastUsedGatewayIndex ?? -1;
                
                data.gateway_message = `Payment link created using ${gatewayName} gateway (round-robin rotation)`;
                data.rotation_mode = 'round-robin';
                data.current_active_gateway = selectedGateway; // Currently used gateway
                data.next_active_gateway = nextActiveGateway; // Next gateway that will be used
                data.last_used_gateway_index = lastUsedIndex;
                data.enabled_gateways_count = sortedEnabledGateways.length;
                data.enabled_gateways = sortedEnabledGateways;
                
                // Update message to include gateway info
                if (data.message) {
                    data.message = `${data.message} Gateway: ${gatewayName}.`;
                } else {
                    data.message = `Payment link created successfully using ${gatewayName}. Share this URL with customer.`;
                }
                
                // Add helpful note about round-robin rotation
                data.note = `Round-robin rotation: Payment gateways alternate between enabled gateways. Next payment will use a different gateway.`;
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
        
        // Use round-robin rotation
        const activeGateway = settings.getCurrentActiveGateway();
        const lastUsedIndex = settings.roundRobinRotation?.lastUsedGatewayIndex ?? -1;

        res.json({
            success: true,
            enabled_gateways: enabledGateways,
            rotation_mode: 'round-robin',
            round_robin_rotation: {
                enabled: true, // Always enabled
                current_active_gateway: activeGateway,
                last_used_gateway_index: lastUsedIndex,
                enabled_gateways: enabledGateways
            },
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

