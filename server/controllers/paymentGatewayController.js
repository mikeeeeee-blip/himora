const Settings = require('../models/Settings');
const { createRazorpayPaymentLink } = require('./razorpayController');
const { createPaytmPaymentLink } = require('./paytmController');
const { createEasebuzzPaymentLink } = require('./easebuzzController');
const { createPhonePeDeepLink } = require('./razorpayController');
const { createSabpaisaPaymentLink } = require('./sabpaisaController');
const { createCashfreePaymentLink } = require('./cashfreeController');
const { createPayuPaymentLink } = require('./payuController');
const { createZaakpayPaymentLink } = require('./zaakpayController');

/**
 * Unified payment link creation endpoint
 * Automatically uses the enabled/default payment gateway from settings
 * 
 * This endpoint automatically selects the payment gateway configured by the administrator.
 * You don't need to specify which gateway to use - it's handled automatically.
 */
exports.createPaymentLink = async (req, res) => {
    try {
        console.log('\n' + '='.repeat(80));
        console.log('🔗 PAYMENT LINK CREATION REQUEST');
        console.log('='.repeat(80));
        console.log(`   Timestamp: ${new Date().toISOString()}`);
        console.log(`   Request Method: ${req.method}`);
        console.log(`   Request URL: ${req.originalUrl}`);
        console.log(`   Merchant ID: ${req.merchantId || 'N/A'}`);
        console.log(`   Merchant Name: ${req.merchantName || 'N/A'}`);
        
        // Get payment gateway settings
        const settings = await Settings.getSettings();
        const enabledGateways = settings.getEnabledGateways();

        console.log('\n📋 Payment Gateway Configuration:');
        console.log(`   All enabled gateways (from settings): [${enabledGateways.join(', ') || 'none'}]`);
        
        // List of implemented/available gateways
        const implementedGateways = ['razorpay', 'paytm', 'phonepe', 'easebuzz', 'sabpaisa', 'cashfree', 'payu', 'zaakpay'];
        console.log(`   Implemented gateways: [${implementedGateways.join(', ')}]`);
        
        // Filter out unimplemented gateways from enabled list
        const availableGateways = enabledGateways.filter(gateway => implementedGateways.includes(gateway));
        const unimplementedInEnabled = enabledGateways.filter(gateway => !implementedGateways.includes(gateway));
        
        console.log(`   Available gateways (implemented & enabled): [${availableGateways.join(', ') || 'none'}]`);
        if (unimplementedInEnabled.length > 0) {
            console.warn(`   ⚠️  WARNING: Unimplemented gateway(s) enabled: [${unimplementedInEnabled.join(', ')}]`);
            console.warn(`   ⚠️  These will be filtered out and cannot be used for payment links.`);
        }

        // Check if any gateway is enabled and implemented
        if (availableGateways.length === 0) {
            console.error('\n❌ PAYMENT LINK CREATION FAILED:');
            console.error(`   Reason: No implemented payment gateway is enabled`);
            console.error(`   Enabled gateways: [${enabledGateways.join(', ') || 'none'}]`);
            console.error(`   Unimplemented gateways in enabled list: [${unimplementedInEnabled.join(', ') || 'none'}]`);
            console.error(`   Solution: Enable at least one of: ${implementedGateways.join(', ')}`);
            console.error('='.repeat(80) + '\n');
            
            if (unimplementedInEnabled.length > 0) {
                return res.status(503).json({
                    success: false,
                    error: `The enabled gateway(s) [${unimplementedInEnabled.join(', ')}] are not yet implemented.`,
                    message: `Please enable one of the implemented gateways: ${implementedGateways.map(g => g.charAt(0).toUpperCase() + g.slice(1)).join(', ')}.`,
                    details: {
                        enabled_gateways: enabledGateways,
                        unimplemented_gateways: unimplementedInEnabled,
                        implemented_gateways: implementedGateways,
                        solution: `Go to Super Admin → Payment Gateway Settings → Disable ${unimplementedInEnabled.join(', ')} → Enable one of: ${implementedGateways.join(', ')}`
                    }
                });
            }
            return res.status(503).json({
                success: false,
                error: 'No payment gateway is enabled. Please contact administrator.',
                message: `The administrator needs to enable at least one payment gateway in the system settings. Available gateways: ${implementedGateways.map(g => g.charAt(0).toUpperCase() + g.slice(1)).join(', ')}.`,
                details: {
                    enabled_gateways: enabledGateways,
                    available_gateways: implementedGateways
                }
            });
        }

        // Gateway selection logic - Use round-robin/alternating rotation or first gateway if disabled
        // Use availableGateways (filtered to only include implemented gateways) instead of all enabledGateways
        const sortedEnabledGateways = [...availableGateways].sort();
        const isRoundRobinEnabled = settings.roundRobinRotation?.enabled !== false;
        
        console.log('\n🔍 Gateway Selection Process:');
        console.log(`   Available gateways (sorted): [${sortedEnabledGateways.join(', ')}]`);
        console.log(`   Round-robin rotation: ${isRoundRobinEnabled ? 'ENABLED' : 'DISABLED'}`);
        if (settings.roundRobinRotation) {
            console.log(`   Round-robin state:`, JSON.stringify({
                enabled: settings.roundRobinRotation.enabled,
                lastUsedGatewayIndex: settings.roundRobinRotation.lastUsedGatewayIndex,
                customCounts: settings.roundRobinRotation.customCounts ? 
                    Object.fromEntries(settings.roundRobinRotation.customCounts) : null,
                currentRotationState: settings.roundRobinRotation.currentRotationState
            }, null, 2));
        }
        
        // Get current active gateway (before rotation) for display
        const currentActiveGateway = settings.getCurrentActiveGateway();
        console.log(`   Current active gateway (before selection): ${currentActiveGateway || 'N/A'}`);
        
        let selectedGateway;
        let rotationMode;
        
        if (isRoundRobinEnabled) {
            // Get next gateway using round-robin (alternates between enabled gateways or custom rotation)
            // This will update the lastUsedGatewayIndex or currentRotationState
            console.log(`   Using round-robin logic to select next gateway...`);
            selectedGateway = settings.getNextGatewayRoundRobin();
            rotationMode = settings.roundRobinRotation?.customCounts?.size > 0 ? 'custom-rotation' : 'round-robin';
            
            console.log(`   Gateway selected by round-robin: ${selectedGateway || 'NONE'}`);
            
            // Ensure selected gateway is implemented (filter out unimplemented like cashfree)
            if (selectedGateway && !implementedGateways.includes(selectedGateway)) {
                console.warn(`   ⚠️  WARNING: Selected gateway '${selectedGateway}' is not implemented!`);
                console.warn(`   ⚠️  Falling back to first available gateway: ${sortedEnabledGateways[0]}`);
                selectedGateway = sortedEnabledGateways[0];
                rotationMode = 'fallback';
            }
        } else {
            // Round-robin disabled - use first enabled gateway
            selectedGateway = sortedEnabledGateways[0];
            rotationMode = 'disabled';
            console.log(`   Round-robin disabled → Using first available gateway: ${selectedGateway}`);
        }
        
        if (!selectedGateway) {
            console.error('\n❌ GATEWAY SELECTION FAILED:');
            console.error(`   No gateway could be selected from available gateways: [${sortedEnabledGateways.join(', ')}]`);
            console.error('='.repeat(80) + '\n');
            
            return res.status(503).json({
                success: false,
                error: 'No gateway selected. Gateway selection failed.',
                message: 'Failed to select a payment gateway. Please check gateway configuration.',
                details: {
                    available_gateways: sortedEnabledGateways,
                    round_robin_enabled: isRoundRobinEnabled
                }
            });
        }
        
        console.log(`\n✅ Gateway Selected: ${selectedGateway.toUpperCase()} (Mode: ${rotationMode})`);
        
        // Mark as modified and save settings to persist rotation state (only if round-robin is enabled)
        if (isRoundRobinEnabled) {
            try {
            settings.markModified('roundRobinRotation');
            await settings.save();
                console.log(`   ✅ Round-robin state saved successfully`);
            } catch (saveError) {
                console.error(`   ⚠️  WARNING: Failed to save round-robin state:`, saveError.message);
                // Continue anyway - rotation state save failure shouldn't block payment link creation
            }
        }
        
        console.log(`\n🔄 Gateway Selection Summary:`);
        console.log(`   Selected Gateway: ${selectedGateway.toUpperCase()}`);
        console.log(`   Selection Mode: ${rotationMode}`);
        console.log(`   Available Gateways: [${sortedEnabledGateways.join(', ')}]`);
        if (isRoundRobinEnabled) {
            console.log(`   Rotation Type: ${rotationMode === 'custom-rotation' ? 'Custom counts' : 'Alternating'} between ${sortedEnabledGateways.length} gateway(s)`);
            console.log(`   Rotation Flow: ${currentActiveGateway || 'N/A'} → ${selectedGateway}`);
        }

        console.log(`\n🔀 Routing to Gateway Controller:`);
        console.log(`   Gateway: ${selectedGateway}`);
        console.log(`   Controller function: create${selectedGateway.charAt(0).toUpperCase() + selectedGateway.slice(1)}PaymentLink`);

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
            
            case 'cashfree':
                return await createCashfreePaymentLink(req, res);
            
            case 'payu':
                return await createPayuPaymentLink(req, res);

            case 'zaakpay':
                return await createZaakpayPaymentLink(req, res);
            
            default:
                return res.status(503).json({
                    success: false,
                    error: `Payment gateway '${selectedGateway}' is not supported or not properly configured.`,
                    message: 'Please contact administrator to configure a valid payment gateway.'
                });
        }

    } catch (error) {
        console.error('\n' + '='.repeat(80));
        console.error('❌ PAYMENT LINK CREATION ERROR');
        console.error('='.repeat(80));
        console.error(`   Error Type: ${error.constructor.name}`);
        console.error(`   Error Message: ${error.message}`);
        console.error(`   Stack Trace:`, error.stack);
        console.error(`   Timestamp: ${new Date().toISOString()}`);
        console.error('='.repeat(80) + '\n');
        
        res.status(500).json({
            success: false,
            error: 'Failed to create payment link',
            detail: error.message,
            message: 'An error occurred while creating the payment link. Please try again or contact support.',
            timestamp: new Date().toISOString()
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
                },
                payu: {
                    name: 'PayU',
                    enabled: settings.paymentGateways.payu?.enabled || false
                },
                zaakpay: {
                    name: 'Zaakpay',
                    enabled: settings.paymentGateways.zaakpay?.enabled || false
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

