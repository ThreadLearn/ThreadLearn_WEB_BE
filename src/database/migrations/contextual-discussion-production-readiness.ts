import mongoose from 'mongoose';
import { env } from '../../configs/env';

const MIGRATION_ID = '2026-07-contextual-discussion-production-readiness-v1';
const apply = process.argv.includes('--apply');
const dryRun = process.argv.includes('--dry-run') || !apply;

const log = (label: string, value: unknown) => {
  // Counts and identifiers only. Never log comment/code/note content.
  console.log(`[${MIGRATION_ID}] ${label}: ${JSON.stringify(value)}`);
};

async function snapshot(collection: string, documents: any[]) {
  if (!documents.length) return;
  const backups = mongoose.connection.collection('contextualdiscussionmigrationbackups');
  await backups.bulkWrite(documents.map((document) => ({
    updateOne: {
      filter: { migrationId: MIGRATION_ID, collection, documentId: document._id },
      update: {
        $setOnInsert: {
          migrationId: MIGRATION_ID,
          collection,
          documentId: document._id,
          preimage: document,
          createdAt: new Date(),
        },
      },
      upsert: true,
    },
  })), { ordered: false });
}

async function run() {
  await mongoose.connect(env.DATABASE_URL);
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB connection is not ready.');
  const databaseName = db.databaseName.toLowerCase();
  if (apply && (env.NODE_ENV === 'production' || databaseName === 'threadlearn')) {
    throw new Error('Refusing --apply on production. Restore a staging snapshot with a non-production database name.');
  }

  const comments = db.collection('comments');
  const shares = db.collection('codeshares');
  const executions = db.collection('codeexecutions');
  const reactions = db.collection('discussionreactions');
  const notes = db.collection('notes');
  const notifications = db.collection('notifications');
  const courses = db.collection('courses');
  const users = db.collection('users');

  const codeShareIndexes = await shares.indexes().catch(() => []);
  const legacyExecutionUniqueIndex = codeShareIndexes.find((index) =>
    index.unique === true
    && Object.keys(index.key).length === 1
    && index.key.sourceExecutionId === 1,
  );
  const courseIndexes = await courses.indexes().catch(() => []);
  const legacyCourseTextIndex = courseIndexes.find((index) =>
    Object.values(index.key).some((value) => value === 'text')
    && index.language_override === 'language',
  );

  const invalidAccepted = await comments.aggregate([
    { $match: { parentId: null, acceptedReplyId: { $exists: true } } },
    { $lookup: { from: 'comments', localField: 'acceptedReplyId', foreignField: '_id', as: 'accepted' } },
    { $set: { accepted: { $first: '$accepted' } } },
    { $match: { $or: [
      { accepted: null },
      { 'accepted.status': { $ne: 'active' } },
      { 'accepted.postType': { $ne: 'CODE_SOLUTION' } },
    ] } },
    { $project: { _id: 1, acceptedReplyId: 1, questionStatus: 1 } },
  ]).toArray();
  const invalidQuestionStatus = await comments.find({
    questionStatus: { $exists: true },
    $or: [{ parentId: { $ne: null } }, { postType: 'GENERAL' }],
  }).project({ _id: 1, questionStatus: 1 }).toArray();
  const tokenCount = await executions.countDocuments({ judge0Token: { $exists: true } });
  const missingTokenVersion = await users.countDocuments({ tokenVersion: { $exists: false } });
  const missingContext = await comments.find({ codeShareId: { $exists: true }, $or: [
    { lessonId: { $exists: false } }, { courseId: { $exists: false } },
  ] }).project({ _id: 1, codeShareId: 1, courseId: 1, lessonId: 1, exerciseId: 1, lessonVersionId: 1 }).toArray();
  const duplicateNotes = await notes.aggregate([
    { $match: { sourceCodeShareId: { $exists: true } } },
    { $group: { _id: { userId: '$userId', sourceCodeShareId: '$sourceCodeShareId' }, ids: { $push: '$_id' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]).toArray();

  const counts = {
    invalidAccepted: invalidAccepted.length,
    invalidQuestionStatus: invalidQuestionStatus.length,
    codeExecutionsWithProviderToken: tokenCount,
    usersMissingTokenVersion: missingTokenVersion,
    commentsMissingCodeContext: missingContext.length,
    duplicateNoteGroups: duplicateNotes.length,
    legacyGlobalCodeShareIndex: legacyExecutionUniqueIndex ? 1 : 0,
    legacyCourseTextIndex: legacyCourseTextIndex ? 1 : 0,
  };
  log(dryRun ? 'dry-run' : 'apply-plan', counts);
  if (dryRun) return;

  await snapshot('comments', [
    ...await comments.find({ _id: { $in: invalidAccepted.map((item) => item._id) } }).toArray(),
    ...await comments.find({ _id: { $in: invalidQuestionStatus.map((item) => item._id) } }).toArray(),
    ...await comments.find({ _id: { $in: missingContext.map((item) => item._id) } }).toArray(),
  ]);

  if (invalidAccepted.length) {
    await comments.updateMany(
      { _id: { $in: invalidAccepted.map((item) => item._id) } },
      { $unset: { acceptedReplyId: '' }, $set: { questionStatus: 'OPEN' } },
    );
  }
  if (invalidQuestionStatus.length) {
    await comments.updateMany(
      { _id: { $in: invalidQuestionStatus.map((item) => item._id) } },
      { $unset: { questionStatus: '' } },
    );
  }
  if (tokenCount) await executions.updateMany({ judge0Token: { $exists: true } }, { $unset: { judge0Token: '' } });
  if (missingTokenVersion) await users.updateMany({ tokenVersion: { $exists: false } }, { $set: { tokenVersion: 0 } });

  for (const item of missingContext) {
    const share = await shares.findOne({ _id: item.codeShareId }, { projection: { courseId: 1, lessonId: 1, exerciseId: 1, lessonVersionId: 1 } });
    if (!share?.lessonId || !share?.courseId) continue;
    await comments.updateOne({ _id: item._id }, { $set: {
      courseId: share.courseId,
      lessonId: share.lessonId,
      ...(share.exerciseId ? { exerciseId: share.exerciseId } : {}),
      ...(share.lessonVersionId ? { lessonVersionId: share.lessonVersionId } : {}),
    } });
  }

  const replyCounts = await comments.aggregate([
    { $match: { parentId: { $ne: null }, status: 'active' } },
    { $group: { _id: '$parentId', count: { $sum: 1 } } },
  ]).toArray();
  await comments.updateMany({ parentId: null }, { $set: { replyCount: 0 } });
  if (replyCounts.length) await comments.bulkWrite(replyCounts.map((row) => ({
    updateOne: { filter: { _id: row._id }, update: { $set: { replyCount: row.count } } },
  })));

  const helpfulCounts = await reactions.aggregate([
    { $match: { type: 'HELPFUL' } },
    { $group: { _id: '$commentId', count: { $sum: 1 } } },
  ]).toArray();
  await comments.updateMany({}, { $set: { helpfulCount: 0, reactionCount: 0 } });
  if (helpfulCounts.length) await comments.bulkWrite(helpfulCounts.map((row) => ({
    updateOne: { filter: { _id: row._id }, update: { $set: { helpfulCount: row.count, reactionCount: row.count } } },
  })));

  for (const group of duplicateNotes) {
    const duplicateIds = group.ids.slice(1);
    const duplicateDocuments = await notes.find({ _id: { $in: duplicateIds } }).toArray();
    await snapshot('notes', duplicateDocuments);
    await notes.deleteMany({ _id: { $in: duplicateIds } });
  }

  const missingEventKeys = await notifications.find({
    eventKey: { $exists: false },
    type: { $in: ['CODE_SOLUTION_ACCEPTED', 'CODE_SOLUTION_SUBMITTED', 'DISCUSSION_REPLY'] },
  }).project({ _id: 1, userId: 1, type: 1, metadata: 1 }).toArray();
  await snapshot('notifications', missingEventKeys);
  for (const notification of missingEventKeys) {
    const metadata = notification.metadata ?? {};
    const eventKey = notification.type === 'CODE_SOLUTION_ACCEPTED'
      ? `accepted:${metadata.discussionId}:${metadata.replyId}`
      : `discussion-reply:${metadata.commentId}`;
    if (!eventKey.includes('undefined')) {
      const alreadyAssigned = await notifications.findOne({
        userId: notification.userId,
        eventKey,
        _id: { $ne: notification._id },
      }, { projection: { _id: 1 } });
      if (!alreadyAssigned) {
        await notifications.updateOne({ _id: notification._id }, { $set: { eventKey } });
      }
    }
  }
  const duplicateEvents = await notifications.aggregate([
    { $match: { eventKey: { $type: 'string' } } },
    { $sort: { createdAt: 1 } },
    { $group: { _id: { userId: '$userId', eventKey: '$eventKey' }, ids: { $push: '$_id' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]).toArray();
  for (const group of duplicateEvents) {
    const duplicateIds = group.ids.slice(1);
    await snapshot('notifications', await notifications.find({ _id: { $in: duplicateIds } }).toArray());
    await notifications.updateMany({ _id: { $in: duplicateIds } }, { $unset: { eventKey: '' } });
  }

  if (legacyExecutionUniqueIndex?.name) await shares.dropIndex(legacyExecutionUniqueIndex.name);
  if (legacyCourseTextIndex?.name) {
    await courses.dropIndex(legacyCourseTextIndex.name);
    await courses.createIndex(
      { title: 'text' },
      { name: 'course_title_text', language_override: 'textSearchLanguage' },
    );
  }

  const createIndexes = [
    () => notifications.createIndex({ userId: 1, eventKey: 1 }, { unique: true, sparse: true, name: 'notification_user_event_unique' }),
    () => notes.createIndex({ userId: 1, sourceCodeShareId: 1 }, { unique: true, partialFilterExpression: { sourceCodeShareId: { $type: 'objectId' } }, name: 'note_user_codeshare_unique' }),
    () => db.collection('discussionreports').createIndex({ status: 1, reason: 1, createdAt: -1 }, { name: 'moderation_queue_status_reason_created' }),
    () => shares.createIndex(
      { sourceExecutionId: 1, targetType: 1, targetId: 1 },
      { unique: true, name: 'codeshare_execution_room_unique' },
    ),
    () => comments.createIndex(
      { targetType: 1, targetId: 1, parentId: 1, postType: 1, questionStatus: 1, createdAt: -1 },
      { name: 'discussion_room_posttype_status_created' },
    ),
    () => comments.createIndex(
      { parentId: 1, status: 1, createdAt: -1 },
      { name: 'discussion_replies_status_created' },
    ),
    () => executions.createIndex(
      { userId: 1, lessonId: 1, exerciseId: 1, createdAt: -1 },
      { name: 'execution_user_lesson_exercise_created' },
    ),
    () => shares.createIndex(
      { targetType: 1, targetId: 1, lessonId: 1, createdAt: -1 },
      { name: 'codeshare_room_lesson_created' },
    ),
    () => db.collection('discussionreports').createIndex(
      { status: 1, createdAt: -1 },
      { name: 'moderation_queue_status_created' },
    ),
    () => notifications.createIndex(
      { userId: 1, isRead: 1, createdAt: -1 },
      { name: 'notification_user_unread_created' },
    ),
  ];
  for (const createIndex of createIndexes) await createIndex();

  const verification = {
    invalidAccepted: await comments.countDocuments({ _id: { $in: invalidAccepted.map((item) => item._id) }, acceptedReplyId: { $exists: true } }),
    invalidQuestionStatus: await comments.countDocuments({ questionStatus: { $exists: true }, $or: [{ parentId: { $ne: null } }, { postType: 'GENERAL' }] }),
    providerTokens: await executions.countDocuments({ judge0Token: { $exists: true } }),
    missingTokenVersion: await users.countDocuments({ tokenVersion: { $exists: false } }),
    legacyGlobalCodeShareIndex: (await shares.indexes()).some((index) =>
      index.unique === true
      && Object.keys(index.key).length === 1
      && index.key.sourceExecutionId === 1,
    ) ? 1 : 0,
    legacyCourseTextIndex: (await courses.indexes().catch(() => [])).some((index) =>
      Object.values(index.key).some((value) => value === 'text')
      && index.language_override === 'language',
    ) ? 1 : 0,
  };
  log('verification', verification);
  if (Object.values(verification).some(Boolean)) throw new Error('Migration verification failed.');
}

run()
  .catch((error) => {
    console.error(`[${MIGRATION_ID}] failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());

/*
Rollback (staging only): restore preimage documents from
contextualdiscussionmigrationbackups for this migrationId, then drop only the
the named indexes created above. If legacy indexes were replaced, recreate
them only when an application rollback requires their old behavior. Provider tokens are intentionally not
restored because they are sensitive transient provider data. Take a database
snapshot before --apply; restoring that snapshot is the authoritative rollback.
*/
