import mongoose from 'mongoose';
import connectToDatabase from '../configs/db';
import { logger } from '../configs/logger';
import {
  User,
  UserStats,
  Course,
  Section,
  CourseReview,
  Lesson,
  LessonVersion,
  Enrollment,
  LessonProgress,
  Comment,
  Bookmark,
  Note,
  CodeExecution,
  Exercise,
  Certificate,
  Quiz,
  QuizAttempt,
  AIHistory,
  Notification,
  XpAwardLog,
  SubscriptionPlan,
  UserSubscription,
  SubscriptionPurchase,
  RefreshToken,
  EmailVerificationToken,
  PasswordResetToken,
} from './models';
import { hashPassword } from '../utils';
import { calculateLevel } from '../modules/gamification/domain/services/level-calculator';
import {
  CURRICULUM,
  countCurriculum,
  daysAgo,
  daysFromNow,
  hoursAgo,
  avatar,
  thumb,
  SeedCourse,
  SeedLesson,
} from './seed-data';

type LeanLesson = {
  _id: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  slug?: string;
  title: string;
  orderIndex: number;
  def: SeedLesson;
};

/**
 * Full-curriculum seed — Concurrent Programming (JS + Java).
 * Run: `npm run db:seed`
 * ⚠️ Wipes seedable collections. Dev/demo only.
 */
