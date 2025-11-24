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

        // Gateway selection logic - Use round-robin/alternating rotation or first gateway if disabled
        const sortedEnabledGateways = [...enabledGateways].sort();
        const isRoundRobinEnabled = settings.roundRobinRotation?.enabled !== false;
        
        console.log(`🔍 Gateway Selection Debug Info:`);
        console.log(`   Enabled gateways: ${sortedEnabledGateways.join(', ')}`);
        console.log(`   Round-robin enabled: ${isRoundRobinEnabled}`);
        console.log(`   Current roundRobinRotation state:`, JSON.stringify(settings.roundRobinRotation));
        
        // Get current active gateway (before rotation) for display
        const currentActiveGateway = settings.getCurrentActiveGateway();
        console.log(`   Current active gateway (before): ${currentActiveGateway}`);
        
        let selectedGateway;
        let rotationMode;
        
        if (isRoundRobinEnabled) {
            // Get next gateway using round-robin (alternates between enabled gateways or custom rotation)
            // This will update the lastUsedGatewayIndex or currentRotationState
            selectedGateway = settings.getNextGatewayRoundRobin();
            rotationMode = settings.roundRobinRotation?.customCounts?.size > 0 ? 'custom-rotation' : 'round-robin';
        } else {
            // Round-robin disabled - use first enabled gateway
            selectedGateway = sortedEnabledGateways[0];
            rotationMode = 'disabled';
            console.log(`⚠️ Round-robin disabled - using first enabled gateway: ${selectedGateway}`);
        }
        
        if (!selectedGateway) {
            return res.status(503).json({
                success: false,
                error: 'No gateway selected. Gateway selection failed.',
                message: 'Failed to select a payment gateway.'
            });
        }
        
        // Mark as modified and save settings to persist rotation state (only if round-robin is enabled)
        if (isRoundRobinEnabled) {
            settings.markModified('roundRobinRotation');
            await settings.save();
        }
        
        console.log(`🔄 Gateway Selection: Using gateway ${selectedGateway} (Mode: ${rotationMode})`);
        console.log(`   Enabled gateways: ${sortedEnabledGateways.join(', ')}`);
        if (isRoundRobinEnabled) {
            console.log(`   Rotation: ${rotationMode === 'custom-rotation' ? 'Custom counts' : 'Alternating'} between ${sortedEnabledGateways.length} enabled gateway(s)`);
            console.log(`   Previous gateway: ${currentActiveGateway || 'N/A'} → Selected gateway: ${selectedGateway}`);
            console.log(`   Saved roundRobinRotation state:`, JSON.stringify(settings.roundRobinRotation));
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
                
                // Rotation information
                const isRoundRobinEnabled = settings.roundRobinRotation?.enabled !== false;
                const nextActiveGateway = settings.getCurrentActiveGateway();
                const lastUsedIndex = settings.roundRobinRotation?.lastUsedGatewayIndex ?? -1;
                const currentRotationMode = isRoundRobinEnabled 
                    ? (settings.roundRobinRotation?.customCounts?.size > 0 ? 'custom-rotation' : 'round-robin')
                    : 'disabled';
                
                data.gateway_message = `Payment link created using ${gatewayName} gateway${isRoundRobinEnabled ? ` (${currentRotationMode})` : ' (rotation disabled)'}`;
                data.rotation_mode = currentRotationMode;
                data.rotation_enabled = isRoundRobinEnabled;
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
                
                // Add helpful note about rotation
                if (isRoundRobinEnabled) {
                    if (currentRotationMode === 'custom-rotation') {
                        data.note = `Custom rotation: Gateways are used according to configured counts.`;
                    } else {
                        data.note = `Round-robin rotation: Payment gateways alternate between enabled gateways. Next payment will use a different gateway.`;
                    }
                } else {
                    data.note = `Rotation disabled: All payments will use the first enabled gateway.`;
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
        
        // Get rotation status
        const activeGateway = settings.getCurrentActiveGateway();
        const lastUsedIndex = settings.roundRobinRotation?.lastUsedGatewayIndex ?? -1;
        const isRoundRobinEnabled = settings.roundRobinRotation?.enabled !== false;
        const rotationMode = isRoundRobinEnabled 
            ? (settings.roundRobinRotation?.customCounts?.size > 0 ? 'custom-rotation' : 'round-robin')
            : 'disabled';
        
        // Convert Map to object for JSON response
        const customCountsObj = {};
        if (settings.roundRobinRotation?.customCounts) {
            settings.roundRobinRotation.customCounts.forEach((value, key) => {
                customCountsObj[key] = value;
            });
        }

        res.json({
            success: true,
            enabled_gateways: enabledGateways,
            rotation_mode: rotationMode,
            round_robin_rotation: {
                enabled: isRoundRobinEnabled,
                current_active_gateway: activeGateway,
                last_used_gateway_index: lastUsedIndex,
                enabled_gateways: enabledGateways,
                custom_counts: customCountsObj,
                current_rotation_state: settings.roundRobinRotation?.currentRotationState || {
                    currentGateway: null,
                    countUsed: 0,
                    rotationCycle: 0
                }
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

