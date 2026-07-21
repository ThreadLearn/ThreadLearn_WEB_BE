/* eslint-disable no-console */
import mongoose from 'mongoose';
import { connectToDatabase } from '../../configs/db';

const legacyIndexName = 'userId_1_lessonId_1';

async function migrate() {
  const database = await connectToDatabase();
  const notes = database.connection.collection('notes');
  const indexes = await notes.indexes();
  const legacyIndex = indexes.find((index) => index.name === legacyIndexName && index.unique);

  if (legacyIndex) {
    await notes.dropIndex(legacyIndexName);
    console.log(`Dropped legacy unique index: ${legacyIndexName}`);
  } else {
    console.log('Legacy unique note index is not present.');
  }

  await notes.createIndex({ userId: 1, lessonId: 1, updatedAt: -1 });
  console.log('Notes now support multiple entries per lesson.');
}

migrate()
  .catch((error) => {
    console.error('Note migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