async function seed() {
  try {
    const stats = countCurriculum();
    logger.info('🚀 ThreadLearn COMPLETE curriculum seed (syllabus → full bodies → DB)...');
    logger.info(
      `📚 Plan: ${stats.courses} courses | ${stats.sections} sections | ${stats.lessons} lessons | ${stats.quizzes} quizzes | ${stats.exercises} exercises`,
    );
    logger.info(
      `📝 Content: avg ${stats.avgCharsPerLesson} chars/lesson | thin(<800 non-quiz)=${stats.thinNonQuizLessons}`,
    );
    logger.info(`📋 Syllabus:\n${stats.syllabusLines}`);

    await connectToDatabase();
    logger.info('🔌 Connected to MongoDB.');

    // ── 1. WIPE ─────────────────────────────────────────────────
    logger.info('🗑️  Wiping collections...');
    await Promise.all([
      User.deleteMany({}),
      UserStats.deleteMany({}),
      Course.deleteMany({}),
      Section.deleteMany({}),
      CourseReview.deleteMany({}),
      Lesson.deleteMany({}),
      LessonVersion.deleteMany({}),
      Enrollment.deleteMany({}),
      LessonProgress.deleteMany({}),
      Comment.deleteMany({}),
      Bookmark.deleteMany({}),
      Note.deleteMany({}),
      CodeExecution.deleteMany({}),
      Exercise.deleteMany({}),
      Certificate.deleteMany({}),
      Quiz.deleteMany({}),
      QuizAttempt.deleteMany({}),
      XpAwardLog.deleteMany({}),
      AIHistory.deleteMany({}),
      Notification.deleteMany({}),
      SubscriptionPlan.deleteMany({}),
      UserSubscription.deleteMany({}),
      SubscriptionPurchase.deleteMany({}),
      RefreshToken.deleteMany({}),
      EmailVerificationToken.deleteMany({}),
      PasswordResetToken.deleteMany({}),
    ]);
    logger.info('✅ Cleared.');

    // ── 2. USERS ────────────────────────────────────────────────
    logger.info('👤 Users...');
    const adminHash = await hashPassword('Admin@123');
    const studentHash = await hashPassword('Student@123');

    const users = await User.create([
      {
        email: 'admin@threadlearn.com',
        passwordHash: adminHash,
        firstName: 'System',
        lastName: 'Admin',
        role: 'ADMIN',
        planType: 'PREMIUM',
        subscriptionExpiresAt: daysFromNow(365),
        isVerified: true,
        emailVerifiedAt: daysAgo(200),
        isActive: true,
        avatarUrl: avatar('SystemAdmin'),
        lastLoginAt: daysAgo(0),
      },
      {
        email: 'instructor@threadlearn.com',
        passwordHash: adminHash,
        firstName: 'Lan',
        lastName: 'Nguyen',
        role: 'INSTRUCTOR',
        planType: 'PREMIUM',
        subscriptionExpiresAt: daysFromNow(365),
        isVerified: true,
        emailVerifiedAt: daysAgo(180),
        isActive: true,
        avatarUrl: avatar('LanNguyen'),
        lastLoginAt: daysAgo(1),
      },
      {
        email: 'student@threadlearn.com',
        passwordHash: studentHash,
        firstName: 'Minh',
        lastName: 'Tran',
        role: 'STUDENT',
        planType: 'PREMIUM',
        subscriptionExpiresAt: daysFromNow(170),
        isVerified: true,
        emailVerifiedAt: daysAgo(60),
        isActive: true,
        avatarUrl: avatar('MinhTran'),
        lastLoginAt: hoursAgo(2),
      },
      {
        email: 'bob@threadlearn.com',
        passwordHash: studentHash,
        firstName: 'Bob',
        lastName: 'Learner',
        role: 'STUDENT',
        planType: 'FREE',
        isVerified: true,
        emailVerifiedAt: daysAgo(30),
        isActive: true,
        avatarUrl: avatar('BobLearner'),
        lastLoginAt: daysAgo(1),
      },
      {
        email: 'alice@threadlearn.com',
        passwordHash: studentHash,
        firstName: 'Alice',
        lastName: 'Coder',
        role: 'STUDENT',
        planType: 'FREE',
        isVerified: false,
        isActive: true,
        avatarUrl: avatar('AliceCoder'),
      },
      {
        email: 'huy@threadlearn.com',
        passwordHash: studentHash,
        firstName: 'Huy',
        lastName: 'Pham',
        role: 'STUDENT',
        planType: 'FREE',
        isVerified: true,
        emailVerifiedAt: daysAgo(14),
        isActive: true,
        avatarUrl: avatar('HuyPham'),
        lastLoginAt: daysAgo(2),
      },
      {
        email: 'expired@threadlearn.com',
        passwordHash: studentHash,
        firstName: 'Expired',
        lastName: 'Premium',
        role: 'STUDENT',
        planType: 'PREMIUM',
        subscriptionExpiresAt: daysAgo(5),
        isVerified: true,
        emailVerifiedAt: daysAgo(90),
        isActive: true,
        avatarUrl: avatar('ExpiredPremium'),
        lastLoginAt: daysAgo(4),
      },
      {
        email: 'locked@threadlearn.com',
        passwordHash: studentHash,
        firstName: 'Locked',
        lastName: 'Account',
        role: 'STUDENT',
        planType: 'FREE',
        isVerified: true,
        emailVerifiedAt: daysAgo(40),
        isActive: false,
        lockedAt: daysAgo(3),
        lockedReason: 'Too many failed login attempts (seed demo).',
        failedLoginAttempts: 5,
        lockedUntil: daysFromNow(1),
        avatarUrl: avatar('LockedAccount'),
      },
    ]);
    const [admin, instructor, minh, bob, alice, huy, expiredPremium, lockedUser] = users;
    logger.info(`✅ ${users.length} users`);

    // ── 3. STATS ────────────────────────────────────────────────
    const statsRows = [
      { userId: admin._id, xp: 6200, currentStreak: 15, highestStreak: 40, quizzesCompleted: 12, coursesCompleted: 2, totalLessonsCompleted: 30, lastActiveDate: daysAgo(0) },
      { userId: instructor._id, xp: 9800, currentStreak: 22, highestStreak: 50, quizzesCompleted: 20, coursesCompleted: 3, totalLessonsCompleted: 45, lastActiveDate: daysAgo(1) },
      { userId: minh._id, xp: 3200, currentStreak: 6, highestStreak: 12, quizzesCompleted: 4, coursesCompleted: 1, totalLessonsCompleted: 18, lastActiveDate: hoursAgo(2) },
      { userId: bob._id, xp: 1100, currentStreak: 2, highestStreak: 5, quizzesCompleted: 2, coursesCompleted: 0, totalLessonsCompleted: 8, lastActiveDate: daysAgo(1) },
      { userId: alice._id, xp: 0, currentStreak: 0, highestStreak: 0, quizzesCompleted: 0, coursesCompleted: 0, totalLessonsCompleted: 0, lastActiveDate: daysAgo(7) },
      { userId: huy._id, xp: 1500, currentStreak: 3, highestStreak: 7, quizzesCompleted: 1, coursesCompleted: 0, totalLessonsCompleted: 10, lastActiveDate: daysAgo(2) },
      { userId: expiredPremium._id, xp: 2800, currentStreak: 0, highestStreak: 14, quizzesCompleted: 3, coursesCompleted: 1, totalLessonsCompleted: 16, lastActiveDate: daysAgo(4) },
      { userId: lockedUser._id, xp: 100, currentStreak: 0, highestStreak: 1, quizzesCompleted: 0, coursesCompleted: 0, totalLessonsCompleted: 1, lastActiveDate: daysAgo(10) },
    ].map((s) => ({ ...s, level: calculateLevel(s.xp) }));
    await UserStats.create(statsRows);
    logger.info('✅ UserStats');

    // ── 4. CURRICULUM INSERT ────────────────────────────────────
    logger.info('📚 Inserting full curriculum...');
    const courseBySlug = new Map<string, mongoose.Document & { _id: mongoose.Types.ObjectId }>();
    const lessonsByCourseSlug = new Map<string, LeanLesson[]>();
    const quizByLessonSlug = new Map<string, mongoose.Document & { _id: mongoose.Types.ObjectId }>();
    const exerciseByTitle = new Map<string, mongoose.Document & { _id: mongoose.Types.ObjectId }>();
    let globalLessonOrderHint = 0;

    for (const def of CURRICULUM) {
      const course = await Course.create(mapCourseDoc(def, instructor._id, admin._id));
      courseBySlug.set(def.slug, course as never);

      const courseLessons: LeanLesson[] = [];
      let orderIndex = 0;

      for (let si = 0; si < def.sections.length; si++) {
        const secDef = def.sections[si];
        const section = await Section.create({
          courseId: course._id,
          title: secDef.title,
          description: secDef.description,
          orderIndex: si,
          isPublished: def.status === 'published',
          status: 'active',
        });

        for (const lesDef of secDef.lessons) {
          const lesson = await Lesson.create({
            courseId: course._id,
            sectionId: section._id,
            title: lesDef.title,
            slug: lesDef.slug,
            description: lesDef.description,
            contentMarkdown: lesDef.contentMarkdown,
            content: lesDef.contentMarkdown.slice(0, 280),
            lessonType: lesDef.lessonType,
            videoUrl: lesDef.videoUrl,
            attachments: [],
            codeSnippets: lesDef.codeSnippets ?? [],
            orderIndex,
            order: orderIndex,
            estimatedTime: lesDef.estimatedTime,
            isPreview: Boolean(lesDef.isPreview),
            isLocked: Boolean(lesDef.isLocked),
            status: lesDef.status ?? 'active',
          });

          courseLessons.push({
            _id: lesson._id,
            courseId: course._id,
            slug: lesDef.slug,
            title: lesDef.title,
            orderIndex,
            def: lesDef,
          });
          orderIndex += 1;
          globalLessonOrderHint += 1;

          if (lesDef.quiz) {
            const q = lesDef.quiz;
            const quiz = await Quiz.create({
              lessonId: lesson._id,
              title: q.title,
              description: q.description,
              passingScorePercent: q.passingScorePercent,
              passingScore: q.passingScorePercent,
              timeLimitSeconds: q.timeLimitSeconds,
              timeLimit: q.timeLimitSeconds,
              xpReward: q.xpReward,
              isDeleted: false,
              questions: q.questions,
            });
            quizByLessonSlug.set(lesDef.slug, quiz as never);
          }

          for (const ex of lesDef.exercises ?? []) {
            const created = await Exercise.create({
              lessonId: lesson._id,
              title: ex.title,
              description: ex.description,
              starterCode: ex.starterCode,
              language: ex.language,
              timeLimitMs: ex.timeLimitMs,
              testCases: ex.testCases,
            });
            exerciseByTitle.set(ex.title, created as never);
          }
        }
      }

      await Course.findByIdAndUpdate(course._id, { totalLessons: courseLessons.length });
      lessonsByCourseSlug.set(def.slug, courseLessons);
      logger.info(`  ✓ ${def.slug}: ${def.sections.length} sections, ${courseLessons.length} lessons`);
    }

    // Prerequisites by slug
    for (const def of CURRICULUM) {
      if (!def.prerequisiteSlugs?.length) continue;
      const course = courseBySlug.get(def.slug);
      const prereqIds = def.prerequisiteSlugs
        .map((s) => courseBySlug.get(s)?._id)
        .filter(Boolean);
      await Course.findByIdAndUpdate(course!._id, { prerequisites: prereqIds });
    }

    // Lesson versions (sample history on race + synchronized lessons)
    const raceLesson = lessonsByCourseSlug.get('js-concurrency-fundamentals')?.find((l) =>
      l.slug?.includes('logic-race'),
    );
    if (raceLesson) {
      await LessonVersion.create({
        lessonId: raceLesson._id,
        version: 1,
        contentMarkdown: '# Race Condition v1\n\nBản rút gọn ban đầu.',
        createdBy: instructor._id,
      });
      const v2 = await LessonVersion.create({
        lessonId: raceLesson._id,
        version: 2,
        contentMarkdown: raceLesson.def.contentMarkdown,
        createdBy: instructor._id,
      });
      await Lesson.findByIdAndUpdate(raceLesson._id, { currentVersionId: v2._id });
    }

    const jsFund = courseBySlug.get('js-concurrency-fundamentals')!;
    const javaFund = courseBySlug.get('java-multithreading-foundations')!;
    const jsParallel = courseBySlug.get('parallel-js-workers-shared-memory')!;
    const javaAdv = courseBySlug.get('advanced-concurrent-java-patterns')!;
    const jsLessons = lessonsByCourseSlug.get('js-concurrency-fundamentals')!;
    const javaLessons = lessonsByCourseSlug.get('java-multithreading-foundations')!;
    const parallelLessons = lessonsByCourseSlug.get('parallel-js-workers-shared-memory')!;

    logger.info(`✅ Curriculum inserted (${globalLessonOrderHint} lessons total).`);

    // ── 5. ENROLLMENTS + PROGRESS ───────────────────────────────
    logger.info('🎓 Enrollments & progress...');

    // Minh: completed entire JS fund
    await enrollWithProgress({
      userId: minh._id,
      courseId: jsFund._id,
      lessons: jsLessons,
      completedCount: jsLessons.length,
      enrolledDaysAgo: 45,
    });
    // Minh: 60% Java fund
    await enrollWithProgress({
      userId: minh._id,
      courseId: javaFund._id,
      lessons: javaLessons,
      completedCount: Math.ceil(javaLessons.length * 0.6),
      enrolledDaysAgo: 25,
    });
    // Minh: first 3 parallel lessons
    await enrollWithProgress({
      userId: minh._id,
      courseId: jsParallel._id,
      lessons: parallelLessons,
      completedCount: Math.min(3, parallelLessons.length),
      enrolledDaysAgo: 10,
    });

    // Bob: ~50% JS fund
    await enrollWithProgress({
      userId: bob._id,
      courseId: jsFund._id,
      lessons: jsLessons,
      completedCount: Math.ceil(jsLessons.length * 0.5),
      enrolledDaysAgo: 20,
    });
    await enrollWithProgress({
      userId: bob._id,
      courseId: javaFund._id,
      lessons: javaLessons,
      completedCount: Math.min(3, javaLessons.length),
      enrolledDaysAgo: 12,
    });

    // Huy: ~70% JS
    await enrollWithProgress({
      userId: huy._id,
      courseId: jsFund._id,
      lessons: jsLessons,
      completedCount: Math.ceil(jsLessons.length * 0.7),
      enrolledDaysAgo: 16,
    });

    // Expired: completed JS fund + half parallel (when still premium)
    await enrollWithProgress({
      userId: expiredPremium._id,
      courseId: jsFund._id,
      lessons: jsLessons,
      completedCount: jsLessons.length,
      enrolledDaysAgo: 70,
    });
    await enrollWithProgress({
      userId: expiredPremium._id,
      courseId: jsParallel._id,
      lessons: parallelLessons,
      completedCount: Math.ceil(parallelLessons.length * 0.45),
      enrolledDaysAgo: 40,
    });

    // Alice: enrolled 0%
    await Enrollment.create({
      userId: alice._id,
      courseId: jsFund._id,
      progress: 0,
      progressPercent: 0,
      completedLessons: [],
      totalLessons: jsLessons.length,
      completed: false,
      enrolledAt: daysAgo(2),
    });

    await Course.findByIdAndUpdate(jsFund._id, { totalEnrollments: 5 });
    await Course.findByIdAndUpdate(javaFund._id, { totalEnrollments: 2 });
    await Course.findByIdAndUpdate(jsParallel._id, { totalEnrollments: 2 });
    await Course.findByIdAndUpdate(javaAdv._id, { totalEnrollments: 0 });
    logger.info('✅ Enrollments');

    // ── 6. QUIZ ATTEMPTS + XP ────────────────────────────────────
    logger.info('✍️  Quiz attempts...');
    const jsFinalQuiz = quizByLessonSlug.get('js-final-quiz');
    const jsMidQuiz = quizByLessonSlug.get('js-midterm-quiz');
    const javaFinalQuiz = quizByLessonSlug.get('java-final-quiz');
    const parallelFinal = quizByLessonSlug.get('js-parallel-final-quiz');

    const attemptDocs = [];
    if (jsFinalQuiz) {
      attemptDocs.push({
        quizId: jsFinalQuiz._id,
        userId: minh._id,
        score: 100,
        passed: true,
        passingScorePercent: 75,
        xpRewarded: 150,
        answers: buildAnswers(6, true),
        startedAt: daysAgo(14),
      });
      attemptDocs.push({
        quizId: jsFinalQuiz._id,
        userId: bob._id,
        score: 50,
        passed: false,
        passingScorePercent: 75,
        xpRewarded: 0,
        answers: buildAnswers(6, false),
        startedAt: daysAgo(6),
      });
      attemptDocs.push({
        quizId: jsFinalQuiz._id,
        userId: bob._id,
        score: 83,
        passed: true,
        passingScorePercent: 75,
        xpRewarded: 150,
        answers: buildAnswers(6, true),
        startedAt: daysAgo(5),
      });
      attemptDocs.push({
        quizId: jsFinalQuiz._id,
        userId: expiredPremium._id,
        score: 100,
        passed: true,
        passingScorePercent: 75,
        xpRewarded: 150,
        answers: buildAnswers(6, true),
        startedAt: daysAgo(35),
      });
    }
    if (jsMidQuiz) {
      attemptDocs.push({
        quizId: jsMidQuiz._id,
        userId: minh._id,
        score: 100,
        passed: true,
        passingScorePercent: 70,
        xpRewarded: 100,
        answers: buildAnswers(5, true),
        startedAt: daysAgo(28),
      });
      attemptDocs.push({
        quizId: jsMidQuiz._id,
        userId: huy._id,
        score: 60,
        passed: false,
        passingScorePercent: 70,
        xpRewarded: 0,
        isTimeout: true,
        answers: buildAnswers(5, false),
        startedAt: daysAgo(4),
      });
    }
    if (javaFinalQuiz) {
      attemptDocs.push({
        quizId: javaFinalQuiz._id,
        userId: minh._id,
        score: 83,
        passed: true,
        passingScorePercent: 75,
        xpRewarded: 150,
        answers: buildAnswers(6, true),
        startedAt: daysAgo(8),
      });
    }
    if (parallelFinal) {
      attemptDocs.push({
        quizId: parallelFinal._id,
        userId: minh._id,
        score: 80,
        passed: true,
        passingScorePercent: 75,
        xpRewarded: 180,
        answers: buildAnswers(5, true),
        startedAt: daysAgo(3),
      });
    }

    const attempts = attemptDocs.length ? await QuizAttempt.create(attemptDocs) : [];
    await XpAwardLog.create([
      ...attempts
        .filter((a) => a.passed && (a.xpRewarded ?? 0) > 0)
        .map((a) => ({
          sourceType: 'quiz_attempt',
          sourceId: a._id.toString(),
          userId: a.userId.toString(),
        })),
      { sourceType: 'course_completion', sourceId: jsFund._id.toString(), userId: minh._id.toString() },
      { sourceType: 'course_completion', sourceId: jsFund._id.toString(), userId: expiredPremium._id.toString() },
      { sourceType: 'lesson_completion', sourceId: jsLessons[0]._id.toString(), userId: minh._id.toString() },
      { sourceType: 'lesson_completion', sourceId: jsLessons[1]._id.toString(), userId: minh._id.toString() },
    ]);
    logger.info(`✅ ${attempts.length} attempts + XP logs`);

    // ── 7. CODE EXECUTIONS ──────────────────────────────────────
    logger.info('💻 Code executions...');
    const sumEx = exerciseByTitle.get('Parallel sum với Promise.all');
    const counterEx = exerciseByTitle.get('Thread-safe Counter');
    const atomEx = exerciseByTitle.get('safeAdd với Atomics');
    const execs = await CodeExecution.create([
      {
        userId: minh._id,
        courseId: jsFund._id,
        lessonId: jsLessons.find((l) => l.slug === 'js-async-await-mastery')?._id,
        exerciseId: sumEx?._id?.toString(),
        sourceCode: `async function sumParallel(nums) {
  if (!nums.length) return 0;
  const parts = await Promise.all(nums.map((n) => Promise.resolve(n)));
  return parts.reduce((a, b) => a + b, 0);
}`,
        language: 'javascript',
        languageId: 63,
        status: 'Accepted',
        stdout: '6\n',
        runtime: '0.04',
        memory: 1400,
        exitCode: 0,
        executedAt: daysAgo(20),
      },
      {
        userId: bob._id,
        courseId: jsFund._id,
        lessonId: jsLessons.find((l) => l.slug === 'js-event-loop-deep')?._id,
        sourceCode: `console.log(1);
setTimeout(() => console.log(2), 0);
Promise.resolve().then(() => console.log(3));
console.log(4);`,
        language: 'javascript',
        languageId: 63,
        status: 'Accepted',
        stdout: '1\n4\n3\n2\n',
        exitCode: 0,
        executedAt: daysAgo(7),
      },
      {
        userId: bob._id,
        courseId: jsFund._id,
        lessonId: jsLessons[0]._id,
        sourceCode: 'console.log("broken"',
        language: 'javascript',
        languageId: 63,
        status: 'Compilation Error',
        stderr: 'SyntaxError: missing ) after argument list',
        exitCode: 1,
        errorMessage: 'SyntaxError',
        executedAt: daysAgo(6),
      },
      {
        userId: minh._id,
        courseId: javaFund._id,
        lessonId: javaLessons.find((l) => l.slug === 'java-synchronized-deep')?._id,
        exerciseId: counterEx?._id?.toString(),
        sourceCode: `public class Counter {
  private int count = 0;
  public synchronized void inc() { count++; }
  public synchronized int get() { return count; }
}`,
        language: 'java',
        languageId: 62,
        status: 'Accepted',
        stdout: '2000\n',
        runtime: '0.11',
        memory: 22000,
        exitCode: 0,
        executedAt: daysAgo(12),
      },
      {
        userId: minh._id,
        courseId: jsParallel._id,
        lessonId: parallelLessons.find((l) => l.slug === 'js-atomics-rmw')?._id,
        exerciseId: atomEx?._id?.toString(),
        sourceCode: `function safeAdd(view, delta) {
  return Atomics.add(view, 0, delta);
}`,
        language: 'javascript',
        languageId: 63,
        status: 'Accepted',
        stdout: 'ok\n',
        exitCode: 0,
        executedAt: daysAgo(2),
      },
      {
        userId: huy._id,
        courseId: jsFund._id,
        lessonId: jsLessons.find((l) => l.slug === 'js-event-loop-deep')?._id,
        sourceCode: `console.log('A');
setTimeout(() => console.log('B'), 0);
Promise.resolve().then(() => console.log('C'));
console.log('D');`,
        language: 'javascript',
        languageId: 63,
        status: 'Accepted',
        stdout: 'A\nD\nC\nB\n',
        exitCode: 0,
        executedAt: daysAgo(3),
      },
    ]);
    logger.info(`✅ ${execs.length} executions`);

    // ── 8. SOCIAL + CERTS + AI + NOTIFS ─────────────────────────
    logger.info('⭐ Reviews, comments, notes, bookmarks...');
    await CourseReview.create([
      {
        userId: minh._id,
        courseId: jsFund._id,
        rating: 5,
        content:
          'Full path từ event loop đến JobQueue capstone — đúng thứ SV cần trước khi học Workers.',
        helpfulCount: 14,
        status: 'active',
      },
      {
        userId: bob._id,
        courseId: jsFund._id,
        rating: 4,
        content: 'Quiz giữa kỳ + final khá chặt. Lab SafeCounter giúp hiểu race rõ.',
        helpfulCount: 6,
        status: 'active',
      },
      {
        userId: huy._id,
        courseId: jsFund._id,
        rating: 5,
        content: 'Module race condition và AbortController rất thực tế.',
        helpfulCount: 4,
        status: 'active',
      },
      {
        userId: minh._id,
        courseId: javaFund._id,
        rating: 5,
        content: 'synchronized → AtomicInteger → deadlock → BankAccount: lộ trình logic.',
        helpfulCount: 8,
        status: 'active',
      },
      {
        userId: expiredPremium._id,
        courseId: jsParallel._id,
        rating: 4,
        content: 'Atomics + worker pool đáng Premium. Mong thêm video.',
        helpfulCount: 5,
        status: 'active',
      },
    ]);
    await Course.findByIdAndUpdate(jsFund._id, { averageRating: 4.7, totalReviews: 3 });
    await Course.findByIdAndUpdate(javaFund._id, { averageRating: 5, totalReviews: 1 });
    await Course.findByIdAndUpdate(jsParallel._id, { averageRating: 4, totalReviews: 1 });

    const eventLoopLesson = jsLessons.find((l) => l.slug === 'js-event-loop-deep')!;
    const root = await Comment.create({
      targetType: 'LESSON',
      targetId: eventLoopLesson._id,
      lessonId: eventLoopLesson._id,
      courseId: jsFund._id,
      userId: bob._id,
      content: 'Microtask vs macrotask — có mnemonic nào nhớ lâu không ạ?',
      status: 'active',
      reactionCount: 3,
    });
    await Comment.create([
      {
        targetType: 'LESSON',
        targetId: eventLoopLesson._id,
        lessonId: eventLoopLesson._id,
        courseId: jsFund._id,
        userId: instructor._id,
        parentId: root._id,
        content: 'Promise (micro) chen trước setTimeout (macro). Drain hết micro rồi mới lấy 1 macro.',
        status: 'active',
        reactionCount: 7,
        mentionUserIds: [bob._id],
      },
      {
        targetType: 'LESSON',
        targetId: eventLoopLesson._id,
        lessonId: eventLoopLesson._id,
        courseId: jsFund._id,
        userId: minh._id,
        parentId: root._id,
        content: 'Em log timestamp trong then vs setTimeout để tự verify — recommend!',
        status: 'active',
        isEdited: true,
        editedAt: daysAgo(4),
        reactionCount: 2,
      },
      {
        targetType: 'COURSE',
        targetId: javaFund._id,
        courseId: javaFund._id,
        userId: minh._id,
        content: 'Pair cực tốt với JS fund: cùng concurrent mindset khác runtime.',
        status: 'active',
        reactionCount: 5,
      },
      {
        targetType: 'LESSON',
        targetId: javaLessons.find((l) => l.slug === 'java-synchronized-deep')!._id,
        lessonId: javaLessons.find((l) => l.slug === 'java-synchronized-deep')!._id,
        courseId: javaFund._id,
        userId: huy._id,
        content: 'Exercise Counter 2 threads giúp hiểu lost update ngay.',
        status: 'active',
      },
      {
        targetType: 'LESSON',
        targetId: parallelLessons.find((l) => l.slug === 'js-atomics-rmw')!._id,
        lessonId: parallelLessons.find((l) => l.slug === 'js-atomics-rmw')!._id,
        courseId: jsParallel._id,
        userId: minh._id,
        content: 'Atomics.wait giống Condition Java — đúng hướng so sánh!',
        status: 'active',
        reactionCount: 2,
      },
    ]);

    await Bookmark.create([
      {
        userId: minh._id,
        targetType: 'COURSE',
        targetId: javaAdv._id,
        title: 'Advanced Concurrent Java Patterns',
        thumbnailUrl: (javaAdv as { thumbnailUrl?: string }).thumbnailUrl,
        folder: 'Next up',
        tags: ['java', 'premium'],
        status: 'active',
      },
      {
        userId: minh._id,
        targetType: 'LESSON',
        targetId: raceLesson?._id ?? jsLessons[0]._id,
        title: raceLesson?.title ?? jsLessons[0].title,
        anchorText: 'check-then-act',
        position: 200,
        note: 'Interview prep',
        folder: 'Interview',
        tags: ['race'],
        status: 'active',
      },
      {
        userId: bob._id,
        targetType: 'LESSON',
        targetId: eventLoopLesson._id,
        title: eventLoopLesson.title,
        anchorText: 'Microtask',
        folder: 'Fundamentals',
        tags: ['event-loop'],
        status: 'active',
      },
      {
        userId: huy._id,
        targetType: 'COURSE',
        targetId: jsParallel._id,
        title: 'Parallel JavaScript: Workers & Shared Memory',
        folder: 'Premium wishlist',
        tags: ['premium'],
        status: 'active',
      },
    ]);

    await Note.create([
      {
        userId: minh._id,
        lessonId: eventLoopLesson._id,
        noteText: 'Microtask drain hết trước macrotask kế tiếp.',
        codeSnippet: 'Promise.resolve().then(() => console.log("micro"));',
        anchorText: 'Microtask',
        anchorStart: 0,
        anchorEnd: 9,
      },
      {
        userId: minh._id,
        lessonId: javaLessons.find((l) => l.slug === 'java-synchronized-deep')!._id,
        noteText: 'synchronized method = lock this.',
        codeSnippet: 'public synchronized void inc() { count++; }',
      },
      {
        userId: bob._id,
        lessonId: jsLessons.find((l) => l.slug === 'js-promise-combinators')!._id,
        noteText: 'all fail-fast; allSettled soft; race first settled.',
      },
      {
        userId: huy._id,
        lessonId: jsLessons.find((l) => l.slug === 'js-async-await-mastery')!._id,
        noteText: 'I/O độc lập → Promise.all, không for-await.',
      },
      {
        userId: minh._id,
        lessonId: parallelLessons.find((l) => l.slug === 'js-atomics-rmw')!._id,
        noteText: 'Atomics.add thay RMW không an toàn trên SAB.',
        codeSnippet: 'Atomics.add(view, 0, 1);',
      },
    ]);

    const jsFundCertificateSnapshot = jsFund.toObject() as {
      title: string;
      slug: string;
      level: string;
      language: string;
      shortDescription?: string;
      description: string;
      tags: string[];
      category?: string;
      estimatedDuration: number;
      totalLessons: number;
    };

    await Certificate.create([
      {
        userId: minh._id,
        courseId: jsFund._id,
        certificateCode: 'TL-2026-JSCONC-0001',
        recipientName: `${minh.firstName} ${minh.lastName}`,
        courseTitle: jsFundCertificateSnapshot.title,
        courseSlug: jsFundCertificateSnapshot.slug,
        courseLevel: jsFundCertificateSnapshot.level,
        courseLanguage: jsFundCertificateSnapshot.language,
        courseDescription:
          jsFundCertificateSnapshot.shortDescription || jsFundCertificateSnapshot.description,
        courseTags: jsFundCertificateSnapshot.tags,
        courseCategory: jsFundCertificateSnapshot.category,
        courseEstimatedDuration: jsFundCertificateSnapshot.estimatedDuration,
        courseTotalLessons: jsFundCertificateSnapshot.totalLessons,
        completedAt: daysAgo(14),
        templateVersion: 'forest-v1',
        pdfUrl: '/api/v1/certificates/TL-2026-JSCONC-0001/pdf',
        issuedAt: daysAgo(13),
      },
      {
        userId: expiredPremium._id,
        courseId: jsFund._id,
        certificateCode: 'TL-2026-JSCONC-0002',
        recipientName: `${expiredPremium.firstName} ${expiredPremium.lastName}`,
        courseTitle: jsFundCertificateSnapshot.title,
        courseSlug: jsFundCertificateSnapshot.slug,
        courseLevel: jsFundCertificateSnapshot.level,
        courseLanguage: jsFundCertificateSnapshot.language,
        courseDescription:
          jsFundCertificateSnapshot.shortDescription || jsFundCertificateSnapshot.description,
        courseTags: jsFundCertificateSnapshot.tags,
        courseCategory: jsFundCertificateSnapshot.category,
        courseEstimatedDuration: jsFundCertificateSnapshot.estimatedDuration,
        courseTotalLessons: jsFundCertificateSnapshot.totalLessons,
        completedAt: daysAgo(35),
        templateVersion: 'forest-v1',
        pdfUrl: '/api/v1/certificates/TL-2026-JSCONC-0002/pdf',
        issuedAt: daysAgo(34),
      },
    ]);

    await AIHistory.create([
      {
        userId: minh._id,
        courseId: jsFund._id,
        lessonId: raceLesson?._id,
        codeExecutionId: execs[0]._id,
        inputCode: `let balance = 100;
async function withdraw(amount) {
  const current = balance;
  await delay(10);
  balance = current - amount;
}`,
        language: 'javascript',
        prompt: 'Analyze this javascript snippet for concurrent programming issues.',
        response:
          '### AI Code Analysis\n\n1. [high] Read-modify-write after await on shared balance.\n2. [medium] Shared mutable global state.\n',
        suggestions: ['[high] Serialize withdraw', '[medium] Encapsulate wallet state'],
        raceConditions: ['withdraw interleaving can overdraw'],
        optimizedCode: `class Wallet {
  constructor(b) { this.balance = b; this.chain = Promise.resolve(); }
  withdraw(amount) {
    this.chain = this.chain.then(async () => {
      if (this.balance < amount) throw new Error('insufficient');
      this.balance -= amount;
    });
    return this.chain;
  }
}`,
        explanation: 'Promise-chain mutex serializes critical section.',
        tokenUsage: 420,
        modelName: 'threadlearn-ai2-server',
        feedbackRating: 5,
        status: 'completed',
        category: 'code-analysis',
        issues: [
          {
            patternId: 'async-rmw-race',
            lineRange: 'L3-L6',
            severity: 'high',
            description: 'RMW after await on shared balance.',
            fix: 'Serialize with mutex/queue.',
            codeSnippet: 'const current = balance; await delay(10);',
          },
        ],
        docsUsed: [
          {
            id: 'kb-js-race-001',
            title: 'Logic races in async JS',
            category: 'race-condition',
            score: 12.4,
          },
        ],
        cached: false,
        analyzeTimeMs: 980,
      },
      {
        userId: minh._id,
        courseId: javaFund._id,
        lessonId: javaLessons.find((l) => l.slug === 'java-lost-updates')?._id,
        inputCode: 'class C { int count; void inc(){ count++; } }',
        language: 'java',
        prompt: 'Analyze this java snippet for concurrent programming issues.',
        response: '### AI Code Analysis\n\n1. [high] count++ non-atomic multi-thread lost updates.\n',
        suggestions: ['[high] synchronized or AtomicInteger'],
        raceConditions: ['lost updates on count++'],
        optimizedCode: 'AtomicInteger count = new AtomicInteger();',
        explanation: 'Use atomic RMW for counters.',
        tokenUsage: 300,
        modelName: 'threadlearn-ai2-server',
        feedbackRating: 4,
        status: 'completed',
        category: 'code-analysis',
        issues: [
          {
            patternId: 'java-non-atomic-increment',
            lineRange: 'L1',
            severity: 'high',
            description: 'Non-atomic increment.',
            fix: 'AtomicInteger.incrementAndGet()',
          },
        ],
        docsUsed: [{ id: 'kb-java-atomic-010', title: 'Atomic counters', category: 'java', score: 11 }],
        cached: true,
        analyzeTimeMs: 140,
      },
      {
        userId: bob._id,
        courseId: jsFund._id,
        lessonId: jsLessons.find((l) => l.slug === 'js-promise-combinators')?._id,
        inputCode: 'await Promise.all(urls.map(fetch));',
        language: 'javascript',
        prompt: 'Analyze this javascript snippet for concurrent programming issues.',
        response: '### AI Code Analysis\n\nNo concurrency issues detected in this code.\n',
        suggestions: [],
        raceConditions: [],
        explanation: 'Parallel I/O without shared mutable state is fine.',
        tokenUsage: 120,
        modelName: 'threadlearn-ai2-server',
        status: 'completed',
        category: 'code-analysis',
        issues: [],
        docsUsed: [],
        cached: false,
        analyzeTimeMs: 350,
      },
      {
        userId: expiredPremium._id,
        courseId: jsParallel._id,
        lessonId: parallelLessons.find((l) => l.slug === 'js-atomics-rmw')?._id,
        inputCode: 'view[0] = view[0] + 1;',
        language: 'javascript',
        prompt: 'Analyze shared memory increment.',
        response: '### AI Code Analysis\n\n1. [high] Data race without Atomics.\n',
        suggestions: ['[high] Atomics.add(view,0,1)'],
        raceConditions: ['SAB non-atomic RMW'],
        optimizedCode: 'Atomics.add(view, 0, 1);',
        explanation: 'Shared memory needs atomic primitives.',
        tokenUsage: 200,
        modelName: 'threadlearn-ai2-server',
        status: 'completed',
        category: 'code-analysis',
        issues: [
          {
            patternId: 'sab-data-race',
            lineRange: 'L1',
            severity: 'high',
            description: 'Non-atomic shared increment.',
            fix: 'Atomics.add',
          },
        ],
        docsUsed: [{ id: 'kb-atomics-001', title: 'Atomics RMW', category: 'shared-memory', score: 14 }],
        cached: false,
        analyzeTimeMs: 700,
      },
    ]);

    await Notification.create([
      {
        userId: minh._id,
        title: 'Hoàn thành khóa học 🎉',
        message: 'Bạn hoàn thành JavaScript Concurrency Fundamentals và nhận chứng chỉ.',
        type: 'COURSE_COMPLETED',
        link: '/certificates',
        metadata: { courseId: jsFund._id.toString() },
        isRead: true,
        readAt: daysAgo(12),
      },
      {
        userId: minh._id,
        title: 'Quiz final passed',
        message: 'JS Final 100% — +150 XP',
        type: 'QUIZ_PASSED',
        isRead: true,
        readAt: daysAgo(13),
      },
      {
        userId: minh._id,
        title: 'Premium active',
        message: 'Premium Semester mở Workers & Advanced Java.',
        type: 'PAYMENT_SUCCESS',
        link: '/subscription',
        isRead: false,
      },
      {
        userId: minh._id,
        title: 'AI phân tích xong',
        message: 'Phát hiện race trên withdraw(balance).',
        type: 'AI_FEEDBACK',
        link: '/ai/history',
        isRead: false,
      },
      {
        userId: bob._id,
        title: 'Enrolled',
        message: 'Đăng ký JS Concurrency Fundamentals.',
        type: 'COURSE_ENROLLED',
        isRead: true,
        readAt: daysAgo(19),
      },
      {
        userId: bob._id,
        title: 'Quiz chưa đạt',
        message: 'Final JS 50% — ôn event loop rồi thử lại.',
        type: 'QUIZ_FAILED',
        isRead: false,
      },
      {
        userId: bob._id,
        title: 'Comment reply',
        message: 'Lan Nguyen trả lời câu hỏi event loop.',
        type: 'COMMENT_REPLY',
        link: `/lessons/${eventLoopLesson._id}`,
        isRead: false,
      },
      {
        userId: huy._id,
        title: 'Lesson completed',
        message: 'Tiếp tục module race condition nhé!',
        type: 'LESSON_COMPLETED',
        isRead: false,
      },
      {
        userId: alice._id,
        title: 'Welcome ThreadLearn',
        message: 'Verify email để mở đủ tính năng concurrent learning.',
        type: 'SYSTEM',
        isRead: false,
      },
      {
        userId: expiredPremium._id,
        title: 'Premium expired',
        message: 'Gói Premium hết hạn — gia hạn để học Workers tiếp.',
        type: 'SYSTEM',
        link: '/pricing',
        isRead: false,
      },
      {
        userId: admin._id,
        title: 'New user',
        message: 'alice@threadlearn.com registered (unverified).',
        type: 'NEW_USER_REGISTERED',
        isRead: true,
        readAt: daysAgo(2),
      },
      {
        userId: instructor._id,
        title: 'Leaderboard',
        message: 'Minh Tran đang top concurrent learners tuần này.',
        type: 'LEADERBOARD',
        link: '/leaderboard',
        isRead: false,
      },
    ]);
    logger.info('✅ Social + AI + notifications');

    // ── 9. SUBSCRIPTIONS ────────────────────────────────────────
    logger.info('💳 Subscriptions...');
    const [monthlyPlan, semesterPlan] = await SubscriptionPlan.create([
      {
        name: 'Premium Monthly',
        description: 'Workers/Atomics + Advanced Java + AI 40/day + history.',
        price: 99000,
        currency: 'VND',
        durationDays: 30,
        features: ['PREMIUM_COURSES', 'AI_ADVANCED_ANALYSIS'],
        isActive: true,
      },
      {
        name: 'Premium Semester',
        description: '180 ngày — lộ trình WDP301 / đồ án.',
        price: 399000,
        currency: 'VND',
        durationDays: 180,
        features: ['PREMIUM_COURSES', 'AI_ADVANCED_ANALYSIS'],
        isActive: true,
      },
      {
        name: 'Premium Promo (inactive)',
        description: 'Legacy promo',
        price: 49000,
        currency: 'VND',
        durationDays: 30,
        features: ['PREMIUM_COURSES'],
        isActive: false,
      },
    ]);

    await UserSubscription.create([
      { userId: minh._id, planId: semesterPlan._id, status: 'active', startedAt: daysAgo(10), expiresAt: daysFromNow(170) },
      { userId: admin._id, planId: semesterPlan._id, status: 'active', startedAt: daysAgo(200), expiresAt: daysFromNow(165) },
      { userId: instructor._id, planId: semesterPlan._id, status: 'active', startedAt: daysAgo(180), expiresAt: daysFromNow(185) },
      { userId: expiredPremium._id, planId: monthlyPlan._id, status: 'expired', startedAt: daysAgo(35), expiresAt: daysAgo(5) },
    ]);

    await SubscriptionPurchase.create([
      {
        userId: minh._id,
        planId: semesterPlan._id,
        amount: 399000,
        currency: 'VND',
        status: 'succeeded',
        transactionId: `seed-payos-minh`,
        paidAt: daysAgo(10),
      },
      {
        userId: bob._id,
        planId: monthlyPlan._id,
        amount: 99000,
        currency: 'VND',
        status: 'pending',
        paymentUrl: 'http://localhost:3001/mock-payment/vnpay?status=success',
      },
      {
        userId: huy._id,
        planId: monthlyPlan._id,
        amount: 99000,
        currency: 'VND',
        status: 'failed',
        transactionId: 'seed-failed-huy',
      },
      {
        userId: expiredPremium._id,
        planId: monthlyPlan._id,
        amount: 99000,
        currency: 'VND',
        status: 'succeeded',
        transactionId: 'seed-old-exp',
        paidAt: daysAgo(35),
      },
      {
        userId: expiredPremium._id,
        planId: monthlyPlan._id,
        amount: 99000,
        currency: 'VND',
        status: 'pending',
        paymentUrl: 'http://localhost:3001/mock-payment/payos?renew=1',
      },
    ]);

    await RefreshToken.create([
      { userId: minh._id, token: `seed-refresh-minh`, expiresAt: daysFromNow(7) },
      { userId: bob._id, token: `seed-refresh-bob`, expiresAt: daysFromNow(7) },
      { userId: huy._id, token: `seed-refresh-huy`, expiresAt: daysFromNow(3) },
      { userId: admin._id, token: `seed-refresh-admin`, expiresAt: daysFromNow(7) },
    ]);
    await EmailVerificationToken.create({
      userId: alice._id,
      tokenHash: `seed-email-verify-alice`,
      expiresAt: daysFromNow(1),
    });
    await PasswordResetToken.create({
      userId: bob._id,
      tokenHash: `seed-pwd-reset-bob`,
      expiresAt: daysFromNow(1),
    });

    const finalStats = countCurriculum();
    logger.info('🎉 FULL CURRICULUM SEED COMPLETE');
    logger.info('────────────────────────────────────────');
    logger.info(
      `Courses ${finalStats.courses} | Sections ${finalStats.sections} | Lessons ${finalStats.lessons} | Quizzes ${finalStats.quizzes} | Exercises ${finalStats.exercises}`,
    );
    logger.info('FREE  js-concurrency-fundamentals (~15 lessons + mid/final quiz + labs + capstone)');
    logger.info('FREE  java-multithreading-foundations (~14 lessons + mid/final + labs + capstone)');
    logger.info('PREMIUM parallel-js-workers-shared-memory (~11 lessons + final + capstone)');
    logger.info('PREMIUM advanced-concurrent-java-patterns (~11 lessons + final + pipeline capstone)');
    logger.info('DRAFT ai-assisted-concurrency-debugging (~5 lessons)');
    logger.info('────────────────────────────────────────');
    logger.info('admin@threadlearn.com / Admin@123');
    logger.info('instructor@threadlearn.com / Admin@123');
    logger.info('student@threadlearn.com / Student@123  (PREMIUM, completed JS fund)');
    logger.info('bob@threadlearn.com / Student@123');
    logger.info('huy@threadlearn.com / Student@123');
    logger.info('alice@threadlearn.com / Student@123 (unverified)');
    logger.info('expired@threadlearn.com / Student@123');
    logger.info('locked@threadlearn.com / Student@123');
    logger.info('────────────────────────────────────────');
  } catch (error) {
    logger.error('❌ SEED FAILED:', error);
    await mongoose.connection.close();
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    logger.info('🔌 Connection closed.');
    process.exit(0);
  }
}

