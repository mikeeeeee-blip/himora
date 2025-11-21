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

        // Gateway selection logic - Always use transaction-count-based rotation
        const sortedEnabledGateways = [...enabledGateways].sort();
        
        // Get active gateway and increment transaction count
        let selectedGateway = settings.incrementTransactionCount();
        
        // Initialize rotation if not set
        if (settings.timeBasedRotation.transactionCount === undefined || settings.timeBasedRotation.transactionCount === null) {
            settings.timeBasedRotation.transactionCount = 0;
            settings.timeBasedRotation.activeGateway = selectedGateway;
        }
        
        // Save settings to persist rotation state
        await settings.save();
        
        const remainingTransactions = settings.getRemainingTimeForActiveGateway();
        const currentCount = settings.timeBasedRotation.transactionCount || 0;
        const gatewayLimit = settings.timeBasedRotation.gatewayIntervals[selectedGateway] || 10;
        
        console.log(`🔄 Transaction-Count-Based Selection: Using gateway ${selectedGateway}`);
        console.log(`   Transaction count: ${currentCount}/${gatewayLimit}`);
        console.log(`   Remaining transactions: ${remainingTransactions}`);
        console.log(`   Enabled gateways: ${sortedEnabledGateways.join(', ')}`);

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
                
                // Transaction-count-based rotation information (always active)
                const remainingTransactions = settings.getRemainingTimeForActiveGateway();
                const currentCount = settings.timeBasedRotation.transactionCount || 0;
                const gatewayLimit = settings.timeBasedRotation.gatewayIntervals[selectedGateway] || 10;
                
                data.gateway_message = `Payment link created using ${gatewayName} gateway (transaction-count-based rotation)`;
                data.rotation_mode = 'transaction-count-based';
                data.remaining_transactions = remainingTransactions;
                data.current_transaction_count = currentCount;
                data.gateway_transaction_limit = gatewayLimit;
                data.enabled_gateways_count = sortedEnabledGateways.length;
                data.enabled_gateways = sortedEnabledGateways;
                
                // Update message to include gateway info
                if (data.message) {
                    data.message = `${data.message} Gateway: ${gatewayName}.`;
                } else {
                    data.message = `Payment link created successfully using ${gatewayName}. Share this URL with customer.`;
                }
                
                // Add helpful note about transaction-count-based rotation
                data.note = `Transaction-count-based rotation: Payment gateway rotates based on configured transaction limits (${gatewayName}: ${gatewayLimit} transactions).`;
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
        
        // Always use transaction-count-based rotation
        const activeGateway = settings.getActiveGatewayByTime();
        const remainingTransactions = settings.getRemainingTimeForActiveGateway();
        const currentCount = settings.timeBasedRotation?.transactionCount || 0;
        const gatewayLimit = settings.timeBasedRotation?.gatewayIntervals[activeGateway] || 10;

        res.json({
            success: true,
            enabled_gateways: enabledGateways,
            rotation_mode: 'transaction-count-based',
            time_based_rotation: {
                enabled: true, // Always enabled
                active_gateway: activeGateway,
                remaining_transactions: remainingTransactions,
                current_transaction_count: currentCount,
                gateway_transaction_limit: gatewayLimit,
                gateway_intervals: settings.timeBasedRotation?.gatewayIntervals || {
                    paytm: 10,
                    easebuzz: 5,
                    razorpay: 10,
                    phonepe: 10,
                    sabpaisa: 10,
                    cashfree: 10
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

