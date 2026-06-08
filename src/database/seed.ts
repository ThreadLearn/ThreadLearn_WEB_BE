import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const DATABASE_URL = process.env.DATABASE_URL;

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@threadlearn.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin@123456';

async function seedAdmin() {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is missing in .env');
  }

  await mongoose.connect(DATABASE_URL);
  console.log('✅ Connected to MongoDB');

  const usersCollection = mongoose.connection.collection('users');

  const existingAdmin = await usersCollection.findOne({
    email: ADMIN_EMAIL.toLowerCase(),
  });

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const now = new Date();

  const adminData = {
    email: ADMIN_EMAIL.toLowerCase(),
    passwordHash,
    firstName: 'ThreadLearn',
    lastName: 'Admin',
    avatarUrl: null,
    role: 'ADMIN',
    isVerified: true,
    emailVerifiedAt: now,
    isActive: true,
    lockedAt: null,
    lockedReason: null,
    lastLoginAt: null,
    updatedAt: now,
  };

  if (existingAdmin) {
    await usersCollection.updateOne(
      { email: ADMIN_EMAIL.toLowerCase() },
      {
        $set: adminData,
        $setOnInsert: {
          createdAt: existingAdmin.createdAt || now,
        },
      },
    );

    console.log('✅ Admin user updated successfully');
  } else {
    await usersCollection.insertOne({
      ...adminData,
      createdAt: now,
    });

    console.log('✅ Admin user created successfully');
  }

  console.log('================================');
  console.log('Admin account');
  console.log(`Email: ${ADMIN_EMAIL}`);
  console.log(`Password: ${ADMIN_PASSWORD}`);
  console.log('================================');

  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB');
}

seedAdmin().catch(async (error) => {
  console.error('❌ Seed admin failed:', error);

  try {
    await mongoose.disconnect();
  } catch {
    // ignore disconnect error
  }

  process.exit(1);
});