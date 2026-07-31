import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { ForbiddenError } from '../../../../common/custom-error';
import { LearningAccessService } from '../../../../shared/application/learning-access/learning-access.service';
import { MongoLearningAccessDataAdapter } from '../../../../shared/infrastructure/persistence/mongo-learning-access-data.adapter';
import { User } from '../../../auth/models/user.model';
import { CodeExecution } from '../../../code-execution/models/code-execution.model';
import { CodeShareService } from '../../../code-share/application/services/code-share.service';
import { CodeShare } from '../../../code-share/models/code-share.model';
import { Course } from '../../../courses/models/course.model';
import { Enrollment } from '../../../enrollments/models/enrollment.model';
import { Lesson } from '../../../lessons/models/lesson.model';
import { CreateNoteFromCodeShareService } from '../../../notes/application/services/create-note-from-code-share.service';
import { Note } from '../../../notes/models/note.model';
import { Notification } from '../../../notifications/models/notification.model';
import { MongoCommentRepository } from '../../infrastructure/persistence/mongo-comment.repository';
import { Comment } from '../../models/comment.model';
import { CreateCommentService } from './create-comment.service';
import { DeleteCommentService } from './delete-comment.service';
import { ListCommentsService } from './list-comments.service';
import { ManageDiscussionService } from './manage-discussion.service';

jest.setTimeout(180_000);

