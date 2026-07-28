// Xóa tất cả AI history records có fix: undefined (tạo bởi code cũ)
// Usage: node scripts/cleanup-old-history.mjs
import mongoose from 'mongoose';
import dns from 'dns';

// Force DNS qua Google (8.8.8.8) — fix lỗi SRV ECONNREFUSED trên mạng FPT
dns.setServers(['8.8.8.8', '1.1.1.1']);

const MONGO_URL = process.env.DATABASE_URL
  || 'mongodb+srv://tiendatyyy2005_db_user:TdgmQZHMUyLLZlQN@threadlearndb.wx93lwh.mongodb.net/threadlearn?retryWrites=true&w=majority';

async function main() {
  await mongoose.connect(MONGO_URL, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });
  console.log('Connected.');

  try {
    const col = mongoose.connection.db.collection('aihistories');

    const total = await col.countDocuments();
    console.log(`Total records: ${total}`);

    const badCount = await col.countDocuments({
      $or: [
        { issues: { $size: 0 } },
        { 'issues.fix': { $exists: false } },
        { 'issues.fix': null },
      ],
    });
    console.log(`Records with missing fix (to delete): ${badCount}`);

    if (badCount === 0) {
      console.log('No records to clean up.');
      return;
    }

    const result = await col.deleteMany({
      $or: [
        { issues: { $size: 0 } },
        { 'issues.fix': { $exists: false } },
        { 'issues.fix': null },
      ],
    });

    console.log(`Deleted: ${result.deletedCount} records`);
    console.log(`Remaining: ${total - result.deletedCount} records`);
  } finally {
    await mongoose.disconnect();
    console.log('Done.');
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
