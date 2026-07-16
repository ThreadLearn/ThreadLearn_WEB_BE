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
  SubscriptionPlan,
  UserSubscription,
  SubscriptionPurchase,
  RefreshToken,
  EmailVerificationToken,
  PasswordResetToken,
} from './models';
import { hashPassword } from '../utils';

// ── Helpers thời gian ───────────────────────────────────────────
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysFromNow = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);
const avatar = (seed: string) => `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`;

/**
 * Seed dữ liệu tạm cho TOÀN HỆ THỐNG ThreadLearn.
 *
 * Chạy: `npm run db:seed`
 * ⚠️ XÓA SẠCH mọi collection rồi tạo lại — không dùng trên DB production.
 *
 * Thứ tự tạo tuân theo phụ thuộc tham chiếu:
 *   Users → Stats → Courses → Sections → Lessons → Versions → Quizzes/Exercises
 *   → Enrollments → LessonProgress → Attempts/Executions → Reviews/Comments/Notes/Bookmarks
 *   → Certificates → AIHistory → Notifications → Tokens.
 */
async function seed() {
  try {
    logger.info('🚀 Database Seeding Tool Initializing...');
    await connectToDatabase();
    logger.info('🔌 Connected to MongoDB for seeding.');

    // ════════════════════════════════════════════════════════════
    // 1. WIPE — xóa toàn bộ collection seedable
    // ════════════════════════════════════════════════════════════
    logger.info('🗑️  Wiping all collections...');
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
      AIHistory.deleteMany({}),
      Notification.deleteMany({}),
      SubscriptionPlan.deleteMany({}),
      UserSubscription.deleteMany({}),
      SubscriptionPurchase.deleteMany({}),
      RefreshToken.deleteMany({}),
      EmailVerificationToken.deleteMany({}),
      PasswordResetToken.deleteMany({}),
    ]);
    logger.info('✅ All collections cleared.');

    // ════════════════════════════════════════════════════════════
    // 2. USERS
    // ════════════════════════════════════════════════════════════
    logger.info('👤 Creating users...');
    const adminPasswordHash = await hashPassword('Admin@123');
    const studentPasswordHash = await hashPassword('Student@123');

    const users = await User.create([
      {
        email: 'admin@threadlearn.com',
        passwordHash: adminPasswordHash,
        firstName: 'John',
        lastName: 'Admin',
        role: 'ADMIN',
        planType: 'PREMIUM',
        isVerified: true,
        emailVerifiedAt: daysAgo(200),
        isActive: true,
        avatarUrl: avatar('JohnAdmin'),
        lastLoginAt: daysAgo(1),
      },
      {
        email: 'instructor@threadlearn.com',
        passwordHash: adminPasswordHash,
        firstName: 'Emma',
        lastName: 'Instructor',
        role: 'ADMIN',
        planType: 'PREMIUM',
        isVerified: true,
        emailVerifiedAt: daysAgo(180),
        isActive: true,
        avatarUrl: avatar('EmmaInstructor'),
        lastLoginAt: daysAgo(2),
      },
      {
        email: 'student@threadlearn.com',
        passwordHash: studentPasswordHash,
        firstName: 'Jane',
        lastName: 'Student',
        role: 'STUDENT',
        planType: 'PREMIUM',
        subscriptionExpiresAt: daysFromNow(180),
        isVerified: true,
        emailVerifiedAt: daysAgo(60),
        isActive: true,
        avatarUrl: avatar('JaneStudent'),
        lastLoginAt: daysAgo(1),
      },
      {
        email: 'bob@threadlearn.com',
        passwordHash: studentPasswordHash,
        firstName: 'Bob',
        lastName: 'Learner',
        role: 'STUDENT',
        planType: 'FREE',
        isVerified: true,
        emailVerifiedAt: daysAgo(30),
        isActive: true,
        avatarUrl: avatar('BobLearner'),
        lastLoginAt: daysAgo(3),
      },
      {
        email: 'alice@threadlearn.com',
        passwordHash: studentPasswordHash,
        firstName: 'Alice',
        lastName: 'Coder',
        role: 'STUDENT',
        planType: 'FREE',
        isVerified: false, // chưa xác minh email → có EmailVerificationToken bên dưới
        isActive: true,
        avatarUrl: avatar('AliceCoder'),
      },
    ]);
    const [admin, instructor, jane, bob, alice] = users;
    logger.info(`✅ Created ${users.length} users (2 ADMIN, 3 STUDENT).`);

    // ════════════════════════════════════════════════════════════
    // 3. USER STATS
    // ════════════════════════════════════════════════════════════
    logger.info('📊 Creating user stats...');
    await UserStats.create([
      { userId: admin._id, xp: 5000, level: 6, currentStreak: 12, highestStreak: 30, quizzesCompleted: 25, coursesCompleted: 4, totalLessonsCompleted: 40, lastActiveDate: daysAgo(1) },
      { userId: instructor._id, xp: 8000, level: 9, currentStreak: 20, highestStreak: 45, quizzesCompleted: 30, coursesCompleted: 5, totalLessonsCompleted: 60, lastActiveDate: daysAgo(2) },
      { userId: jane._id, xp: 1350, level: 2, currentStreak: 5, highestStreak: 9, quizzesCompleted: 3, coursesCompleted: 1, totalLessonsCompleted: 8, lastActiveDate: daysAgo(1) },
      { userId: bob._id, xp: 250, level: 1, currentStreak: 1, highestStreak: 3, quizzesCompleted: 1, coursesCompleted: 0, totalLessonsCompleted: 2, lastActiveDate: daysAgo(3) },
      { userId: alice._id, xp: 0, level: 1, currentStreak: 0, highestStreak: 0, quizzesCompleted: 0, coursesCompleted: 0, totalLessonsCompleted: 0 },
    ]);
    logger.info('✅ Created user stats for all users.');

    // ════════════════════════════════════════════════════════════
    // 4. COURSES
    // ════════════════════════════════════════════════════════════
    logger.info('📚 Creating courses...');
    const courses = await Course.create([
      {
        title: 'HTML & CSS Foundations',
        slug: 'html-css-foundations',
        shortDescription: 'Build the structural and visual foundation of the web.',
        description: 'Learn the cornerstone technologies of the web. Build structural layouts, master responsive design, Flexbox, Grid, and advanced selectors.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=600&q=80',
        coverImage: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=600&q=80',
        language: 'javascript',
        level: 'BEGINNER',
        tags: ['html', 'css', 'web', 'frontend'],
        category: 'Web Development',
        isPremium: false,
        price: 0,
        status: 'published',
        isPublished: true,
        publishedAt: daysAgo(150),
        estimatedDuration: 240,
        instructorId: instructor._id,
        createdBy: instructor._id,
      },
      {
        title: 'JavaScript Programming Fundamentals',
        slug: 'javascript-fundamentals',
        shortDescription: 'Master modern JavaScript from variables to async.',
        description: 'Unlock the programming power of modern JavaScript: types, control flow, arrays, callbacks, async operations, DOM, and scope.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?auto=format&fit=crop&w=600&q=80',
        coverImage: 'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?auto=format&fit=crop&w=600&q=80',
        language: 'javascript',
        level: 'BEGINNER',
        tags: ['javascript', 'programming', 'frontend'],
        category: 'Programming',
        isPremium: false,
        price: 0,
        status: 'published',
        isPublished: true,
        publishedAt: daysAgo(120),
        estimatedDuration: 360,
        instructorId: instructor._id,
        createdBy: instructor._id,
      },
      {
        title: 'Advanced React & Redux Toolkit',
        slug: 'advanced-react-redux',
        shortDescription: 'Level up frontend engineering with React 19 + RTK.',
        description: 'Deep dive into state design, high-performance context, custom hooks, suspense boundaries, and RTK Query integration.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1633356122102-3fd601ee4377?auto=format&fit=crop&w=600&q=80',
        coverImage: 'https://images.unsplash.com/photo-1633356122102-3fd601ee4377?auto=format&fit=crop&w=600&q=80',
        language: 'javascript',
        level: 'ADVANCED',
        tags: ['react', 'redux', 'frontend'],
        category: 'Frontend',
        isPremium: true,
        price: 49,
        status: 'draft', // còn nháp
        isPublished: false,
        estimatedDuration: 480,
        instructorId: instructor._id,
        createdBy: instructor._id,
      },
      {
        title: 'Python for Beginners',
        slug: 'python-for-beginners',
        shortDescription: 'Start coding with the most beginner-friendly language.',
        description: 'A gentle introduction to Python: syntax, data structures, functions, and writing your first real programs.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=600&q=80',
        coverImage: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=600&q=80',
        language: 'python',
        level: 'BEGINNER',
        tags: ['python', 'programming', 'basics'],
        category: 'Programming',
        isPremium: false,
        price: 0,
        status: 'published',
        isPublished: true,
        publishedAt: daysAgo(90),
        estimatedDuration: 300,
        instructorId: instructor._id,
        createdBy: instructor._id,
      },
    ]);
    const [htmlCourse, jsCourse, reactCourse, pyCourse] = courses;
    logger.info(`✅ Created ${courses.length} courses (3 published, 1 draft).`);

    // ════════════════════════════════════════════════════════════
    // 5. SECTIONS
    // ════════════════════════════════════════════════════════════
    logger.info('🗂️  Creating sections...');
    const htmlSections = await Section.create([
      { courseId: htmlCourse._id, title: 'Getting Started with HTML', orderIndex: 0, description: 'Document structure & semantic tags.' },
      { courseId: htmlCourse._id, title: 'Styling & Layout with CSS', orderIndex: 1, description: 'Selectors, cascade and Flexbox.' },
    ]);
    const jsSections = await Section.create([
      { courseId: jsCourse._id, title: 'Language Basics', orderIndex: 0, description: 'Variables, types and operators.' },
      { courseId: jsCourse._id, title: 'Working with Data & Async', orderIndex: 1, description: 'Arrays, functions and the event loop.' },
    ]);
    const pySections = await Section.create([
      { courseId: pyCourse._id, title: 'Python Essentials', orderIndex: 0, description: 'Syntax and data types.' },
    ]);
    const reactSections = await Section.create([
      { courseId: reactCourse._id, title: 'Advanced State', orderIndex: 0, description: 'Context and Redux Toolkit.' },
    ]);
    logger.info(`✅ Created ${htmlSections.length + jsSections.length + pySections.length + reactSections.length} sections.`);

    // ════════════════════════════════════════════════════════════
    // 6. LESSONS
    // ════════════════════════════════════════════════════════════
    logger.info('📖 Creating lessons...');
    const htmlLessons = await Lesson.create([
      {
        courseId: htmlCourse._id, sectionId: htmlSections[0]._id, title: 'Introduction to HTML & Document Structure',
        slug: 'intro-to-html', description: 'Basic tags, attributes and boilerplate.',
        contentMarkdown: '# HTML Basics\n\nHTML defines the structure of web content using tags like `<h1>`, `<p>`, `<a>`, and `<div>`.',
        lessonType: 'article', orderIndex: 0, estimatedTime: 20, isPreview: true, status: 'active',
      },
      {
        courseId: htmlCourse._id, sectionId: htmlSections[1]._id, title: 'CSS Selectors & the Cascade',
        slug: 'css-selectors-cascade', description: 'ID, class, attribute selectors and specificity.',
        contentMarkdown: '# CSS Selectors\n\nSpecificity decides which rule wins: ID (1-0-0) > class (0-1-0) > element (0-0-1).',
        lessonType: 'article', orderIndex: 1, estimatedTime: 30, isPreview: false, status: 'active',
      },
      {
        courseId: htmlCourse._id, sectionId: htmlSections[1]._id, title: 'Responsive Flexbox Layout',
        slug: 'responsive-flexbox', description: 'Build flexible layouts with Flexbox.',
        contentMarkdown: '# Flexbox\n\nUse `display: flex` plus `justify-content` and `align-items` to align items along an axis.',
        lessonType: 'article', orderIndex: 2, estimatedTime: 35, isPreview: false, status: 'active',
      },
    ]);

    const jsLessons = await Lesson.create([
      {
        courseId: jsCourse._id, sectionId: jsSections[0]._id, title: 'Variables, Types & Truthy/Falsy',
        slug: 'js-variables-types', description: 'let/const/var and strict equality.',
        contentMarkdown: '# Variables\n\nPrefer `const`, then `let`. Use `===` for strict comparison.',
        lessonType: 'article', orderIndex: 0, estimatedTime: 25, isPreview: true, status: 'active',
      },
      {
        courseId: jsCourse._id, sectionId: jsSections[1]._id, title: 'Array Methods: map, filter & reduce',
        slug: 'js-array-methods', description: 'Declarative list manipulation.',
        contentMarkdown: '# Array Methods\n\n`.map()`, `.filter()` and `.reduce()` keep code functional and clean.',
        lessonType: 'coding', orderIndex: 1, estimatedTime: 40, isPreview: false, status: 'active',
        codeSnippets: [
          { language: 'javascript', code: 'const doubled = [1,2,3].map(n => n * 2);', description: 'Map example' },
        ],
      },
      {
        courseId: jsCourse._id, sectionId: jsSections[1]._id, title: 'Async JS: Promises, Async/Await & Event Loop',
        slug: 'js-async-event-loop', description: 'Concurrency model of JavaScript.',
        contentMarkdown: '# Asynchronous JavaScript\n\nMicrotasks (promises) run before macrotasks (setTimeout).',
        lessonType: 'quiz', orderIndex: 2, estimatedTime: 45, isPreview: false, status: 'active',
      },
    ]);

    const pyLessons = await Lesson.create([
      {
        courseId: pyCourse._id, sectionId: pySections[0]._id, title: 'Python Syntax & Variables',
        slug: 'python-syntax-variables', description: 'Indentation, variables and printing.',
        contentMarkdown: '# Python Basics\n\nPython uses indentation for blocks. `print("Hello")` outputs text.',
        lessonType: 'article', orderIndex: 0, estimatedTime: 20, isPreview: true, status: 'active',
      },
      {
        courseId: pyCourse._id, sectionId: pySections[0]._id, title: 'Lists, Dicts & Loops',
        slug: 'python-lists-dicts', description: 'Core data structures and iteration.',
        contentMarkdown: '# Data Structures\n\nLists `[]`, dicts `{}` and `for` loops are the workhorses of Python.',
        lessonType: 'coding', orderIndex: 1, estimatedTime: 35, isPreview: false, status: 'active',
      },
    ]);

    const reactLessons = await Lesson.create([
      {
        courseId: reactCourse._id, sectionId: reactSections[0]._id, title: 'Designing Global State',
        slug: 'react-global-state', description: 'When to lift state and when to use Redux.',
        contentMarkdown: '# State Design\n\nKeep state as local as possible; reach for Redux Toolkit only for shared global state.',
        lessonType: 'article', orderIndex: 0, estimatedTime: 30, isPreview: true, status: 'active',
      },
    ]);
    const totalLessons = htmlLessons.length + jsLessons.length + pyLessons.length + reactLessons.length;
    logger.info(`✅ Created ${totalLessons} lessons.`);

    // Cập nhật totalLessons cho từng course
    await Promise.all([
      Course.findByIdAndUpdate(htmlCourse._id, { totalLessons: htmlLessons.length }),
      Course.findByIdAndUpdate(jsCourse._id, { totalLessons: jsLessons.length }),
      Course.findByIdAndUpdate(pyCourse._id, { totalLessons: pyLessons.length }),
      Course.findByIdAndUpdate(reactCourse._id, { totalLessons: reactLessons.length }),
    ]);

    // ════════════════════════════════════════════════════════════
    // 7. LESSON VERSIONS (lịch sử nội dung)
    // ════════════════════════════════════════════════════════════
    logger.info('📝 Creating lesson versions...');
    const cssVersion = await LessonVersion.create({
      lessonId: htmlLessons[1]._id,
      version: 1,
      contentMarkdown: '# CSS Selectors (v1)\n\nFirst published version of the CSS selectors lesson.',
      createdBy: instructor._id,
    });
    await Lesson.findByIdAndUpdate(htmlLessons[1]._id, { currentVersionId: cssVersion._id });
    logger.info('✅ Created 1 lesson version.');

    // ════════════════════════════════════════════════════════════
    // 8. QUIZZES (lessonId là unique → 1 quiz / lesson)
    // ════════════════════════════════════════════════════════════
    logger.info('🧠 Creating quizzes...');
    const cssQuiz = await Quiz.create({
      lessonId: htmlLessons[1]._id,
      title: 'CSS Selectors Specificity Quiz',
      description: 'Test your understanding of CSS specificity, pseudo-classes and combinators.',
      passingScorePercent: 80,
      passingScore: 80,
      timeLimitSeconds: 300,
      timeLimit: 300,
      xpReward: 100,
      questions: [
        {
          questionText: 'Which selector has the highest CSS specificity?',
          options: ['Class selector (.button)', 'ID selector (#submit)', 'Element selector (button)', 'Universal selector (*)'],
          correctAnswerIndex: 1,
        },
        {
          questionText: 'What does the :hover pseudo-class do?',
          options: ['Styles on click', 'Styles on keyboard focus', 'Styles when the mouse rolls over', 'Removes the element'],
          correctAnswerIndex: 2,
        },
        {
          questionText: 'How do you select all descendants inside .main?',
          options: ['.main > *', '#main *', '.main *', 'None of the above'],
          correctAnswerIndex: 2,
        },
      ],
    });

    const jsQuiz = await Quiz.create({
      lessonId: jsLessons[2]._id,
      title: 'JavaScript Concurrency & Event Loop Quiz',
      description: 'Verify your knowledge of task queues, microtasks and async execution order.',
      passingScorePercent: 66,
      passingScore: 66,
      timeLimitSeconds: 420,
      timeLimit: 420,
      xpReward: 150,
      questions: [
        {
          questionText: 'Which queue holds promise callbacks (.then / await)?',
          options: ['Task/Callback Queue', 'Microtask Queue', 'Render Queue', 'Call Stack'],
          correctAnswerIndex: 1,
        },
        {
          questionText: 'Output order of: log(1); setTimeout(()=>log(2),0); Promise.resolve().then(()=>log(3)); log(4);',
          options: ['1,2,3,4', '1,4,2,3', '1,4,3,2', '1,3,4,2'],
          correctAnswerIndex: 2,
        },
        {
          questionText: 'Is the JavaScript engine inherently multithreaded?',
          options: ['Yes, virtual threads', 'No, single-threaded with an event loop', 'Yes, native CPU cores', 'No, it uses DB locks'],
          correctAnswerIndex: 1,
        },
      ],
    });
    logger.info(`✅ Created 2 quizzes.`);

    // ════════════════════════════════════════════════════════════
    // 9. EXERCISES (.create() để chạy pre-save hook tính totalPoints)
    // ════════════════════════════════════════════════════════════
    logger.info('🧪 Creating coding exercises...');
    await Exercise.create({
      lessonId: jsLessons[1]._id,
      title: 'Sum of an Array',
      description: 'Write a function that returns the sum of all numbers in an array.',
      starterCode: 'function sumArray(nums) {\n  // your code here\n}',
      language: 'javascript',
      timeLimitMs: 5000,
      testCases: [
        { input: '[1,2,3]', expectedOutput: '6', isHidden: false, points: 1 },
        { input: '[10,-5,5]', expectedOutput: '10', isHidden: false, points: 1 },
        { input: '[]', expectedOutput: '0', isHidden: true, points: 2 },
      ],
    });
    await Exercise.create({
      lessonId: pyLessons[1]._id,
      title: 'Reverse a String',
      description: 'Return the reversed version of the given string.',
      starterCode: 'def reverse_string(s):\n    # your code here\n    pass',
      language: 'python',
      timeLimitMs: 5000,
      testCases: [
        { input: 'hello', expectedOutput: 'olleh', isHidden: false, points: 1 },
        { input: 'abc', expectedOutput: 'cba', isHidden: true, points: 1 },
      ],
    });
    logger.info('✅ Created 2 exercises.');

    // ════════════════════════════════════════════════════════════
    // 10. ENROLLMENTS (unique theo {userId, courseId})
    // ════════════════════════════════════════════════════════════
    logger.info('🎓 Creating enrollments...');
    await Enrollment.create([
      {
        userId: jane._id, courseId: htmlCourse._id,
        progress: 100, progressPercent: 100,
        completedLessons: htmlLessons.map((l) => l._id),
        totalLessons: htmlLessons.length,
        lastLessonId: htmlLessons[2]._id,
        completed: true, completedAt: daysAgo(10),
        enrolledAt: daysAgo(40), lastAccessedAt: daysAgo(10),
      },
      {
        userId: jane._id, courseId: jsCourse._id,
        progress: 33, progressPercent: 33,
        completedLessons: [jsLessons[0]._id],
        totalLessons: jsLessons.length,
        lastLessonId: jsLessons[0]._id,
        completed: false,
        enrolledAt: daysAgo(20), lastAccessedAt: daysAgo(2),
      },
      {
        userId: bob._id, courseId: jsCourse._id,
        progress: 66, progressPercent: 66,
        completedLessons: [jsLessons[0]._id, jsLessons[1]._id],
        totalLessons: jsLessons.length,
        lastLessonId: jsLessons[1]._id,
        completed: false,
        enrolledAt: daysAgo(15), lastAccessedAt: daysAgo(3),
      },
      {
        userId: alice._id, courseId: pyCourse._id,
        progress: 0, progressPercent: 0,
        totalLessons: pyLessons.length,
        completed: false,
        enrolledAt: daysAgo(2),
      },
    ]);
    logger.info('✅ Created 4 enrollments.');

    // ════════════════════════════════════════════════════════════
    // 11. LESSON PROGRESS (unique theo {userId, lessonId})
    // ════════════════════════════════════════════════════════════
    logger.info('📈 Creating lesson progress...');
    await LessonProgress.create([
      ...htmlLessons.map((l, i) => ({
        userId: jane._id, courseId: htmlCourse._id, lessonId: l._id,
        isCompleted: true, timeSpent: 1200 + i * 300, completedAt: daysAgo(12 - i), lastAccessedAt: daysAgo(12 - i),
      })),
      { userId: jane._id, courseId: jsCourse._id, lessonId: jsLessons[0]._id, isCompleted: true, timeSpent: 1500, completedAt: daysAgo(2), lastAccessedAt: daysAgo(2) },
      { userId: bob._id, courseId: jsCourse._id, lessonId: jsLessons[0]._id, isCompleted: true, timeSpent: 1000, completedAt: daysAgo(5) },
      { userId: bob._id, courseId: jsCourse._id, lessonId: jsLessons[1]._id, isCompleted: true, timeSpent: 1800, completedAt: daysAgo(3) },
    ]);
    logger.info('✅ Created lesson progress records.');

    // ════════════════════════════════════════════════════════════
    // 12. QUIZ ATTEMPTS (answers: questionIndex -> chosen option)
    // ════════════════════════════════════════════════════════════
    logger.info('✍️  Creating quiz attempts...');
    await QuizAttempt.create([
      { quizId: cssQuiz._id, userId: jane._id, score: 100, passed: true, answers: { '0': 1, '1': 2, '2': 2 }, startedAt: daysAgo(11) },
      { quizId: jsQuiz._id, userId: bob._id, score: 33, passed: false, answers: { '0': 1, '1': 0, '2': 0 }, startedAt: daysAgo(4) },
      { quizId: jsQuiz._id, userId: bob._id, score: 100, passed: true, answers: { '0': 1, '1': 2, '2': 1 }, startedAt: daysAgo(3) },
    ]);
    logger.info('✅ Created 3 quiz attempts.');

    // ════════════════════════════════════════════════════════════
    // 13. CODE EXECUTIONS
    // ════════════════════════════════════════════════════════════
    logger.info('💻 Creating code executions...');
    await CodeExecution.create([
      {
        userId: jane._id, courseId: jsCourse._id, lessonId: jsLessons[1]._id,
        sourceCode: 'console.log([1,2,3].reduce((a,b)=>a+b,0));',
        language: 'javascript', languageId: 63, stdin: '',
        status: 'Accepted', stdout: '6\n', runtime: '0.05', memory: 1200, exitCode: 0, executedAt: daysAgo(2),
      },
      {
        userId: bob._id, lessonId: jsLessons[1]._id,
        sourceCode: 'console.log("hello"',
        language: 'javascript', languageId: 63,
        status: 'Compilation Error', stderr: 'SyntaxError: missing ) after argument list', exitCode: 1, executedAt: daysAgo(3),
      },
    ]);
    logger.info('✅ Created 2 code executions.');

    // ════════════════════════════════════════════════════════════
    // 14. COURSE REVIEWS (unique theo {userId, courseId})
    // ════════════════════════════════════════════════════════════
    logger.info('⭐ Creating course reviews...');
    await CourseReview.create([
      { userId: jane._id, courseId: htmlCourse._id, rating: 5, content: 'Fantastic intro to web development. Crystal clear explanations!', helpfulCount: 8, status: 'active' },
      { userId: bob._id, courseId: jsCourse._id, rating: 4, content: 'Solid fundamentals course, the async section is gold.', helpfulCount: 3, status: 'active' },
    ]);
    // cập nhật rating tổng hợp cho course
    await Promise.all([
      Course.findByIdAndUpdate(htmlCourse._id, { averageRating: 5, totalReviews: 1, totalEnrollments: 2 }),
      Course.findByIdAndUpdate(jsCourse._id, { averageRating: 4, totalReviews: 1, totalEnrollments: 2 }),
      Course.findByIdAndUpdate(pyCourse._id, { totalEnrollments: 1 }),
    ]);
    logger.info('✅ Created 2 course reviews.');

    // ════════════════════════════════════════════════════════════
    // 15. COMMENTS (polymorphic targetType/targetId + threaded reply)
    // ════════════════════════════════════════════════════════════
    logger.info('💬 Creating comments...');
    const rootComment = await Comment.create({
      targetType: 'LESSON', targetId: jsLessons[2]._id, lessonId: jsLessons[2]._id, courseId: jsCourse._id,
      userId: bob._id, content: 'The event loop diagram really made microtasks click for me.', status: 'active',
    });
    await Comment.create([
      {
        targetType: 'LESSON', targetId: jsLessons[2]._id, lessonId: jsLessons[2]._id, courseId: jsCourse._id,
        userId: instructor._id, parentId: rootComment._id,
        content: 'Glad it helped, Bob! Try logging timestamps to see it live.', status: 'active',
      },
      {
        targetType: 'COURSE', targetId: htmlCourse._id, courseId: htmlCourse._id,
        userId: jane._id, content: 'Best beginner course on the platform.', status: 'active', reactionCount: 4,
      },
    ]);
    logger.info('✅ Created 3 comments (1 thread + 1 course comment).');

    // ════════════════════════════════════════════════════════════
    // 16. BOOKMARKS (unique theo {userId, targetType, targetId})
    // ════════════════════════════════════════════════════════════
    logger.info('🔖 Creating bookmarks...');
    await Bookmark.create([
      { userId: jane._id, targetType: 'COURSE', targetId: jsCourse._id, title: 'JavaScript Programming Fundamentals', folder: 'To Learn', tags: ['js'], status: 'active' },
      { userId: jane._id, targetType: 'LESSON', targetId: jsLessons[2]._id, title: 'Async JS: Promises, Async/Await & Event Loop', anchorText: 'microtask queue', position: 320, note: 'Re-read before the interview.', status: 'active' },
      { userId: bob._id, targetType: 'COURSE', targetId: pyCourse._id, title: 'Python for Beginners', status: 'active' },
    ]);
    logger.info('✅ Created 3 bookmarks.');

    // ════════════════════════════════════════════════════════════
    // 17. NOTES
    // ════════════════════════════════════════════════════════════
    logger.info('🗒️  Creating notes...');
    await Note.create([
      { userId: jane._id, lessonId: jsLessons[2]._id, noteText: 'Microtasks always drain before the next macrotask.', codeSnippet: 'Promise.resolve().then(() => console.log("micro"));', anchorText: 'event loop', anchorStart: 0, anchorEnd: 10 },
      { userId: bob._id, lessonId: jsLessons[1]._id, noteText: 'reduce takes an accumulator and the current value.' },
    ]);
    logger.info('✅ Created 2 notes.');

    // ════════════════════════════════════════════════════════════
    // 18. CERTIFICATES (certificateCode unique; {userId,courseId} unique)
    // ════════════════════════════════════════════════════════════
    logger.info('🏆 Creating certificates...');
    await Certificate.create({
      userId: jane._id, courseId: htmlCourse._id,
      certificateCode: 'CERT-2026-HTML-0001',
      pdfUrl: 'https://cdn.threadlearn.com/certs/CERT-2026-HTML-0001.pdf',
      issuedAt: daysAgo(10),
    });
    logger.info('✅ Created 1 certificate.');

    // ════════════════════════════════════════════════════════════
    // 19. AI HISTORY
    // ════════════════════════════════════════════════════════════
    logger.info('🤖 Creating AI history...');
    await AIHistory.create({
      userId: jane._id, courseId: jsCourse._id, lessonId: jsLessons[1]._id,
      inputCode: 'const sum = arr => arr.reduce((a,b)=>a+b);',
      language: 'javascript',
      prompt: 'Review my reduce usage and suggest improvements.',
      response: 'Your reduce works but throws on empty arrays. Provide an initial value of 0.',
      suggestions: ['Add an initial accumulator value', 'Handle the empty-array case'],
      raceConditions: [
        'If this reducer later mutates shared state across workers, protect the accumulator or keep the calculation immutable.',
      ],
      optimizedCode: 'const sum = arr => arr.reduce((a,b)=>a+b, 0);',
      explanation: 'Supplying 0 as the initial value avoids the "Reduce of empty array with no initial value" error.',
      tokenUsage: 180,
      modelName: 'claude-opus-4-8',
      status: 'completed',
      category: 'code-review',
    });
    logger.info('✅ Created 1 AI history record.');

    // ════════════════════════════════════════════════════════════
    // 20. NOTIFICATIONS (type theo enum hợp lệ)
    // ════════════════════════════════════════════════════════════
    logger.info('🔔 Creating notifications...');
    await Notification.create([
      { userId: jane._id, title: 'Course Completed! 🎉', message: 'You completed "HTML & CSS Foundations" and earned a certificate.', type: 'COURSE_COMPLETED', link: '/courses/html-css-foundations', isRead: true, readAt: daysAgo(9) },
      { userId: jane._id, title: 'Quiz Passed!', message: 'You passed the CSS Selectors Specificity Quiz with 100%.', type: 'QUIZ_PASSED', isRead: false },
      { userId: bob._id, title: 'Keep going!', message: 'You did not reach the passing score yet. Try the JS quiz again.', type: 'QUIZ_FAILED', isRead: false },
      { userId: bob._id, title: 'Enrolled', message: 'You enrolled in "JavaScript Programming Fundamentals".', type: 'COURSE_ENROLLED', isRead: true, readAt: daysAgo(14) },
      { userId: alice._id, title: 'Welcome to ThreadLearn!', message: 'Verify your email to unlock all features.', type: 'SYSTEM', isRead: false },
      { userId: jane._id, title: 'Premium plan active', message: 'Your ThreadLearn Premium plan is active until the end of the term.', type: 'PAYMENT_SUCCESS', link: '/pricing', isRead: false },
      { userId: bob._id, title: 'Level up!', message: 'You reached level 1 after completing JavaScript practice.', type: 'LEVEL_UP', link: '/leaderboard', isRead: false },
    ]);
    logger.info('✅ Created 7 notifications.');

    // ════════════════════════════════════════════════════════════
    // 21. SUBSCRIPTION PLANS / USER SUBSCRIPTIONS / PURCHASES
    // ════════════════════════════════════════════════════════════
    logger.info('💳 Creating subscription plans and purchases...');
    const [freePlan, monthlyPlan, semesterPlan] = await SubscriptionPlan.create([
      {
        name: 'Free',
        description: 'Core courses, quizzes, progress tracking, and limited AI recommendations for students getting started.',
        price: 0,
        currency: 'VND',
        durationDays: 30,
        features: [
          'Basic courses',
          'Unlimited quiz practice',
          'IDE access',
          '10 AI recommendations per day',
        ],
        isActive: true,
      },
      {
        name: 'Premium Monthly',
        description: 'Unlock advanced concurrent programming courses, deeper AI feedback, and saved analysis history.',
        price: 99000,
        currency: 'VND',
        durationDays: 30,
        features: [
          'Advanced courses',
          'Premium AI code analysis',
          '30 AI recommendations per day',
          'Saved AI history',
          'Priority practice feedback',
        ],
        isActive: true,
      },
      {
        name: 'Premium Semester',
        description: 'Best value for WDP301 students working through the full concurrent programming roadmap.',
        price: 399000,
        currency: 'VND',
        durationDays: 180,
        features: [
          'All Premium Monthly features',
          '40 AI recommendations per day',
          'Long-term progress retention',
          'Certificate-ready learning path',
        ],
        isActive: true,
      },
    ]);

    await UserSubscription.create([
      {
        userId: jane._id,
        planId: semesterPlan._id,
        status: 'active',
        startedAt: daysAgo(10),
        expiresAt: daysFromNow(170),
      },
      {
        userId: bob._id,
        planId: freePlan._id,
        status: 'active',
        startedAt: daysAgo(20),
        expiresAt: daysFromNow(10),
      },
    ]);

    await SubscriptionPurchase.create([
      {
        userId: jane._id,
        planId: semesterPlan._id,
        amount: 399000,
        currency: 'VND',
        status: 'succeeded',
        transactionId: `seed-vnpay-${jane._id.toString()}`,
        paidAt: daysAgo(10),
      },
      {
        userId: bob._id,
        planId: monthlyPlan._id,
        amount: 99000,
        currency: 'VND',
        status: 'pending',
        transactionId: `seed-pending-${bob._id.toString()}`,
        paymentUrl: 'http://localhost:3001/mock-payment/vnpay?status=success',
      },
    ]);
    logger.info('✅ Created 3 plans, 2 subscriptions, and 2 purchase records.');

    // ════════════════════════════════════════════════════════════
    // 22. AUTH TOKENS (expiresAt phải ở TƯƠNG LAI — RefreshToken có TTL)
    // ════════════════════════════════════════════════════════════
    logger.info('🔑 Creating auth tokens...');
    await RefreshToken.create([
      { userId: jane._id, token: `seed-refresh-${jane._id.toString()}`, expiresAt: daysFromNow(7) },
      { userId: bob._id, token: `seed-refresh-${bob._id.toString()}`, expiresAt: daysFromNow(7) },
    ]);
    await EmailVerificationToken.create({
      userId: alice._id, tokenHash: `seed-email-verify-${alice._id.toString()}`, expiresAt: daysFromNow(1),
    });
    await PasswordResetToken.create({
      userId: bob._id, tokenHash: `seed-pwd-reset-${bob._id.toString()}`, expiresAt: daysFromNow(1),
    });
    logger.info('✅ Created auth tokens (2 refresh, 1 email-verify, 1 password-reset).');

    // ════════════════════════════════════════════════════════════
    logger.info('🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    logger.info('──────────────────────────────────────────────');
    logger.info('🔐 Login credentials:');
    logger.info('   ADMIN    → admin@threadlearn.com      / Admin@123');
    logger.info('   ADMIN    → instructor@threadlearn.com / Admin@123');
    logger.info('   STUDENT  → student@threadlearn.com    / Student@123');
    logger.info('   STUDENT  → bob@threadlearn.com        / Student@123');
    logger.info('   STUDENT  → alice@threadlearn.com      / Student@123 (chưa verify email)');
    logger.info('──────────────────────────────────────────────');
  } catch (error) {
    logger.error('❌ SEEDING PROCESS ENCOUNTERED CRITICAL ERROR:', error);
    await mongoose.connection.close();
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    logger.info('🔌 Database connection closed gracefully.');
    process.exit(0);
  }
}

seed();