describe('Contextual Code Discussion isolated A/B/C flow', () => {
  let replica: MongoMemoryReplSet;
  let access: LearningAccessService;
  let shares: CodeShareService;
  let comments: MongoCommentRepository;
  let createComment: CreateCommentService;
  let listComments: ListCommentsService;
  let manage: ManageDiscussionService;
  let removeComment: DeleteCommentService;
  let saveNote: CreateNoteFromCodeShareService;
  let ids: Record<string, string>;

  beforeAll(async () => {
    replica = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
    await mongoose.disconnect();
    await mongoose.connect(replica.getUri('threadlearn_contextual_staging'));
    await Promise.all([
      User.syncIndexes(), Course.syncIndexes(), Lesson.syncIndexes(), Enrollment.syncIndexes(),
      CodeExecution.syncIndexes(), CodeShare.syncIndexes(), Comment.syncIndexes(),
      Note.syncIndexes(), Notification.syncIndexes(),
    ]);
    const users = await User.create([
      { email: 'a@staging.test', firstName: 'Learner', lastName: 'A', role: 'STUDENT', isVerified: true, isActive: true },
      { email: 'b@staging.test', firstName: 'Learner', lastName: 'B', role: 'STUDENT', isVerified: true, isActive: true },
      { email: 'c@staging.test', firstName: 'Learner', lastName: 'C', role: 'STUDENT', isVerified: true, isActive: true },
      { email: 'instructor@staging.test', firstName: 'Course', lastName: 'Instructor', role: 'STUDENT', isVerified: true, isActive: true },
    ]);
    const [a, b, c, instructor] = users;
    const course = await Course.create({
      title: 'Staging Course', slug: `staging-${Date.now()}`, description: 'Isolated test',
      language: 'python', status: 'published', instructorId: instructor._id,
    });
    const [lesson1, lesson2] = await Lesson.create([
      { courseId: course._id, title: 'Lesson 1', lessonType: 'coding', orderIndex: 1, status: 'active' },
      { courseId: course._id, title: 'Lesson 2', lessonType: 'coding', orderIndex: 2, status: 'active' },
    ]);
    await Enrollment.create([
      { userId: a._id, courseId: course._id },
      { userId: b._id, courseId: course._id },
    ]);
    const [runA, runB, runBWrongExercise, runBWrongLesson] = await CodeExecution.create([
      { userId: a._id, courseId: course._id, lessonId: lesson1._id, exerciseId: 'exercise-1', sourceCode: 'print("A")', language: 'python', languageId: 71, status: 'Accepted', stdout: 'A' },
      { userId: b._id, courseId: course._id, lessonId: lesson1._id, exerciseId: 'exercise-1', sourceCode: 'print("B solution")', language: 'python', languageId: 71, status: 'Accepted', stdout: 'B solution' },
      { userId: b._id, courseId: course._id, lessonId: lesson1._id, exerciseId: 'exercise-2', sourceCode: 'print("wrong exercise")', language: 'python', languageId: 71, status: 'Accepted' },
      { userId: b._id, courseId: course._id, lessonId: lesson2._id, exerciseId: 'exercise-1', sourceCode: 'print("wrong lesson")', language: 'python', languageId: 71, status: 'Accepted' },
    ]);
    ids = Object.fromEntries(Object.entries({ a, b, c, instructor, course, lesson1, lesson2, runA, runB, runBWrongExercise, runBWrongLesson })
      .map(([key, value]) => [key, String((value as any)._id)]));
    access = new LearningAccessService(new MongoLearningAccessDataAdapter());
    shares = new CodeShareService(access);
    comments = new MongoCommentRepository();
    createComment = new CreateCommentService(comments, access, shares);
    listComments = new ListCommentsService(comments, access);
    manage = new ManageDiscussionService(access);
    removeComment = new DeleteCommentService(comments, access);
    saveNote = new CreateNoteFromCodeShareService(shares);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replica.stop();
  });

  it('completes A question -> B solution -> note -> one accepted solution -> reopen after deletion', async () => {
    const shareA: any = await shares.createFromExecution(ids.a, 'STUDENT', {
      sourceExecutionId: ids.runA, targetType: 'LESSON', targetId: ids.lesson1, visibility: 'COURSE',
    });
    const root: any = await createComment.execute(ids.a, 'STUDENT', {
      targetType: 'LESSON', targetId: ids.lesson1, postType: 'CODE_HELP', codeShareId: shareA._id,
      content: 'Why does this output differ?', learningContext: {
        expectedResult: 'Expected A', actualResult: 'Received another value', tried: 'Ran exercise 1',
      },
    });
    expect(root).toMatchObject({ isOwner: true, exerciseId: 'exercise-1', questionStatus: 'OPEN' });

    await expect(listComments.execute(ids.c, 'STUDENT', 'LESSON', ids.lesson1)).rejects.toBeInstanceOf(ForbiddenError);
    const visibleToB: any = await shares.getVisible(ids.b, 'STUDENT', shareA._id);
    expect(visibleToB.sourceCode).toBe('print("A")');

    const shareB: any = await shares.createFromExecution(ids.b, 'STUDENT', {
      sourceExecutionId: ids.runB, targetType: 'LESSON', targetId: ids.lesson1, visibility: 'COURSE',
    });
    const reply: any = await createComment.execute(ids.b, 'STUDENT', {
      targetType: 'LESSON', targetId: ids.lesson1, parentId: root.id,
      postType: 'CODE_SOLUTION', codeShareId: shareB._id, content: 'Use this verified solution.',
    });
    const note: any = await saveNote.execute(ids.a, 'STUDENT', { codeShareId: shareB._id, lessonId: ids.lesson1 });
    expect(note.sourceLink).toContain(`discussion=${root.id}`);
    expect(await Note.countDocuments({ userId: ids.a, sourceCodeShareId: shareB._id })).toBe(1);
    await saveNote.execute(ids.a, 'STUDENT', { codeShareId: shareB._id, lessonId: ids.lesson1 });
    expect(await Note.countDocuments({ userId: ids.a, sourceCodeShareId: shareB._id })).toBe(1);

    const accepted = await Promise.allSettled([
      manage.accept(ids.a, 'STUDENT', root.id, reply.id),
      manage.accept(ids.a, 'STUDENT', root.id, reply.id),
    ]);
    expect(accepted.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(await Notification.countDocuments({ userId: ids.b, eventKey: `accepted:${root.id}:${reply.id}` })).toBe(1);

    await removeComment.execute(ids.b, 'STUDENT', reply.id);
    const reopened = await Comment.findById(root.id).lean();
    expect(reopened?.questionStatus).toBe('OPEN');
    expect(reopened?.acceptedReplyId).toBeUndefined();
  });

  it('rejects ownership and immutable-context attacks', async () => {
    await expect(shares.createFromExecution(ids.b, 'STUDENT', {
      sourceExecutionId: ids.runA, targetType: 'LESSON', targetId: ids.lesson1, visibility: 'COURSE',
    })).rejects.toThrow('Code execution not found.');

    const roots: any = await listComments.execute(ids.a, 'STUDENT', 'LESSON', ids.lesson1);
    const root = roots.data[0];
    for (const executionId of [ids.runBWrongExercise, ids.runBWrongLesson]) {
      const targetId = executionId === ids.runBWrongLesson ? ids.lesson2 : ids.lesson1;
      const share: any = await shares.createFromExecution(ids.b, 'STUDENT', {
        sourceExecutionId: executionId, targetType: 'LESSON', targetId, visibility: 'COURSE',
      });
      await expect(createComment.execute(ids.b, 'STUDENT', {
        targetType: 'LESSON', targetId: ids.lesson1, parentId: root.id,
        postType: 'CODE_SOLUTION', codeShareId: share._id, content: 'Mismatched solution',
      })).rejects.toThrow();
    }
  });

  it('allows only the assigned instructor to access the course without enrollment', async () => {
    await expect(access.assertLessonInteractionAccess(ids.lesson1, { id: ids.instructor, role: 'STUDENT' }))
      .resolves.toMatchObject({ id: ids.lesson1 });
    await expect(access.assertLessonInteractionAccess(ids.lesson1, { id: ids.c, role: 'STUDENT' }))
      .rejects.toBeInstanceOf(ForbiddenError);
  });

  it('stores no provider token in the isolated database', async () => {
    expect(await mongoose.connection.collection('codeexecutions').countDocuments({ judge0Token: { $exists: true } })).toBe(0);
  });

  it('rolls back accepted state when the notification cannot be persisted', async () => {
    const share = await CodeShare.findOne({ authorId: ids.b, lessonId: ids.lesson1 }).lean();
    const root = await Comment.create({
      targetType: 'LESSON', targetId: ids.lesson1, lessonId: ids.lesson1, courseId: ids.course,
      exerciseId: 'exercise-1', userId: ids.a, parentId: null, content: 'Atomic acceptance',
      status: 'active', postType: 'CODE_HELP', questionStatus: 'OPEN',
    });
    const reply = await Comment.create({
      targetType: 'LESSON', targetId: ids.lesson1, lessonId: ids.lesson1, courseId: ids.course,
      exerciseId: 'exercise-1', userId: ids.b, parentId: root._id, content: 'Atomic solution',
      status: 'active', postType: 'CODE_SOLUTION', codeShareId: share!._id,
    });
    const create = jest.spyOn(Notification, 'create').mockRejectedValueOnce(new Error('notification storage failed'));
    await expect(manage.accept(ids.a, 'STUDENT', String(root._id), String(reply._id))).rejects.toThrow('notification storage failed');
    create.mockRestore();
    const unchanged = await Comment.findById(root._id).lean();
    expect(unchanged?.questionStatus).toBe('OPEN');
    expect(unchanged?.acceptedReplyId).toBeUndefined();
  });
});
