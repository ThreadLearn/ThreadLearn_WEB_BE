import { execFileSync } from 'child_process';
import path from 'path';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

jest.setTimeout(180_000);

describe('contextual discussion migration', () => {
  let replica: MongoMemoryServer;
  const rootId = new Types.ObjectId();
  const replyId = new Types.ObjectId();
  const shareId = new Types.ObjectId();
  const executionId = new Types.ObjectId();
  const userId = new Types.ObjectId();

  beforeAll(async () => {
    replica = await MongoMemoryServer.create({ instance: { storageEngine: 'wiredTiger' } });
    await mongoose.disconnect();
    await mongoose.connect(replica.getUri('contextual_migration_staging'));
    const db = mongoose.connection.db!;
    await db.collection('comments').insertMany([
      {
        _id: rootId, targetType: 'LESSON', targetId: new Types.ObjectId(), userId,
        parentId: null, status: 'active', postType: 'CODE_HELP', questionStatus: 'SOLVED',
        acceptedReplyId: replyId, codeShareId: shareId, replyCount: 99,
      },
      {
        _id: replyId, targetType: 'LESSON', targetId: new Types.ObjectId(), userId,
        parentId: rootId, status: 'deleted', postType: 'CODE_SOLUTION', questionStatus: 'OPEN',
      },
      {
        _id: new Types.ObjectId(), targetType: 'LESSON', targetId: new Types.ObjectId(), userId,
        parentId: null, status: 'active', postType: 'GENERAL', questionStatus: 'OPEN',
      },
    ]);
    await db.collection('codeshares').insertOne({
      _id: shareId, courseId: new Types.ObjectId(), lessonId: new Types.ObjectId(),
      exerciseId: 'exercise-1', sourceExecutionId: executionId,
    });
    await db.collection('codeshares').createIndex(
      { sourceExecutionId: 1 },
      { unique: true, name: 'sourceExecutionId_1' },
    );
    await db.collection('codeexecutions').insertOne({ _id: new Types.ObjectId(), judge0Token: 'legacy-provider-token' });
    await db.collection('users').insertOne({ _id: userId, email: 'learner@staging.test' });
    await db.collection('notes').insertMany([
      { _id: new Types.ObjectId(), userId, sourceCodeShareId: shareId, noteText: 'one' },
      { _id: new Types.ObjectId(), userId, sourceCodeShareId: shareId, noteText: 'two' },
    ]);
    await db.collection('notifications').insertMany([
      { _id: new Types.ObjectId(), userId, type: 'CODE_SOLUTION_ACCEPTED', metadata: { discussionId: String(rootId), replyId: String(replyId) } },
      { _id: new Types.ObjectId(), userId, type: 'CODE_SOLUTION_ACCEPTED', metadata: { discussionId: String(rootId), replyId: String(replyId) } },
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replica.stop();
  });

  const run = (mode: '--dry-run' | '--apply') => execFileSync(
    process.execPath,
    ['-r', 'ts-node/register', path.resolve('src/database/migrations/contextual-discussion-production-readiness.ts'), mode],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        DATABASE_URL: replica.getUri('contextual_migration_staging'),
        MONGODB_USER: '', MONGODB_PASSWORD: '', MONGODB_HOST: '', MONGODB_DATABASE: '',
      },
    },
  );

  it('is dry-run by default, applies safely, verifies, and is idempotent', async () => {
    const dryRun = run('--dry-run');
    expect(dryRun).toContain('"codeExecutionsWithProviderToken":1');
    expect(await mongoose.connection.db!.collection('codeexecutions').countDocuments({ judge0Token: { $exists: true } })).toBe(1);

    const firstApply = run('--apply');
    expect(firstApply).toContain('verification');
    const db = mongoose.connection.db!;
    expect(await db.collection('codeexecutions').countDocuments({ judge0Token: { $exists: true } })).toBe(0);
    expect((await db.collection('users').findOne({ _id: userId }))?.tokenVersion).toBe(0);
    const root = await db.collection('comments').findOne({ _id: rootId });
    expect(root?.questionStatus).toBe('OPEN');
    expect(root?.acceptedReplyId).toBeUndefined();
    expect(root?.replyCount).toBe(0);
    expect(await db.collection('comments').countDocuments({ questionStatus: { $exists: true }, $or: [{ parentId: { $ne: null } }, { postType: 'GENERAL' }] })).toBe(0);
    expect(await db.collection('notes').countDocuments({ userId, sourceCodeShareId: shareId })).toBe(1);
    expect(await db.collection('notifications').countDocuments({ userId, eventKey: `accepted:${rootId}:${replyId}` })).toBe(1);
    const shareIndexes = await db.collection('codeshares').indexes();
    expect(shareIndexes.some((index) => index.name === 'sourceExecutionId_1')).toBe(false);
    expect(shareIndexes.some((index) => index.name === 'codeshare_execution_room_unique')).toBe(true);
    expect((await db.collection('comments').indexes()).some(
      (index) => index.name === 'discussion_room_posttype_status_created',
    )).toBe(true);
    const requiredIndexes = [
      ['comments', 'discussion_replies_status_created'],
      ['codeexecutions', 'execution_user_lesson_exercise_created'],
      ['codeshares', 'codeshare_room_lesson_created'],
      ['discussionreports', 'moderation_queue_status_created'],
      ['notifications', 'notification_user_unread_created'],
      ['notifications', 'notification_user_event_unique'],
      ['notes', 'note_user_codeshare_unique'],
    ] as const;
    for (const [collection, indexName] of requiredIndexes) {
      expect((await db.collection(collection).indexes()).some((index) => index.name === indexName)).toBe(true);
    }
    const replyPlan = await db.collection('comments')
      .find({ parentId: rootId, status: 'active' })
      .hint('discussion_replies_status_created')
      .explain('executionStats');
    const executionPlan = await db.collection('codeexecutions')
      .find({ userId, lessonId: new Types.ObjectId(), exerciseId: 'exercise-1' })
      .hint('execution_user_lesson_exercise_created')
      .explain('executionStats');
    expect(JSON.stringify(replyPlan)).toContain('IXSCAN');
    expect(JSON.stringify(executionPlan)).toContain('IXSCAN');

    expect(() => run('--apply')).not.toThrow();
  });
});
