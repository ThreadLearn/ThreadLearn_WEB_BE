import dns from 'dns';
import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

interface GlobalMongoose {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: GlobalMongoose | undefined;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

let dnsConfigured = false;

function configureDnsServers() {
  if (dnsConfigured || env.DNS_SERVERS.length === 0) {
    return;
  }

  dnsConfigured = true;
  dns.setServers(env.DNS_SERVERS);
  logger.info(`🌐 Using custom DNS servers for MongoDB SRV lookup: ${env.DNS_SERVERS.join(', ')}`);
}

export async function connectToDatabase() {
  if (cached!.conn) {
    return cached!.conn;
  }

  if (!cached!.promise) {
    const opts = {
      bufferCommands: false,
    };

    logger.info('🔌 Connecting to MongoDB...');
    configureDnsServers();
    cached!.promise = mongoose.connect(env.DATABASE_URL, opts).then((mongooseInstance) => {
      logger.info('✅ Successfully connected to MongoDB database.');
      return mongooseInstance;
    }).catch((err) => {
      logger.error('❌ MongoDB connection failure:', err);
      cached!.promise = null;
      throw err;
    });
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  return cached!.conn;
}
export default connectToDatabase;
