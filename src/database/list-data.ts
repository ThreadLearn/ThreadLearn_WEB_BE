import mongoose from 'mongoose';
import connectToDatabase from '../configs/db';
import { logger } from '../configs/logger';

/**
 * Read-only utility: connects to MongoDB and prints every collection with its
 * documents. Useful right after `npm run db:seed` to verify what landed in the DB.
 *
 * Run with: ts-node src/database/list-data.ts
 */

// Trim very long string fields (e.g. lesson content) so the dump stays readable.
function clean(value: any): any {
  if (value instanceof mongoose.Types.ObjectId) return value.toHexString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = clean(v);
    return out;
  }
  if (typeof value === 'string' && value.length > 160) {
    return value.slice(0, 157) + '...';
  }
  return value;
}

async function listData() {
  try {
    await connectToDatabase();

    const db = mongoose.connection.db;
    if (!db) throw new Error('No active database connection.');

    logger.info(`📦 Database: "${db.databaseName}"`);

    const collections = await db.listCollections().toArray();
    if (collections.length === 0) {
      logger.warn('⚠️  No collections found. Did you run `npm run db:seed`?');
      return;
    }
    collections.sort((a, b) => a.name.localeCompare(b.name));

    for (const { name } of collections) {
      const docs = await db.collection(name).find({}).toArray();
      console.log(`\n================ ${name} (${docs.length} docs) ================`);
      console.log(JSON.stringify(clean(docs), null, 2));
    }
  } catch (error) {
    logger.error('❌ Failed to list data:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    logger.info('\n🔌 Database connection closed gracefully.');
    process.exit(0);
  }
}

listData();
