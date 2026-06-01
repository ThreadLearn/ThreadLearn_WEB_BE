import mongoose from 'mongoose';
import connectToDatabase from '../configs/db';
import { logger } from '../configs/logger';
import {
  User,
  UserStats,
  Course,
  Lesson,
  Quiz,
  Enrollment,
  QuizAttempt,
  RefreshToken,
  Notification,
  AIHistory,
} from './models';
import { hashPassword } from '../utils';

async function seed() {
  try {
    logger.info('🚀 Database Seeding Tool Initializing...');
    
    // Connect to Database
    await connectToDatabase();
    logger.info('🔌 Connected to MongoDB for seeding.');

    // 1. Wipe current collections
    logger.info('🗑️  Wiping existing data for core models...');
    await Promise.all([
      User.deleteMany({}),
      UserStats.deleteMany({}),
      Course.deleteMany({}),
      Lesson.deleteMany({}),
      Quiz.deleteMany({}),
      Enrollment.deleteMany({}),
      QuizAttempt.deleteMany({}),
      RefreshToken.deleteMany({}),
      Notification.deleteMany({}),
      AIHistory.deleteMany({}),
    ]);
    logger.info('✅ Database cleared of existing records.');

    // 2. Hash passwords
    logger.info('🔑 Hashing seed user passwords...');
    const adminPasswordHash = await hashPassword('Admin@123');
    const studentPasswordHash = await hashPassword('Student@123');

    // 3. Create Users
    logger.info('👤 Creating mock users...');
    const users = await User.create([
      {
        email: 'admin@threadlearn.com',
        passwordHash: adminPasswordHash,
        firstName: 'John',
        lastName: 'Admin',
        role: 'ADMIN',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=JohnAdmin',
      },
      {
        email: 'student@threadlearn.com',
        passwordHash: studentPasswordHash,
        firstName: 'Jane',
        lastName: 'Student',
        role: 'STUDENT',
        avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=JaneStudent',
      },
    ]);
    const adminUser = users[0];
    const studentUser = users[1];
    logger.info(`✅ Created 2 users: ${adminUser.email} (ADMIN), ${studentUser.email} (STUDENT)`);

    // 4. Create UserStats
    logger.info('📊 Initializing user stats...');
    await UserStats.create([
      {
        userId: adminUser._id,
        xp: 1500,
        level: 5,
        currentStreak: 4,
        highestStreak: 10,
        quizzesCompleted: 12,
        coursesCompleted: 2,
      },
      {
        userId: studentUser._id,
        xp: 0,
        level: 1,
        currentStreak: 0,
        highestStreak: 0,
        quizzesCompleted: 0,
        coursesCompleted: 0,
      },
    ]);
    logger.info('✅ Initialized user stats for John and Jane.');

    // 5. Create Courses
    logger.info('📚 Creating course catalogs...');
    const courses = await Course.create([
      {
        title: 'HTML & CSS Foundations',
        description: 'Learn the cornerstone technologies of the web. Build structural layouts, understand responsive web design, master Flexbox, Grid systems, and advanced selectors.',
        coverImage: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=600&q=80',
        isPublished: true,
      },
      {
        title: 'JavaScript Programming Fundamentals',
        description: 'Unlock the programming power of modern JavaScript. Cover variable types, control statements, arrays, callbacks, asynchronous operations, DOM interactions, and scope.',
        coverImage: 'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?auto=format&fit=crop&w=600&q=80',
        isPublished: true,
      },
      {
        title: 'Advanced React & Redux Toolkit',
        description: 'Level up your frontend engineering with React 19. Deep dive into state design, high-performance context setups, custom hooks, suspense boundaries, and RTK Query integration.',
        coverImage: 'https://images.unsplash.com/photo-1633356122102-3fd601ee4377?auto=format&fit=crop&w=600&q=80',
        isPublished: false, // Keep draft mode
      },
    ]);
    const htmlCourse = courses[0];
    const jsCourse = courses[1];
    const reactCourse = courses[2];
    logger.info(`✅ Created 3 courses: "${htmlCourse.title}", "${jsCourse.title}", "${reactCourse.title}" (draft)`);

    // 6. Create Lessons
    logger.info('📖 Populating lessons for courses...');
    
    // HTML/CSS Lessons
    const htmlLessons = await Lesson.create([
      {
        courseId: htmlCourse._id,
        title: 'Introduction to HTML & Document Structure',
        content: 'HTML (HyperText Markup Language) defines the structure of web content. In this lesson, you will learn about basic tag elements (`<h1>`, `<p>`, `<a>`, `<div>`), attributes, and standard boilerplate document design.',
        order: 1,
      },
      {
        courseId: htmlCourse._id,
        title: 'CSS Selectors & Cascade Ordering Rules',
        content: 'CSS (Cascading Style Sheets) enables styling. We cover ID selectors (`#`), Class selectors (`.`), attribute selectors, pseudo-classes like `:hover`, and the mathematical rule of specificity cascade.',
        order: 2,
      },
      {
        courseId: htmlCourse._id,
        title: 'Responsive Flexbox Layout Design',
        content: 'Flexbox yields intuitive alignment along a primary dimension. Learn how to configure a container with `display: flex`, alignment settings (`justify-content`, `align-items`), and adaptive sizing.',
        order: 3,
      },
    ]);

    // JS Lessons
    const jsLessons = await Lesson.create([
      {
        courseId: jsCourse._id,
        title: 'Variables, Strict Typing & Truthy/Falsy Rules',
        content: 'JavaScript utilizes `let`, `const`, and `var` to store references. We will detail how strict checks (`===` vs `==`) work and highlight the default truthy and falsy variables in JS runtime contexts.',
        order: 1,
      },
      {
        courseId: jsCourse._id,
        title: 'Array Methods, Map, Filter & Reduce Chains',
        content: 'Learn to manipulate lists declaratively using modern methods. Understand when to choose `.map()`, `.filter()`, and `.reduce()` to keep array manipulation functional and clean.',
        order: 2,
      },
      {
        courseId: jsCourse._id,
        title: 'Asynchronous Code: Promises, Async/Await & Event Loop',
        content: 'Explore single-threaded concurrency in JavaScript. We study how promises capture asynchronous values, write async/await blocks, and describe how tasks interact with the Event Loop.',
        order: 3,
      },
    ]);

    logger.info(`✅ Populated ${htmlLessons.length} lessons for HTML and ${jsLessons.length} lessons for JS.`);

    // 7. Create Quizzes
    logger.info('🧠 Designing interactive quizzes...');
    
    // CSS Selectors Quiz
    const cssQuiz = await Quiz.create({
      lessonId: htmlLessons[1]._id, // CSS Selectors lesson
      title: 'CSS Selectors Specifier Quiz',
      description: 'Test your understanding of CSS specificity cascade rules, pseudoclasses, and selector combinations.',
      passingScorePercent: 80,
      timeLimitSeconds: 300,
      xpReward: 100,
      questions: [
        {
          questionText: 'Which selector has the highest CSS specificity weighting?',
          options: [
            'A class selector (e.g., .button)',
            'An ID selector (e.g., #submit-btn)',
            'An element tag selector (e.g., button)',
            'A universal selector (e.g., *)'
          ],
          correctAnswerIndex: 1, // ID selector has specificity 1-0-0, class is 0-1-0, element is 0-0-1
        },
        {
          questionText: 'What is the purpose of the pseudo-class selector :hover?',
          options: [
            'Styles elements when they are clicked',
            'Styles elements when they receive keyboard focus',
            'Styles elements when a mouse pointer rolls over them',
            'Deletes elements from the DOM hierarchy'
          ],
          correctAnswerIndex: 2,
        },
        {
          questionText: 'How do you target children inside a specific container with class "main" in CSS?',
          options: [
            '.main > *',
            '#main *',
            '.main *',
            'Both .main > * and .main * are valid selection strategies depending on depth requirements'
          ],
          correctAnswerIndex: 3,
        }
      ]
    });

    // JS Event Loop Quiz
    const jsQuiz = await Quiz.create({
      lessonId: jsLessons[2]._id, // Async JS lesson
      title: 'Advanced JavaScript Concurrency & Event Loop Quiz',
      description: 'Verify your knowledge regarding task queues, microtask chains, call stacks, and async execution order.',
      passingScorePercent: 66,
      timeLimitSeconds: 420,
      xpReward: 150,
      questions: [
        {
          questionText: 'Which queue holds promises callbacks resolved via .then() or await statements?',
          options: [
            'Task Queue / Callback Queue',
            'Microtask Queue',
            'Render Queue',
            'Call Stack'
          ],
          correctAnswerIndex: 1, // Microtask Queue
        },
        {
          questionText: 'What is the absolute output sequence of: console.log("1"); setTimeout(() => console.log("2"), 0); Promise.resolve().then(() => console.log("3")); console.log("4");',
          options: [
            '1, 2, 3, 4',
            '1, 4, 2, 3',
            '1, 4, 3, 2',
            '1, 3, 4, 2'
          ],
          correctAnswerIndex: 2, // 1 and 4 sync, 3 in microtask queue (runs before task queue), 2 in macro task queue
        },
        {
          questionText: 'Is the JavaScript execution engine inherently multithreaded?',
          options: [
            'Yes, it creates virtual threads automatically',
            'No, the execution model is single-threaded using an event loop; background Web APIs handle parallel delays',
            'Yes, asynchronous syntax executes in native CPU cores concurrently',
            'No, it relies on database locks'
          ],
          correctAnswerIndex: 1,
        }
      ]
    });

    logger.info(`✅ Created 2 Quizzes: "${cssQuiz.title}" and "${jsQuiz.title}".`);

    // 8. Create Enrollment
    logger.info('🎓 Creating starter course enrollments...');
    await Enrollment.create({
      userId: studentUser._id,
      courseId: htmlCourse._id,
      progress: 33, // Done first lesson of three
      completed: false,
    });
    logger.info(`✅ Enrolled student (${studentUser.email}) in Course: "${htmlCourse.title}" (33% progress).`);

    logger.info('🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!');
  } catch (error) {
    logger.error('❌ SEEDING PROCESS ENCOUNTERED CRITICAL ERROR:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    logger.info('🔌 Database connection closed gracefully.');
    process.exit(0);
  }
}

seed();
