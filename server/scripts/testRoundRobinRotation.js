#!/usr/bin/env node

/**
 * Test Script for Round-Robin Payment Gateway Rotation
 * 
 * This script tests the round-robin rotation logic by creating multiple payment links
 * and verifying that gateways alternate correctly.
 * 
 * Usage:
 *   node scripts/testRoundRobinRotation.js
 *   node scripts/testRoundRobinRotation.js --count 10
 */

require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

// Configuration
const API_KEY = 'ninexgroup_b1c2d179e24ccf6b2fb2691a57e87645ed96c991d2031508';
const BASE_URL = process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5000';
const API_ENDPOINT = `${BASE_URL}/api/payments/create-payment-link`;
// Try both common environment variable names (MONGO_URI is used in config/db.js)
const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/himora';

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(message) {
    console.log('\n' + '='.repeat(80));
    log(message, 'cyan');
    console.log('='.repeat(80) + '\n');
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

/**
 * Connect to MongoDB
 */
async function connectDB() {
    try {
        await mongoose.connect(MONGODB_URI);
        logSuccess('Connected to MongoDB');
    } catch (error) {
        logError(`Failed to connect to MongoDB: ${error.message}`);
        process.exit(1);
    }
}

/**
 * Get current payment gateway settings
 */
async function getSettings() {
    const Settings = require('../models/Settings');
    return await Settings.getSettings();
}

/**
 * Create a payment link via API
 */
async function createPaymentLink(testNumber) {
    const testData = {
        amount: '10',
        customer_name: `Test Customer ${testNumber}`,
        customer_email: `test${testNumber}@example.com`,
        customer_phone: `9876543${String(testNumber).padStart(3, '0')}`,
        description: `Round-robin test payment ${testNumber}` // Removed # to avoid Easebuzz validation issues
    };

    try {
        const response = await axios.post(API_ENDPOINT, testData, {
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        return {
            success: true,
            data: response.data,
            gateway: response.data.gateway_used || response.data.gateway_name?.toLowerCase() || 'unknown',
            status: response.status
        };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data?.error || error.message,
            status: error.response?.status || 500
        };
    }
}

/**
 * Test round-robin rotation
 */
async function testRoundRobinRotation(testCount = 10) {
    logSection('🔄 Round-Robin Payment Gateway Rotation Test');
    
    logInfo(`API Endpoint: ${API_ENDPOINT}`);
    logInfo(`API Key: ${API_KEY.substring(0, 20)}...`);
    logInfo(`Test Count: ${testCount} payment links\n`);

    // Get initial settings
    logInfo('Fetching current payment gateway settings...');
    const settings = await getSettings();
    const enabledGateways = settings.getEnabledGateways();
    
    logInfo(`Enabled Gateways: ${enabledGateways.length > 0 ? enabledGateways.join(', ') : 'NONE'}`);
    logInfo(`Current Round-Robin Index: ${settings.roundRobinRotation?.lastUsedGatewayIndex ?? -1}`);
    
    if (enabledGateways.length === 0) {
        logError('No payment gateways are enabled! Please enable at least one gateway in admin settings.');
        return;
    }

    if (enabledGateways.length === 1) {
        logWarning('Only one gateway is enabled. Round-robin rotation requires at least 2 gateways.');
        logInfo(`Single enabled gateway: ${enabledGateways[0]}`);
    }

    logSection('Creating Payment Links to Test Rotation');

    const results = [];
    const gatewayUsage = {};

    // Create multiple payment links
    for (let i = 1; i <= testCount; i++) {
        logInfo(`\n[Test ${i}/${testCount}] Creating payment link...`);
        
        // Get settings before creating link
        const settingsBefore = await getSettings();
        const indexBefore = settingsBefore.roundRobinRotation?.lastUsedGatewayIndex ?? -1;
        const nextGatewayBefore = settingsBefore.getCurrentActiveGateway();
        
        logInfo(`   Before: Index=${indexBefore}, Next Gateway=${nextGatewayBefore}`);
        
        // Create payment link
        const result = await createPaymentLink(i);
        
        // Get settings after creating link
        const settingsAfter = await getSettings();
        const indexAfter = settingsAfter.roundRobinRotation?.lastUsedGatewayIndex ?? -1;
        const nextGatewayAfter = settingsAfter.getCurrentActiveGateway();
        
        logInfo(`   After: Index=${indexAfter}, Next Gateway=${nextGatewayAfter}`);

        if (result.success) {
            const gateway = result.gateway;
            gatewayUsage[gateway] = (gatewayUsage[gateway] || 0) + 1;
            
            logSuccess(`Payment link #${i} created using: ${gateway}`);
            logInfo(`   Transaction ID: ${result.data.transaction_id || 'N/A'}`);
            logInfo(`   Payment URL: ${result.data.payment_url ? result.data.payment_url.substring(0, 60) + '...' : 'N/A'}`);
            
            results.push({
                testNumber: i,
                success: true,
                gateway: gateway,
                transactionId: result.data.transaction_id,
                indexBefore: indexBefore,
                indexAfter: indexAfter,
                expectedGateway: nextGatewayBefore,
                actualGateway: gateway
            });
        } else {
            logError(`Payment link #${i} failed: ${result.error}`);
            results.push({
                testNumber: i,
                success: false,
                error: result.error,
                status: result.status
            });
        }

        // Small delay between requests
        if (i < testCount) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    // Analysis
    logSection('📊 Round-Robin Rotation Analysis');

    logInfo('Gateway Usage Summary:');
    Object.entries(gatewayUsage).forEach(([gateway, count]) => {
        const percentage = ((count / testCount) * 100).toFixed(1);
        logInfo(`   ${gateway}: ${count} times (${percentage}%)`);
    });

    // Check if rotation is working
    const sortedEnabledGateways = [...enabledGateways].sort();
    logInfo(`\nExpected Rotation Order: ${sortedEnabledGateways.join(' → ')} (repeating)`);

    // Analyze rotation pattern
    const successfulResults = results.filter(r => r.success);
    let rotationWorking = false;
    
    if (successfulResults.length > 1) {
        logInfo('\nRotation Pattern Analysis:');
        rotationWorking = true;
        let lastGateway = null;
        let rotationCount = 0;
        let expectedIndex = -1;

        // Get the initial index from settings to determine starting point
        const initialSettings = await getSettings();
        let currentIndex = initialSettings.roundRobinRotation?.lastUsedGatewayIndex ?? -1;
        
        successfulResults.forEach((result, index) => {
            // Calculate expected gateway based on current rotation state
            // The next gateway should be at (currentIndex + 1) % length
            const expectedIndex = (currentIndex + 1) % sortedEnabledGateways.length;
            const expectedGateway = sortedEnabledGateways[expectedIndex];
            
            // Update current index for next iteration
            currentIndex = expectedIndex;
            
            if (result.gateway !== expectedGateway) {
                rotationWorking = false;
                logError(`   Test #${result.testNumber}: Expected ${expectedGateway}, got ${result.gateway}`);
            } else {
                if (lastGateway !== result.gateway) {
                    rotationCount++;
                }
                logSuccess(`   Test #${result.testNumber}: ${result.gateway} ✓`);
            }
            lastGateway = result.gateway;
        });

        logSection('🎯 Test Results');
        
        if (rotationWorking) {
            logSuccess('Round-robin rotation is working correctly!');
            logInfo(`   Total rotations detected: ${rotationCount}`);
            logInfo(`   Gateways used: ${Object.keys(gatewayUsage).join(', ')}`);
        } else {
            logError('Round-robin rotation is NOT working correctly!');
            logWarning('   Some payment links did not use the expected gateway.');
        }

        // Show expected vs actual
        logInfo('\nExpected vs Actual Gateway Usage:');
        sortedEnabledGateways.forEach((gateway, index) => {
            const expectedCount = Math.ceil(testCount / sortedEnabledGateways.length);
            const actualCount = gatewayUsage[gateway] || 0;
            const status = Math.abs(actualCount - expectedCount) <= 1 ? '✓' : '✗';
            logInfo(`   ${gateway}: Expected ~${expectedCount}, Actual ${actualCount} ${status}`);
        });
    } else if (successfulResults.length === 1) {
        logWarning('Only one successful payment link created. Cannot verify rotation pattern.');
    } else {
        logError('No successful payment links created. Cannot verify rotation.');
    }

    // Final settings state
    logSection('Final Settings State');
    const finalSettings = await getSettings();
    logInfo(`Final Round-Robin Index: ${finalSettings.roundRobinRotation?.lastUsedGatewayIndex ?? -1}`);
    logInfo(`Next Gateway (for next payment): ${finalSettings.getCurrentActiveGateway()}`);

    return {
        totalTests: testCount,
        successful: successfulResults.length,
        failed: results.filter(r => !r.success).length,
        gatewayUsage: gatewayUsage,
        rotationWorking: successfulResults.length > 1 && rotationWorking
    };
}

/**
 * Main function
 */
async function main() {
    try {
        // Parse command line arguments
        const args = process.argv.slice(2);
        let testCount = 10;
        
        if (args.includes('--count')) {
            const countIndex = args.indexOf('--count');
            if (countIndex + 1 < args.length) {
                testCount = parseInt(args[countIndex + 1], 10);
                if (isNaN(testCount) || testCount < 1) {
                    logError('Invalid test count. Using default: 10');
                    testCount = 10;
                }
            }
        }

        // Connect to database
        await connectDB();

        // Run tests
        const summary = await testRoundRobinRotation(testCount);

        // Summary
        logSection('📋 Final Summary');
        logInfo(`Total Tests: ${summary.totalTests}`);
        logSuccess(`Successful: ${summary.successful}`);
        if (summary.failed > 0) {
            logError(`Failed: ${summary.failed}`);
        }
        logInfo(`Rotation Working: ${summary.rotationWorking ? 'YES ✓' : 'NO ✗'}`);

        // Close database connection
        await mongoose.connection.close();
        logSuccess('Database connection closed');

        // Exit
        process.exit(summary.rotationWorking && summary.failed === 0 ? 0 : 1);

    } catch (error) {
        logError(`Test script error: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { testRoundRobinRotation, createPaymentLink };

