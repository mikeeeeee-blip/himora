#!/usr/bin/env node

/**
 * Automated Testing Script for Paytm Payment Link Creation
 * 
 * Usage:
 *   node scripts/testPaytmPaymentLink.js
 *   node scripts/testPaytmPaymentLink.js --amount 100
 *   node scripts/testPaytmPaymentLink.js --all
 */

const axios = require('axios');
const crypto = require('crypto');

// Configuration
const API_KEY = 'ninexgroup_b1c2d179e24ccf6b2fb2691a57e87645ed96c991d2031508';
const BASE_URL = process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5000';
const API_ENDPOINT = `${BASE_URL}/api/paytm/create-payment-link`;

// Test data
const testCases = [
    {
        name: 'Valid Payment Link - ₹100',
        data: {
            amount: '100',
            customer_name: 'Test Customer',
            customer_email: 'test@example.com',
            customer_phone: '9876543210',
            description: 'Test payment for automated testing'
        },
        expectedStatus: 200
    },
    {
        name: 'Valid Payment Link - ₹500',
        data: {
            amount: '500',
            customer_name: 'John Doe',
            customer_email: 'john@example.com',
            customer_phone: '9876543211',
            description: 'Test payment ₹500'
        },
        expectedStatus: 200
    },
    {
        name: 'Valid Payment Link - ₹1 (Minimum)',
        data: {
            amount: '1',
            customer_name: 'Min Amount Test',
            customer_email: 'min@example.com',
            customer_phone: '9876543212',
            description: 'Minimum amount test'
        },
        expectedStatus: 200
    },
    {
        name: 'Invalid Amount - Below Minimum',
        data: {
            amount: '0.50',
            customer_name: 'Test Customer',
            customer_email: 'test@example.com',
            customer_phone: '9876543210',
            description: 'Invalid amount test'
        },
        expectedStatus: 400
    },
    {
        name: 'Missing Required Field - No Email',
        data: {
            amount: '100',
            customer_name: 'Test Customer',
            customer_phone: '9876543210',
            description: 'Missing email test'
        },
        expectedStatus: 400
    },
    {
        name: 'Invalid Phone Number - Too Short',
        data: {
            amount: '100',
            customer_name: 'Test Customer',
            customer_email: 'test@example.com',
            customer_phone: '12345',
            description: 'Invalid phone test'
        },
        expectedStatus: 400
    },
    {
        name: 'Invalid Email Format',
        data: {
            amount: '100',
            customer_name: 'Test Customer',
            customer_email: 'invalid-email',
            customer_phone: '9876543210',
            description: 'Invalid email test'
        },
        expectedStatus: 400
    }
];

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
    console.log('\n' + '='.repeat(80));
    log(title, 'bright');
    console.log('='.repeat(80));
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'cyan');
}

/**
 * Test Paytm Payment Link Creation
 */
async function testPaymentLinkCreation(testCase) {
    try {
        logSection(`Test: ${testCase.name}`);
        logInfo(`Endpoint: ${API_ENDPOINT}`);
        logInfo(`Request Data: ${JSON.stringify(testCase.data, null, 2)}`);

        const startTime = Date.now();
        const response = await axios.post(API_ENDPOINT, testCase.data, {
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            },
            validateStatus: () => true // Don't throw on any status code
        });
        const duration = Date.now() - startTime;

        logInfo(`Response Time: ${duration}ms`);
        logInfo(`Status Code: ${response.status}`);

        // Check if status matches expected
        if (response.status === testCase.expectedStatus) {
            logSuccess(`Status code matches expected: ${testCase.expectedStatus}`);
        } else {
            logError(`Status code mismatch! Expected: ${testCase.expectedStatus}, Got: ${response.status}`);
        }

        // Log response
        console.log('\n📦 Response:');
        console.log(JSON.stringify(response.data, null, 2));

        // If successful, analyze the response
        if (response.status === 200 && response.data.success) {
            logSuccess('Payment link created successfully!');
            
            const data = response.data;
            console.log('\n📋 Payment Link Details:');
            console.log(`   Transaction ID: ${data.transaction_id}`);
            console.log(`   Payment Link ID: ${data.payment_link_id || data.order_id}`);
            console.log(`   Amount: ₹${data.order_amount}`);
            console.log(`   Payment URL: ${data.payment_url}`);
            
            if (data.paytm_params) {
                console.log('\n🔐 Paytm Parameters:');
                const params = { ...data.paytm_params };
                if (params.CHECKSUMHASH) {
                    console.log(`   CHECKSUMHASH: ${params.CHECKSUMHASH.substring(0, 20)}...`);
                }
                console.log(`   MID: ${params.MID || 'N/A'}`);
                console.log(`   ORDER_ID: ${params.ORDER_ID || 'N/A'}`);
                console.log(`   TXN_AMOUNT: ${params.TXN_AMOUNT || 'N/A'}`);
                console.log(`   WEBSITE: ${params.WEBSITE || 'N/A'}`);
                console.log(`   INDUSTRY_TYPE_ID: ${params.INDUSTRY_TYPE_ID || 'N/A'}`);
                console.log(`   CHANNEL_ID: ${params.CHANNEL_ID || 'N/A'}`);
            }

            // Verify checksum if params are available
            if (data.paytm_params && data.paytm_params.CHECKSUMHASH) {
                verifyChecksum(data.paytm_params);
            }
        } else {
            logError('Payment link creation failed');
            if (response.data.error) {
                logError(`Error: ${response.data.error}`);
            }
        }

        return {
            testCase: testCase.name,
            success: response.status === testCase.expectedStatus,
            status: response.status,
            expectedStatus: testCase.expectedStatus,
            duration
        };

    } catch (error) {
        logError(`Test failed with exception: ${error.message}`);
        if (error.response) {
            logError(`Response Status: ${error.response.status}`);
            logError(`Response Data: ${JSON.stringify(error.response.data, null, 2)}`);
        }
        return {
            testCase: testCase.name,
            success: false,
            error: error.message,
            duration: 0
        };
    }
}

