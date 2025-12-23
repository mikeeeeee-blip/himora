// scripts/flushUserTransactions.js
// Usage:
//   node scripts/flushUserTransactions.js user@example.com
//
// This script will:
//   - Look up the user by email
//   - Delete ALL of their transactions and payouts
//   - SKIP deletion entirely for the protected email:
//       "mayanksahu0024@gmail.com"
//
// ⚠️  This is a destructive operation. Use with extreme care.

const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

const connectDB = require('../config/db');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Payout = require('../models/Payout');

// Load environment variables from server/.env
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const PROTECTED_EMAIL = 'mayanksahu0024@gmail.com';

async function flushUserTransactions() {
  try {
    const emailArg = process.argv[2];

    if (!emailArg) {
      console.error('❌ Please provide a user email.');
      console.error('   Example: node scripts/flushUserTransactions.js user@example.com');
      process.exit(1);
    }

    const email = emailArg.trim().toLowerCase();

    // Hard protection for the specified email
    if (email === PROTECTED_EMAIL.toLowerCase()) {
      console.log('🛑 This email is protected and will not be modified:', PROTECTED_EMAIL);
      console.log('    No transactions or payouts were deleted.');
      process.exit(0);
    }

    console.log('🔄 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ MongoDB connected\n');

    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`⚠️  No user found with email: ${email}`);
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log('👤 User found:');
    console.log(`   ID   : ${user._id}`);
    console.log(`   Name : ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role : ${user.role}\n`);

    // Double-confirm via CLI flag to avoid mistakes
    const forceFlag = process.argv.includes('--yes') || process.argv.includes('-y');
    if (!forceFlag) {
      console.log('⚠️  This will PERMANENTLY delete all transactions and payouts for this user.');
      console.log('   To proceed, re-run the command with the --yes flag:');
      console.log(`   node scripts/flushUserTransactions.js ${email} --yes`);
      await mongoose.disconnect();
      process.exit(0);
    }

    // Delete transactions
    console.log('🧹 Deleting transactions for this user...');
    const txResult = await Transaction.deleteMany({ merchantId: user._id });
    console.log(`   🗑️  Transactions deleted: ${txResult.deletedCount}`);

    // Delete payouts
    console.log('🧹 Deleting payouts for this user...');
    const payoutResult = await Payout.deleteMany({ merchantId: user._id });
    console.log(`   🗑️  Payouts deleted: ${payoutResult.deletedCount}`);

    console.log('\n✅ Flush completed successfully.');
  } catch (error) {
    console.error('❌ Error flushing user transactions:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

flushUserTransactions();