function mapCourseDoc(
  def: SeedCourse,
  instructorId: mongoose.Types.ObjectId,
  adminId: mongoose.Types.ObjectId,
) {
  const published = def.status === 'published';
  return {
    title: def.title,
    slug: def.slug,
    shortDescription: def.shortDescription,
    description: def.description,
    thumbnailUrl: thumb(def.thumbnailPhotoId),
    coverImage: thumb(def.thumbnailPhotoId),
    language: def.language,
    level: def.level,
    tags: def.tags,
    category: def.category,
    isPremium: def.isPremium,
    price: def.price,
    status: def.status,
    isPublished: published,
    publishedAt: published ? daysAgo(90) : undefined,
    estimatedDuration: def.estimatedDuration,
    prerequisiteThreshold: def.prerequisiteThreshold ?? 80,
    instructorId,
    createdBy: def.status === 'draft' ? adminId : instructorId,
  };
}

function buildAnswers(n: number, mostlyCorrect: boolean): Record<string, number> {
  const answers: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    answers[String(i)] = mostlyCorrect ? 1 : i % 2;
  }
  return answers;
}

async function enrollWithProgress(input: {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  lessons: LeanLesson[];
  completedCount: number;
  enrolledDaysAgo: number;
}) {
  const { userId, courseId, lessons, completedCount, enrolledDaysAgo } = input;
  const completed = lessons.slice(0, completedCount);
  const pct = lessons.length ? Math.round((completed.length / lessons.length) * 100) : 0;
  const isDone = completed.length === lessons.length && lessons.length > 0;

  await Enrollment.create({
    userId,
    courseId,
    progress: pct,
    progressPercent: pct,
    completedLessons: completed.map((l) => l._id),
    totalLessons: lessons.length,
    lastLessonId: completed[completed.length - 1]?._id ?? lessons[0]?._id,
    completed: isDone,
    completedAt: isDone ? daysAgo(Math.max(1, enrolledDaysAgo - 20)) : undefined,
    enrolledAt: daysAgo(enrolledDaysAgo),
    lastAccessedAt: daysAgo(Math.min(3, enrolledDaysAgo)),
  });

  if (!completed.length) return;

  await LessonProgress.create(
    completed.map((l, i) => ({
      userId,
      courseId,
      lessonId: l._id,
      isCompleted: true,
      timeSpent: 800 + i * 90 + l.def.estimatedTime * 20,
      completedAt: daysAgo(enrolledDaysAgo - i - 1),
      lastAccessedAt: daysAgo(Math.max(0, enrolledDaysAgo - i - 1)),
    })),
  );
}

seed();
