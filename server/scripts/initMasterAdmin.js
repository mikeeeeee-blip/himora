// scripts/initMasterAdmin.js
// Script to initialize a master admin user

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const initMasterAdmin = async () => {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await connectDB();
        console.log('✅ MongoDB connected\n');

        const email = 'prabhash@ninexfold.com';
        const password = 'Techno4152@';
        const name = 'Prabhash';
        const role = 'superAdmin';

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        
        if (existingUser) {
            console.log(`⚠️  User with email ${email} already exists!`);
            console.log(`   Role: ${existingUser.role}`);
            console.log(`   Name: ${existingUser.name}`);
            console.log(`   ID: ${existingUser._id}`);
            console.log('\n💡 To update the password, please use the change password feature in the dashboard.');
            console.log('   Or delete the existing user and run this script again.\n');
            await mongoose.disconnect();
            return;
        }

        // Create new user
        console.log(`📝 Creating master superAdmin user...`);
        console.log(`   Email: ${email}`);
        console.log(`   Name: ${name}`);
        console.log(`   Role: ${role}`);

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user object
        const user = new User({
            name: name,
            email: email,
            password: hashedPassword,
            role: role,
            businessName: name,
            status: 'active',
            businessDetails: {
                displayName: name,
                supportEmail: email
            }
        });

        // Save user
        await user.save();

        console.log('\n✅ Master superAdmin user created successfully!');
        console.log(`   User ID: ${user._id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Status: ${user.status}`);
        console.log('\n🔐 Login credentials:');
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${password}`);
        console.log('\n💡 You can now login to the superAdmin dashboard with these credentials.\n');

    } catch (error) {
        console.error('❌ Error initializing master admin:', error.message);
        if (error.code === 11000) {
            console.error('   Duplicate key error - user with this email may already exist');
        }
        console.error('   Full error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
};

// Run the script
initMasterAdmin();