/**
 * Verify Paytm Checksum
 */
function verifyChecksum(paytmParams) {
    try {
        const merchantKey = process.env.PAYTM_MERCHANT_KEY;
        if (!merchantKey) {
            logWarning('PAYTM_MERCHANT_KEY not found in environment. Cannot verify checksum.');
            return;
        }

        logInfo('\n🔍 Verifying Checksum...');
        
        // Remove CHECKSUMHASH for verification
        const filteredParams = { ...paytmParams };
        const receivedChecksum = filteredParams.CHECKSUMHASH;
        delete filteredParams.CHECKSUMHASH;

        // Filter and sort
        const sortedKeys = Object.keys(filteredParams)
            .filter(key => {
                const value = filteredParams[key];
                return value !== null && value !== undefined && value !== '';
            })
            .sort();

        // Create checksum string
        const dataString = sortedKeys
            .map(key => {
                const value = String(filteredParams[key]);
                return `${key}=${value}`;
            })
            .join('&');

        const finalString = `${dataString}&key=${merchantKey}`;
        
        // Generate checksum
        const calculatedChecksum = crypto
            .createHash('sha256')
            .update(finalString, 'utf8')
            .digest('hex')
            .toUpperCase();

        console.log(`   Received Checksum: ${receivedChecksum.substring(0, 20)}...`);
        console.log(`   Calculated Checksum: ${calculatedChecksum.substring(0, 20)}...`);
        console.log(`   Checksum String (first 100 chars): ${finalString.substring(0, 100).replace(merchantKey, '***HIDDEN***')}...`);

        if (receivedChecksum === calculatedChecksum) {
            logSuccess('Checksum verification: PASSED ✅');
        } else {
            logError('Checksum verification: FAILED ❌');
            logError('The checksum does not match! This will cause Paytm to reject the payment.');
            logWarning('Possible causes:');
            logWarning('  1. PAYTM_MERCHANT_KEY in .env does not match Paytm Dashboard');
            logWarning('  2. Parameter values are being modified after checksum generation');
            logWarning('  3. WEBSITE or INDUSTRY_TYPE_ID mismatch with Dashboard');
        }

    } catch (error) {
        logError(`Checksum verification error: ${error.message}`);
    }
}

/**
 * Run all tests
 */
async function runAllTests() {
    logSection('🧪 Paytm Payment Link Creation - Automated Test Suite');
    logInfo(`API Endpoint: ${API_ENDPOINT}`);
    logInfo(`API Key: ${API_KEY.substring(0, 20)}...`);
    logInfo(`Total Tests: ${testCases.length}\n`);

    const results = [];
    
    for (let i = 0; i < testCases.length; i++) {
        const result = await testPaymentLinkCreation(testCases[i]);
        results.push(result);
        
        // Small delay between tests
        if (i < testCases.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    // Summary
    logSection('📊 Test Summary');
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);

    console.log(`Total Tests: ${results.length}`);
    logSuccess(`Passed: ${passed}`);
    if (failed > 0) {
        logError(`Failed: ${failed}`);
    }
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log(`Average Duration: ${Math.round(totalDuration / results.length)}ms`);

    console.log('\n📋 Detailed Results:');
    results.forEach((result, index) => {
        if (result.success) {
            logSuccess(`${index + 1}. ${result.testCase} (${result.duration}ms)`);
        } else {
            logError(`${index + 1}. ${result.testCase} (${result.error || `Status: ${result.status}`})`);
        }
    });

    // Exit code
    process.exit(failed > 0 ? 1 : 0);
}

/**
 * Run single test with custom amount
 */
async function runSingleTest(amount) {
    const testCase = {
        name: `Custom Test - ₹${amount}`,
        data: {
            amount: amount.toString(),
            customer_name: 'Test Customer',
            customer_email: 'test@example.com',
            customer_phone: '9876543210',
            description: `Test payment for ₹${amount}`
        },
        expectedStatus: 200
    };

    logSection('🧪 Single Test - Paytm Payment Link Creation');
    const result = await testPaymentLinkCreation(testCase);
    
    if (result.success) {
        logSuccess('\n✅ Test completed successfully!');
        process.exit(0);
    } else {
        logError('\n❌ Test failed!');
        process.exit(1);
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const amountArg = args.find(arg => arg.startsWith('--amount='));
const allTests = args.includes('--all');

if (amountArg) {
    const amount = amountArg.split('=')[1];
    runSingleTest(amount);
} else if (allTests || args.length === 0) {
    runAllTests();
} else {
    console.log('Usage:');
    console.log('  node scripts/testPaytmPaymentLink.js              # Run all tests');
    console.log('  node scripts/testPaytmPaymentLink.js --all        # Run all tests');
    console.log('  node scripts/testPaytmPaymentLink.js --amount=100 # Run single test with amount');
    process.exit(1);
}

