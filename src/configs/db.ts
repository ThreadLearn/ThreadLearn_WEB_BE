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
  const usesSrvConnectionString = env.DATABASE_URL.startsWith('mongodb+srv://');
  if (dnsConfigured || !usesSrvConnectionString || env.DNS_SERVERS.length === 0) {
    return;
  }

  try {
    // dns.setServers changes Node's process-wide resolver; keep it opt-in and SRV-only.
    dns.setServers(env.DNS_SERVERS);
    dnsConfigured = true;
    logger.info(`🌐 Using custom process-wide DNS servers before MongoDB SRV lookup: ${dns.getServers().join(', ')}`);
  } catch (error) {
    logger.error('❌ Invalid DNS_SERVERS configuration. Process-wide DNS override was not applied.', error);
    throw error;
  }
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
