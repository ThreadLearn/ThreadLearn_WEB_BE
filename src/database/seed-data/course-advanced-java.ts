import { SeedCourse } from './types';
import { buildLesson, codeBlock, makeQuiz, mcq } from './lesson-builder';

/** PREMIUM — Advanced Concurrent Java complete */
export const advancedJavaCourse: SeedCourse = {
  title: 'Advanced Concurrent Java Patterns',
  slug: 'advanced-concurrent-java-patterns',
  shortDescription:
    'Premium ~5 tuần: Executor, CF, locks, collections, synchronizers, pipeline capstone.',
  description:
    'Khóa Premium Advanced: thread pools, CompletableFuture, explicit locks, concurrent collections, ' +
    'synchronizers, producer-consumer, multi-stage pipeline. Prerequisite: Java Multithreading Foundations.',
  thumbnailPhotoId: 'photo-1516116216624-53e697fedbea',
  language: 'java',
  level: 'ADVANCED',
  tags: ['java', 'executor', 'completable-future', 'locks', 'concurrent-collections', 'premium'],
  category: 'Concurrent Programming',
  isPremium: true,
  price: 249000,
  status: 'published',
  estimatedDuration: 960,
  prerequisiteSlugs: ['java-multithreading-foundations'],
  sections: [
    {
      title: 'Module 1 — Executors & async (Tuần 1–2)',
      description: 'Pool anatomy, rejection, ForkJoin, CompletableFuture.',
      lessons: [
        buildLesson({
          title: 'ExecutorService & thread pool anatomy',
          slug: 'java-executor-anatomy',
          description: 'core/max/queue/factory/rejection.',
          estimatedTime: 45,
          isPreview: true,
          lessonType: 'article',
          objectives: [
            'Mô tả thành phần ThreadPoolExecutor',
            'Chọn fixed/cached/single có trade-off',
            'Tránh unbounded queue + traffic lớn',
          ],
          sections: [
            {
              heading: 'API cơ bản',
              body: '',
              code: {
                language: 'java',
                code: `ExecutorService pool = Executors.newFixedThreadPool(8);
Future<Integer> f = pool.submit(() -> compute());
pool.shutdown();`,
              },
            },
            {
              heading: 'Thành phần',
              body: 'corePoolSize, maximumPoolSize, keepAlive, workQueue, ThreadFactory, RejectedExecutionHandler.',
            },
            {
              heading: 'Rủi ro cached/unbounded',
              body: 'newCachedThreadPool / queue unbounded có thể OOM dưới burst.',
            },
          ],
          nextUp: 'Rejection & shutdown.',
          codeSnippets: [codeBlock('java', `Executors.newFixedThreadPool(4);`)],
        }),
        buildLesson({
          title: 'Rejection policies & graceful shutdown',
          slug: 'java-rejection-shutdown',
          description: 'Abort, CallerRuns; shutdown vs shutdownNow.',
          estimatedTime: 35,
          lessonType: 'article',
          objectives: [
            'Chọn rejection policy',
            'Shutdown an toàn với awaitTermination',
            'Hiểu CallerRuns backpressure',
          ],
          sections: [
            {
              heading: 'Policies',
              body: 'Abort (default) · CallerRuns · Discard · DiscardOldest.',
            },
            {
              heading: 'Shutdown',
              body: 'shutdown() không nhận task mới; shutdownNow() interrupt + trả queued. Luôn awaitTermination + timeout + log.',
            },
          ],
          nextUp: 'ForkJoin overview.',
        }),
        buildLesson({
          title: 'ForkJoinPool & parallel streams (overview)',
          slug: 'java-forkjoin',
          description: 'Work-stealing; common pool pitfalls.',
          estimatedTime: 35,
          lessonType: 'mixed',
          objectives: [
            'Hiểu fork/join divide-and-conquer',
            'Biết parallelStream dùng common pool',
            'Tránh blocking I/O trong common pool',
          ],
          sections: [
            {
              heading: 'Work-stealing',
              body: 'Task nhỏ fork; idle worker steal. parallelStream() → common pool — đừng block I/O bên trong.',
            },
          ],
          nextUp: 'CompletableFuture.',
        }),
        buildLesson({
          title: 'CompletableFuture pipelines',
          slug: 'java-completable-future',
          description: 'thenApply/Compose/Combine; lab combineSum.',
          estimatedTime: 50,
          lessonType: 'coding',
          objectives: [
            'Phân biệt thenApply vs thenCompose',
            'Combine 2 futures',
            'exceptionally / *Async + executor',
          ],
          sections: [
            {
              heading: 'Pipeline',
              body: '',
              code: {
                language: 'java',
                code: `CompletableFuture.supplyAsync(this::fetch)
  .thenApply(this::parse)
  .thenCompose(this::enrich)
  .exceptionally(ex -> fallback)
  .join();`,
              },
            },
          ],
          exercises: [
            {
              title: 'thenCombine sum',
              description: 'Hai supplyAsync int → combine tổng.',
              language: 'java',
              timeLimitMs: 8000,
              starterCode: `// Pseudo: combineSum() using CompletableFuture\n`,
              testCases: [{ input: '3 and 4', expectedOutput: '7', isHidden: false, points: 4 }],
            },
          ],
          nextUp: 'Module 2 locks.',
        }),
      ],
    },
    {
      title: 'Module 2 — Locks & coordination (Tuần 3–4)',
      description: 'Locks, collections, synchronizers, P-C.',
      lessons: [
        buildLesson({
          title: 'ReentrantLock & ReadWriteLock',
          slug: 'java-explicit-locks',
          description: 'tryLock, fair, conditions.',
          estimatedTime: 40,
          lessonType: 'mixed',
          objectives: [
            'tryLock với timeout',
            'Luôn unlock trong finally',
            'ReadWriteLock read-heavy',
          ],
          sections: [
            {
              heading: 'ReentrantLock',
              body: '',
              code: {
                language: 'java',
                code: `Lock lock = new ReentrantLock();
if (lock.tryLock(100, TimeUnit.MILLISECONDS)) {
  try { /* ... */ } finally { lock.unlock(); }
}`,
              },
            },
          ],
          nextUp: 'Concurrent collections.',
        }),
        buildLesson({
          title: 'Concurrent collections deep dive',
          slug: 'java-concurrent-collections',
          description: 'CHM, COW, BlockingQueue.',
          estimatedTime: 40,
          lessonType: 'article',
          objectives: [
            'Chọn ConcurrentHashMap vs Hashtable sync',
            'Biết COW write-cost',
            'Chọn BlockingQueue bounded',
          ],
          sections: [
            {
              heading: 'Lựa chọn',
              body:
                'CHM: nhiều thread đọc/ghi map.\n' +
                'CopyOnWriteArrayList: đọc nhiều ghi hiếm.\n' +
                'ArrayBlockingQueue: bounded backpressure.',
            },
          ],
          nextUp: 'Synchronizers.',
        }),
        buildLesson({
          title: 'CountDownLatch, CyclicBarrier, Semaphore, Phaser',
          slug: 'java-synchronizers',
          description: 'Coordination primitives.',
          estimatedTime: 40,
          lessonType: 'mixed',
          objectives: [
            'Latch one-shot start/done',
            'Barrier N parties',
            'Semaphore rate limit',
          ],
          sections: [
            {
              heading: 'Bảng',
              body:
                '| Tool | Use |\n|---|---|\n| CountDownLatch | wait N events one-shot |\n| CyclicBarrier | gặp nhau, reusable |\n| Semaphore | permits |\n| Phaser | multi-phase flexible |',
              code: {
                language: 'java',
                code: `CountDownLatch ready = new CountDownLatch(1);
CountDownLatch done = new CountDownLatch(N);
// workers await ready; main countDown; workers countDown done; main await done`,
              },
            },
          ],
          nextUp: 'Producer-Consumer.',
        }),
        buildLesson({
          title: 'Producer–Consumer & backpressure',
          slug: 'java-producer-consumer',
          description: 'Bounded queue; poison pill; lab.',
          estimatedTime: 45,
          lessonType: 'coding',
          objectives: [
            'Dùng BlockingQueue put/take',
            'Bounded = backpressure',
            'Poison pill dừng consumer',
          ],
          sections: [
            {
              heading: 'Pattern',
              body: 'put block khi đầy; take block khi rỗng. Nhiều consumer OK với queue thread-safe.',
            },
          ],
          exercises: [
            {
              title: 'Bounded buffer consume count',
              description: 'Producer N, capacity 2, consumer đếm N.',
              language: 'java',
              timeLimitMs: 10000,
              starterCode: `// implement consumeCount(n) with ArrayBlockingQueue\n`,
              testCases: [
                { input: 'N=5', expectedOutput: '5', isHidden: false, points: 3 },
                { input: 'N=20', expectedOutput: '20', isHidden: true, points: 4 },
              ],
            },
          ],
          nextUp: 'Module 3 capstone.',
        }),
      ],
    },
    {
      title: 'Module 3 — Capstone (Tuần 5)',
      description: 'Deadlock tools, pipeline, final.',
      lessons: [
        buildLesson({
          title: 'Deadlock diagnosis & timed locks',
          slug: 'java-deadlock-tools',
          description: 'jstack, ThreadMXBean, tryLock.',
          estimatedTime: 30,
          lessonType: 'article',
          objectives: ['Dùng jstack/MXBean', 'tryLock strategy', 'Lock ordering reminder'],
          sections: [
            {
              heading: 'Tools',
              body: 'jstack pid · findDeadlockedThreads · metrics hold time · tryLock timeout.',
            },
          ],
          nextUp: 'Pipeline capstone.',
        }),
        buildLesson({
          title: 'Capstone: Concurrent processing pipeline',
          slug: 'java-capstone-pipeline',
          description: 'Ingest→parse→enrich→write.',
          estimatedTime: 60,
          lessonType: 'assignment',
          objectives: [
            'Thiết kế 4 stage + queues',
            'Backpressure bounded',
            'Graceful shutdown',
          ],
          sections: [
            {
              heading: 'Stages',
              body:
                '1. Ingest → Q1\n2. Parse pool Q1→Q2\n3. Enrich pool Q2→Q3\n4. Writer Q3→sink\n\n' +
                'Bounded queues · poison pill/latch · error isolation · log metrics.',
            },
          ],
          exercises: [
            {
              title: 'Pipeline stage counter',
              description: 'stageProcess(queue, n) → success count.',
              language: 'java',
              timeLimitMs: 10000,
              starterCode: `// stageProcess(queue, n) -> success count\n`,
              testCases: [{ input: '10 jobs', expectedOutput: '10', isHidden: false, points: 4 }],
            },
          ],
          nextUp: 'Final quiz.',
        }),
        buildLesson({
          title: 'Final Quiz: Advanced Concurrent Java',
          slug: 'java-advanced-final-quiz',
          description: 'Pools, CF, locks, collections.',
          estimatedTime: 35,
          lessonType: 'quiz',
          showIdeNote: false,
          objectives: ['Đạt ≥ 75%'],
          sections: [{ heading: 'Phạm vi', body: 'Toàn khóa Advanced Java.' }],
          quiz: makeQuiz(
            'Final — Advanced Concurrent Java',
            'Premium final',
            [
              mcq('newFixedThreadPool(n) core?', ['0', 'n', 'MAX', '1'], 1),
              mcq('CallerRuns khi đầy?', ['Drop', 'Chạy trên caller', 'Crash JVM', 'Unbounded thread'], 1),
              mcq('thenCompose vs thenApply?', ['Không khác', 'Compose flatmap Future; Apply map value', 'Compose sync only', 'Apply parallel only'], 1),
              mcq('BlockingQueue.put đầy?', ['false', 'block', 'throw always', 'overwrite'], 1),
              mcq('CountDownLatch reuse sau 0?', ['Như barrier', 'Không one-shot', 'Fair only', 'Tự reset'], 1),
            ],
            { passingScorePercent: 75, timeLimitSeconds: 900, xpReward: 200 },
          ),
          nextUp: 'Draft AI-Assisted Concurrency Debugging (optional).',
        }),
      ],
    },
  ],
};
