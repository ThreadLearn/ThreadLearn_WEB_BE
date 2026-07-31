/**
 * Idempotent migration: chỉ tạo collection/index cho tính năng question bank.
 * Không chuyển hay xóa mảng Quiz.questions legacy; rollout có thể bật theo từng lesson.
 */
import { connectToDatabase } from '../../configs/db';
import mongoose from 'mongoose';
import { QuizBankImport } from '../../modules/quiz/infrastructure/persistence/schemas/quiz-bank-import.schema';
import { QuizBankQuestion, QuizQuestionBank } from '../../modules/quiz/infrastructure/persistence/schemas/quiz-question-bank.schema';
import { QuizSession } from '../../modules/quiz-attempts/infrastructure/persistence/schemas/quiz-session.schema';
import { QuizAttempt } from '../../modules/quiz-attempts/infrastructure/persistence/schemas/quiz-attempt.schema';

/**
 * The unique partial index is intentionally introduced after reconciling old
 * duplicate sessions.  We retain the newest session and mark only older
 * in-progress snapshots abandoned, so an existing learner can still resume.
 */
async function reconcileDuplicateActiveSessions() {
  const duplicates = await QuizSession.aggregate<{ _id: { userId: unknown; quizId: unknown }; ids: mongoose.Types.ObjectId[] }>([
    { $match: { status: 'in_progress' } },
    { $sort: { startedAt: -1, _id: -1 } },
    { $group: { _id: { userId: '$userId', quizId: '$quizId' }, ids: { $push: '$_id' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]).exec();
  await Promise.all(duplicates.map(({ ids }) => QuizSession.updateMany(
    { _id: { $in: ids.slice(1) }, status: 'in_progress' },
    { $set: { status: 'abandoned' } },
  ).exec()));
}

async function migrate() {
  await connectToDatabase();
  await Promise.all([
    QuizQuestionBank.createCollection().catch((error: any) => { if (error?.codeName !== 'NamespaceExists') throw error; }),
    QuizBankQuestion.createCollection().catch((error: any) => { if (error?.codeName !== 'NamespaceExists') throw error; }),
    QuizBankImport.createCollection().catch((error: any) => { if (error?.codeName !== 'NamespaceExists') throw error; }),
    QuizSession.createCollection().catch((error: any) => { if (error?.codeName !== 'NamespaceExists') throw error; }),
  ]);
  await reconcileDuplicateActiveSessions();
  await Promise.all([
    // createIndexes never drops an existing index; syncIndexes can and must
    // not be used on a production collection.
    QuizQuestionBank.createIndexes(),
    QuizBankQuestion.createIndexes(),
    QuizBankImport.createIndexes(),
    QuizSession.createIndexes(),
    QuizAttempt.createIndexes(),
  ]);
  console.log('Quiz question-bank collections and indexes are ready.');
}

migrate().catch((error) => {
  console.error('Quiz question-bank migration failed:', error);
  process.exitCode = 1;
});
