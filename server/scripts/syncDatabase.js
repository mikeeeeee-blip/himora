// scripts/syncDatabase.js
// Usage:
//   node scripts/syncDatabase.js
//
// This script will:
//   - Connect to source database: himora
//   - Connect to destination database: stage-himora
//   - Copy ALL collections and documents from source to destination
//   - Preserve indexes
//   - Show progress for each collection
//
// ⚠️  This will overwrite existing data in the destination database.

const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from server/.env
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

// Source and destination database names
const SOURCE_DB = 'himora';
const DEST_DB = 'stage-himora';

// MongoDB connection string (without database name)
const BASE_URI = 'mongodb+srv://mayanksahu0024_db_user:LVYFM1vhdfJj8bSs@cluster0.wv2xjl6.mongodb.net';

const SOURCE_URI = `${BASE_URI}/${SOURCE_DB}`;
const DEST_URI = `${BASE_URI}/${DEST_DB}`;

// Collections to skip (system collections)
const SKIP_COLLECTIONS = ['system.indexes', 'system.profile', 'system.users'];

// Helper function to format numbers
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Helper function to format time
function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
}

async function syncDatabase() {
  let sourceClient = null;
  let destClient = null;
  let sourceDb = null;
  let destDb = null;

  try {
    console.log('🚀 Starting Database Sync');
    console.log(`📤 Source: ${SOURCE_DB}`);
    console.log(`📥 Destination: ${DEST_DB}`);
    console.log('');

    // Connect to source database
    console.log('🔄 Connecting to source database...');
    sourceClient = mongoose.createConnection(SOURCE_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
    });
    
    // Wait for connection
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 30000);
      
      sourceClient.once('connected', () => {
        clearTimeout(timeout);
        resolve();
      });
      sourceClient.once('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
    
    sourceDb = sourceClient.db;
    console.log(`✅ Connected to source: ${SOURCE_DB}`);

    // Connect to destination database
    console.log('🔄 Connecting to destination database...');
    destClient = mongoose.createConnection(DEST_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
    });
    
    // Wait for connection
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 30000);
      
      destClient.once('connected', () => {
        clearTimeout(timeout);
        resolve();
      });
      destClient.once('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
    
    destDb = destClient.db;
    console.log(`✅ Connected to destination: ${DEST_DB}`);
    console.log('');

    // Get all collections from source
    console.log('📋 Fetching collections from source database...');
    const collections = await sourceDb.listCollections().toArray();
    const collectionNames = collections
      .map(col => col.name)
      .filter(name => !SKIP_COLLECTIONS.includes(name));

    console.log(`✅ Found ${collectionNames.length} collections to sync`);
    console.log(`   Collections: ${collectionNames.join(', ')}`);
    console.log('');

    const startTime = Date.now();
    let totalDocuments = 0;
    let totalCollections = 0;
    const errors = [];

    // Sync each collection
    for (let i = 0; i < collectionNames.length; i++) {
      const collectionName = collectionNames[i];
      const collectionStartTime = Date.now();

      try {
        console.log(`[${i + 1}/${collectionNames.length}] Syncing collection: ${collectionName}`);

        // Get source collection
        const sourceCollection = sourceDb.collection(collectionName);
        const destCollection = destDb.collection(collectionName);

        // Get document count
        const documentCount = await sourceCollection.countDocuments();
        console.log(`   📊 Documents: ${formatNumber(documentCount)}`);

        if (documentCount === 0) {
          console.log(`   ⏭️  Skipping empty collection`);
          console.log('');
          continue;
        }

        // Get indexes from source
        const indexes = await sourceCollection.indexes();
        console.log(`   🔍 Indexes: ${indexes.length}`);

        // Delete existing data in destination (optional - comment out if you want to merge)
        const existingCount = await destCollection.countDocuments();
        if (existingCount > 0) {
          console.log(`   🗑️  Removing ${formatNumber(existingCount)} existing documents...`);
          await destCollection.deleteMany({});
        }

        // Drop existing indexes in destination (to recreate them)
        try {
          await destCollection.dropIndexes();
        } catch (err) {
          // Ignore errors if no indexes exist
        }

        // Copy documents in batches
        const batchSize = 1000;
        let copied = 0;
        let skip = 0;

        console.log(`   📤 Copying documents (batch size: ${batchSize})...`);

        while (skip < documentCount) {
          const batch = await sourceCollection
            .find({})
            .skip(skip)
            .limit(batchSize)
            .toArray();

          if (batch.length === 0) break;

          // Insert batch into destination
          if (batch.length > 0) {
            await destCollection.insertMany(batch, { ordered: false });
          }

          copied += batch.length;
          skip += batchSize;

          // Show progress
          const progress = ((copied / documentCount) * 100).toFixed(1);
          process.stdout.write(`   ⏳ Progress: ${progress}% (${formatNumber(copied)}/${formatNumber(documentCount)})\r`);
        }

        console.log(`   ✅ Copied ${formatNumber(copied)} documents`);

        // Recreate indexes
        if (indexes.length > 0) {
          console.log(`   🔧 Recreating ${indexes.length} indexes...`);
          for (const index of indexes) {
            try {
              // Skip _id index (created automatically)
              if (index.name === '_id_') continue;

              const indexSpec = {};
              for (const [key, value] of Object.entries(index.key)) {
                indexSpec[key] = value;
              }

              const indexOptions = { ...index };
              delete indexOptions.key;
              delete indexOptions.v;
              delete indexOptions.ns;

              await destCollection.createIndex(indexSpec, indexOptions);
            } catch (err) {
              console.log(`   ⚠️  Warning: Could not create index ${index.name}: ${err.message}`);
            }
          }
          console.log(`   ✅ Indexes recreated`);
        }

        const collectionTime = Date.now() - collectionStartTime;
        console.log(`   ⏱️  Time: ${formatTime(collectionTime)}`);
        console.log('');

        totalDocuments += copied;
        totalCollections++;

      } catch (error) {
        console.error(`   ❌ Error syncing collection ${collectionName}:`, error.message);
        errors.push({ collection: collectionName, error: error.message });
        console.log('');
      }
    }

    const totalTime = Date.now() - startTime;

    // Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 SYNC SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`✅ Collections synced: ${totalCollections}/${collectionNames.length}`);
    console.log(`✅ Total documents copied: ${formatNumber(totalDocuments)}`);
    console.log(`⏱️  Total time: ${formatTime(totalTime)}`);
    
    if (errors.length > 0) {
      console.log(`❌ Errors: ${errors.length}`);
      console.log('');
      console.log('Failed collections:');
      errors.forEach(({ collection, error }) => {
        console.log(`   - ${collection}: ${error}`);
      });
    } else {
      console.log(`✅ All collections synced successfully!`);
    }
    console.log('═══════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    console.error('   Error details:', error.message);
    process.exit(1);
  } finally {
    // Close connections
    if (sourceClient) {
      await sourceClient.close();
      console.log('🔌 Source connection closed');
    }
    if (destClient) {
      await destClient.close();
      console.log('🔌 Destination connection closed');
    }
    // Also close main mongoose connection if any
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  }
}

// Run the sync
syncDatabase()
  .then(() => {
    console.log('');
    console.log('🎉 Sync completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  });

