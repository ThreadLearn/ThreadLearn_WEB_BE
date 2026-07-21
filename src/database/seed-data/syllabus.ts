/**
 * BƯỚC 1 — Syllabus chuẩn ThreadLearn (Concurrent Programming)
 * Nguồn sự thật cho lộ trình, outcomes, thời lượng. Course files bám syllabus này.
 */

export interface SyllabusModule {
  id: string;
  title: string;
  weeks: string;
  outcomes: string[];
  lessonSlugs: string[];
}

export interface CourseSyllabus {
  slug: string;
  title: string;
  tier: 'FREE' | 'PREMIUM' | 'DRAFT';
  language: 'javascript' | 'java';
  level: string;
  totalHours: number;
  prerequisites: string[];
  courseOutcomes: string[];
  modules: SyllabusModule[];
  capstone: string;
  assessments: string[];
}

export const SYLLABUS: CourseSyllabus[] = [
  {
    slug: 'js-concurrency-fundamentals',
    title: 'JavaScript Concurrency Fundamentals',
    tier: 'FREE',
    language: 'javascript',
    level: 'BEGINNER',
    totalHours: 18,
    prerequisites: [],
    courseOutcomes: [
      'Giải thích concurrent vs parallel và vị trí của JS runtime',
      'Đọc đúng thứ tự event loop (microtask/macrotask)',
      'Thiết kế async flow với Promise, async/await, combinators, AbortController',
      'Nhận diện và giảm race condition logic trên shared state',
      'Implement JobQueue giới hạn concurrency (capstone)',
    ],
    modules: [
      {
        id: 'js-m1',
        title: 'Module 1 — Runtime & Event Loop',
        weeks: 'Tuần 1–2',
        outcomes: ['Phân biệt concurrent/parallel', 'Mô tả engine/host/loop', 'Giải A-D-C-B'],
        lessonSlugs: [
          'js-concurrent-vs-parallel',
          'js-runtime-architecture',
          'js-call-stack-heap',
          'js-event-loop-deep',
        ],
      },
      {
        id: 'js-m2',
        title: 'Module 2 — Async primitives',
        weeks: 'Tuần 3–5',
        outcomes: ['Promise lifecycle', 'async song song an toàn', 'Abort & combinators'],
        lessonSlugs: [
          'js-callbacks-hell',
          'js-promises-deep',
          'js-async-await-mastery',
          'js-promise-combinators',
          'js-abort-controller',
        ],
      },
      {
        id: 'js-m3',
        title: 'Module 3 — Races & safe patterns',
        weeks: 'Tuần 6–7',
        outcomes: ['Race logic', 'Mutex/queue', 'Debounce/coalesce'],
        lessonSlugs: [
          'js-logic-race-conditions',
          'js-promise-mutex',
          'js-debounce-throttle-coalesce',
          'js-midterm-quiz',
        ],
      },
      {
        id: 'js-m4',
        title: 'Module 4 — Capstone & assessment',
        weeks: 'Tuần 8',
        outcomes: ['Streams overview', 'Production checklist', 'JobQueue', 'Final quiz'],
        lessonSlugs: [
          'js-streams-backpressure',
          'js-async-api-checklist',
          'js-capstone-job-queue',
          'js-final-quiz',
        ],
      },
    ],
    capstone: 'Concurrent Job Queue (concurrency limit, isolation lỗi, optional retry)',
    assessments: ['Midterm quiz Module 1–2', 'Final quiz', 'JobQueue lab', '2 coding exercises'],
  },
  {
    slug: 'java-multithreading-foundations',
    title: 'Java Multithreading Foundations',
    tier: 'FREE',
    language: 'java',
    level: 'BEGINNER',
    totalHours: 18,
    prerequisites: [],
    courseOutcomes: [
      'Phân biệt process/thread và mô hình bộ nhớ JVM',
      'Tạo và quản lý lifecycle thread đúng cách',
      'Dùng synchronized, volatile, AtomicInteger đúng ngữ cảnh',
      'Phân tích deadlock cơ bản và wait/notify',
      'Xây BankAccount thread-safe (capstone)',
    ],
    modules: [
      {
        id: 'jv-m1',
        title: 'Module 1 — Threads & lifecycle',
        weeks: 'Tuần 1–2',
        outcomes: ['Process vs thread', 'start/run/join', 'lifecycle', 'interrupt/daemon'],
        lessonSlugs: [
          'java-process-vs-thread',
          'java-create-threads',
          'java-thread-lifecycle',
          'java-interrupt-daemon',
        ],
      },
      {
        id: 'jv-m2',
        title: 'Module 2 — Sync & visibility',
        weeks: 'Tuần 3–5',
        outcomes: ['synchronized', 'lost update', 'volatile/JMM', 'AtomicInteger'],
        lessonSlugs: [
          'java-synchronized-deep',
          'java-lost-updates',
          'java-volatile-jmm',
          'java-atomic-integer',
        ],
      },
      {
        id: 'jv-m3',
        title: 'Module 3 — Coordination & hazards',
        weeks: 'Tuần 6–7',
        outcomes: ['wait/notify', 'deadlock', 'livelock', 'midterm'],
        lessonSlugs: [
          'java-wait-notify',
          'java-deadlock',
          'java-livelock-starvation',
          'java-midterm-quiz',
        ],
      },
      {
        id: 'jv-m4',
        title: 'Module 4 — Capstone & final',
        weeks: 'Tuần 8',
        outcomes: ['Safe publication', 'BankAccount', 'Final quiz'],
        lessonSlugs: ['java-safe-publication', 'java-capstone-bank', 'java-final-quiz'],
      },
    ],
    capstone: 'Thread-safe BankAccount + transfer không deadlock + stress invariant',
    assessments: ['Midterm', 'Final', 'Counter lab', 'Atomic lab', 'BankAccount capstone'],
  },
  {
    slug: 'parallel-js-workers-shared-memory',
    title: 'Parallel JavaScript: Workers & Shared Memory',
    tier: 'PREMIUM',
    language: 'javascript',
    level: 'INTERMEDIATE',
    totalHours: 14,
    prerequisites: ['js-concurrency-fundamentals'],
    courseOutcomes: [
      'Offload CPU bằng Web Worker / worker_threads',
      'Thiết kế message protocol & transferables',
      'Dùng SharedArrayBuffer + Atomics an toàn',
      'Xây parallel map với worker pool (capstone)',
    ],
    modules: [
      {
        id: 'pw-m1',
        title: 'Module 1 — Workers & messaging',
        weeks: 'Tuần 1–2',
        outcomes: ['Khi nào worker', 'Web/Node workers', 'transfer/channel'],
        lessonSlugs: [
          'js-when-workers',
          'js-web-workers',
          'js-node-worker-threads',
          'js-transferables-channel',
        ],
      },
      {
        id: 'pw-m2',
        title: 'Module 2 — Pools & shared memory',
        weeks: 'Tuần 3–4',
        outcomes: ['Worker pool', 'SAB', 'Atomics', 'wait/notify'],
        lessonSlugs: [
          'js-worker-pool',
          'js-sharedarraybuffer',
          'js-atomics-rmw',
          'js-atomics-wait-notify',
        ],
      },
      {
        id: 'pw-m3',
        title: 'Module 3 — Hazards & capstone',
        weeks: 'Tuần 5',
        outcomes: ['Data race', 'parallelMap', 'Final'],
        lessonSlugs: [
          'js-data-race-false-sharing',
          'js-capstone-parallel-map',
          'js-parallel-final-quiz',
        ],
      },
    ],
    capstone: 'parallelMap với worker pool, merge đúng thứ tự',
    assessments: ['Final quiz', 'fib worker lab', 'Atomics lab', 'parallelMap capstone'],
  },
  {
    slug: 'advanced-concurrent-java-patterns',
    title: 'Advanced Concurrent Java Patterns',
    tier: 'PREMIUM',
    language: 'java',
    level: 'ADVANCED',
    totalHours: 16,
    prerequisites: ['java-multithreading-foundations'],
    courseOutcomes: [
      'Thiết kế thread pool & shutdown an toàn',
      'Compose async với CompletableFuture',
      'Chọn lock/collection/synchronizer phù hợp',
      'Xây multi-stage concurrent pipeline (capstone)',
    ],
    modules: [
      {
        id: 'ja-m1',
        title: 'Module 1 — Executors & async',
        weeks: 'Tuần 1–2',
        outcomes: ['Pool anatomy', 'rejection/shutdown', 'ForkJoin', 'CF'],
        lessonSlugs: [
          'java-executor-anatomy',
          'java-rejection-shutdown',
          'java-forkjoin',
          'java-completable-future',
        ],
      },
      {
        id: 'ja-m2',
        title: 'Module 2 — Locks & coordination',
        weeks: 'Tuần 3–4',
        outcomes: ['Explicit locks', 'collections', 'synchronizers', 'P-C'],
        lessonSlugs: [
          'java-explicit-locks',
          'java-concurrent-collections',
          'java-synchronizers',
          'java-producer-consumer',
        ],
      },
      {
        id: 'ja-m3',
        title: 'Module 3 — Capstone',
        weeks: 'Tuần 5',
        outcomes: ['Deadlock tools', 'Pipeline', 'Final'],
        lessonSlugs: [
          'java-deadlock-tools',
          'java-capstone-pipeline',
          'java-advanced-final-quiz',
        ],
      },
    ],
    capstone: 'Ingest→parse→enrich→write pipeline với backpressure',
    assessments: ['Final quiz', 'CF lab', 'PC lab', 'Pipeline capstone'],
  },
  {
    slug: 'ai-assisted-concurrency-debugging',
    title: 'AI-Assisted Concurrency Debugging',
    tier: 'DRAFT',
    language: 'javascript',
    level: 'ADVANCED',
    totalHours: 6,
    prerequisites: ['js-concurrency-fundamentals', 'java-multithreading-foundations'],
    courseOutcomes: [
      'Mô tả pipeline AI ThreadLearn',
      'Hiểu pattern catalog race/deadlock',
      'Workflow IDE + AI + feedback',
    ],
    modules: [
      {
        id: 'ai-m1',
        title: 'Module 1 — AI pipeline',
        weeks: 'Draft',
        outcomes: ['Arch', 'AST patterns', 'BM25/LLM', 'Workflow', 'Quiz'],
        lessonSlugs: [
          'ai-arch-overview',
          'ai-ast-patterns',
          'ai-bm25-llm',
          'ai-ide-workflow',
          'ai-draft-quiz',
        ],
      },
    ],
    capstone: 'N/A (draft)',
    assessments: ['Draft quiz'],
  },
];

export function printSyllabusSummary(): string {
  return SYLLABUS.map((c) => {
    const lessons = c.modules.reduce((n, m) => n + m.lessonSlugs.length, 0);
    return `${c.tier} | ${c.slug} | ${lessons} lessons | ~${c.totalHours}h | capstone: ${c.capstone}`;
  }).join('\n');
}
