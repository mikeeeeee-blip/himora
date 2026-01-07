#!/usr/bin/env node
/**
 * Zaakpay Setup Verification Script
 * Run this to verify your Zaakpay environment configuration
 * 
 * Usage: node verify-zaakpay-setup.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Zaakpay Setup Verification\n');
console.log('=' .repeat(60) + '\n');

const errors = [];
const warnings = [];
const success = [];

// Check krishi-shaktisewa .env
console.log('📁 Checking krishi-shaktisewa environment...\n');

const krishiEnvPath = path.join(__dirname, 'krishi-shaktisewa', '.env');
let krishiEnv = {};

try {
  const envContent = fs.readFileSync(krishiEnvPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=# ]+)=(.*)$/);
    if (match) {
      krishiEnv[match[1]] = match[2];
    }
  });
} catch (err) {
  errors.push('❌ Cannot read krishi-shaktisewa/.env file');
}

// Check required variables
const requiredKrishiVars = [
  'ZACKPAY_MODE',
  'ZACKPAY_MERCHANT_ID_TEST',
  'ZACKPAY_SECRET_KEY_TEST',
  'ZACKPAY_CALLBACK_URL_TEST',
  'ZACKPAY_WEBSITE_URL',
  'NEXT_PUBLIC_WEBSITE_URL'
];

requiredKrishiVars.forEach(varName => {
  if (krishiEnv[varName]) {
    const value = krishiEnv[varName];
    
    // Check for localhost
    if (value.includes('localhost') || value.includes('127.0.0.1')) {
      errors.push(`❌ ${varName} contains localhost: ${value}`);
      console.log(`   Fix: Set ${varName} to a public URL`);
    } else {
      success.push(`✅ ${varName} is set correctly`);
    }
  } else {
    errors.push(`❌ Missing ${varName} in krishi-shaktisewa/.env`);
  }
});

// Check server .env
console.log('\n📁 Checking server environment...\n');

const serverEnvPath = path.join(__dirname, 'server', '.env');
let serverEnv = {};

try {
  const envContent = fs.readFileSync(serverEnvPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=# ]+)=(.*)$/);
    if (match) {
      serverEnv[match[1]] = match[2];
    }
  });
} catch (err) {
  errors.push('❌ Cannot read server/.env file');
}

const requiredServerVars = [
  'ZACKPAY_MODE',
  'ZACKPAY_MERCHANT_ID_TEST',
  'ZACKPAY_SECRET_KEY_TEST',
  'KRISHI_API_URL',
  'FRONTEND_URL'
];

requiredServerVars.forEach(varName => {
  if (serverEnv[varName]) {
    const value = serverEnv[varName];
    
    if (value.includes('localhost') || value.includes('127.0.0.1')) {
      warnings.push(`⚠️  ${varName} contains localhost in server/.env: ${value}`);
    } else {
      success.push(`✅ ${varName} is set correctly in server`);
    }
  } else {
    warnings.push(`⚠️  Missing ${varName} in server/.env`);
  }
});

// Print results
console.log('\n' + '='.repeat(60));
console.log('📊 Verification Results\n');

if (success.length > 0) {
  console.log('✅ Success (' + success.length + '):\n');
  success.forEach(msg => console.log('  ' + msg));
  console.log('');
}

if (warnings.length > 0) {
  console.log('⚠️  Warnings (' + warnings.length + '):\n');
  warnings.forEach(msg => console.log('  ' + msg));
  console.log('');
}

if (errors.length > 0) {
  console.log('❌ Errors (' + errors.length + '):\n');
  errors.forEach(msg => console.log('  ' + msg));
  console.log('');
}

// Final verdict
console.log('='.repeat(60));
if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ All checks passed! Your Zaakpay setup looks good.');
} else if (errors.length === 0) {
  console.log('⚠️  Setup is mostly correct, but review warnings above.');
} else {
  console.log('❌ Setup has errors. Please fix them before testing.');
}

console.log('\n📚 Next Steps:\n');
console.log('1. Fix any errors or warnings listed above');
console.log('2. Register URLs in Zaakpay Dashboard:');
console.log('   → https://zaakpay.com → Developers → Integration URLs');
console.log('3. Create a new payment link (don\'t reuse old transactions)');
console.log('4. Test the payment flow');
console.log('5. If encrypted names still appear, contact Zaakpay support');
console.log('\n' + '='.repeat(60) + '\n');

// Exit with error code if there are errors
process.exit(errors.length > 0 ? 1 : 0);

