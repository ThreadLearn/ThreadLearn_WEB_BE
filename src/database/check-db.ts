import mongoose from 'mongoose';
import connectToDatabase from '../configs/db';
import { logger } from '../configs/logger';

/**
 * Read-only sanity check: confirms whether `list-data.ts` actually saw EVERYTHING.
 * Lists all databases on the cluster (if the user has rights) and an exact
 * countDocuments() per collection in the active database.
 *
 * Run with: ts-node src/database/check-db.ts
 */
async function checkDb() {
  try {
    await connectToDatabase();
    const conn = mongoose.connection;
    const db = conn.db;
    if (!db) throw new Error('No active database connection.');

    // 1. Which databases exist on this cluster?
    logger.info('🌐 Databases on this cluster:');
    try {
      const { databases } = await conn.getClient().db().admin().listDatabases();
      for (const d of databases) {
        const sizeMB = d.sizeOnDisk ? (d.sizeOnDisk / 1024 / 1024).toFixed(2) : '?';
        console.log(`   - ${d.name} (${sizeMB} MB)${d.name === db.databaseName ? '   <-- app is using this' : ''}`);
      }
    } catch (e: any) {
      console.log(`   (cannot list databases — user lacks clusterAdmin rights: ${e.message})`);
    }

    // 2. Exact per-collection counts in the active database.
    logger.info(`\n📦 Collections in active DB "${db.databaseName}" (exact counts):`);
    const collections = await db.listCollections().toArray();
    collections.sort((a, b) => a.name.localeCompare(b.name));

    let total = 0;
    for (const { name, type } of collections) {
      const count = await db.collection(name).countDocuments();
      total += count;
      console.log(`   - ${name.padEnd(28)} ${String(count).padStart(4)} docs${type && type !== 'collection' ? `  [${type}]` : ''}`);
    }
    logger.info(`\n   = ${collections.length} collections, ${total} documents total.`);
  } catch (error) {
    logger.error('❌ Check failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    logger.info('🔌 Database connection closed gracefully.');
    process.exit(0);
  }
}

checkDb();
