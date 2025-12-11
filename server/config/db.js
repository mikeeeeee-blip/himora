const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Check if MONGO_URI is set
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is not set in environment variables');
        }

        // Check if already connected
        if (mongoose.connection.readyState === 1) {
            console.log('✅ MongoDB already connected');
            return mongoose.connection;
        }

        console.log('🔄 Attempting to connect to MongoDB...');
        console.log(`   URI: ${process.env.MONGO_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`); // Hide credentials in logs
        
        // ✅ Connection options with proper timeouts
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 30000, // 30 seconds to select server
            socketTimeoutMS: 45000, // 45 seconds socket timeout
            connectTimeoutMS: 30000, // 30 seconds connection timeout
            maxPoolSize: 10,
            minPoolSize: 2,
            retryWrites: true,
            w: 'majority'
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`📊 Database: ${conn.connection.name}`);
        console.log(`🔗 Connection State: ${getConnectionState(mongoose.connection.readyState)}`);
        
        // Set up connection event handlers
        mongoose.connection.on('error', err => {
            console.error('❌ MongoDB connection error:', err.message);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('⚠️  MongoDB disconnected');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('✅ MongoDB reconnected');
        });

        return conn;
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        console.error('   Error details:', error);
        
        // Provide helpful error messages
        if (error.message.includes('authentication failed')) {
            console.error('   💡 Check your MongoDB username and password');
        } else if (error.message.includes('ECONNREFUSED')) {
            console.error('   💡 Check if MongoDB server is running and accessible');
        } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
            console.error('   💡 Check if MongoDB hostname is correct and DNS is resolving');
        } else if (error.message.includes('timeout')) {
            console.error('   💡 Connection timeout - check network connectivity and firewall settings');
        }
        
        throw error; // Re-throw to let caller handle it
    }
};

// Helper function to get connection state string
function getConnectionState(state) {
    const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };
    return states[state] || 'unknown';
}

module.exports = connectDB;