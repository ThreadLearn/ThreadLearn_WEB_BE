import { SeedCourse } from './types';
import { buildLesson, codeBlock, makeQuiz, mcq } from './lesson-builder';

/** PREMIUM — Parallel JS complete */
export const parallelJsCourse: SeedCourse = {
  title: 'Parallel JavaScript: Workers & Shared Memory',
  slug: 'parallel-js-workers-shared-memory',
  shortDescription:
    'Premium ~5 tuần: Workers, pools, SAB, Atomics, capstone parallelMap.',
  description:
    'Khóa Premium Intermediate: offload CPU bằng workers, message/transfer, SharedArrayBuffer + Atomics, ' +
    'worker pool, parallelMap capstone. Prerequisite: JS Concurrency Fundamentals.',
  thumbnailPhotoId: 'photo-1555066931-4365d14bab8c',
  language: 'javascript',
  level: 'INTERMEDIATE',
  tags: ['javascript', 'worker-threads', 'sharedarraybuffer', 'atomics', 'parallel', 'premium'],
  category: 'Concurrent Programming',
  isPremium: true,
  price: 199000,
  status: 'published',
  estimatedDuration: 840,
  prerequisiteSlugs: ['js-concurrency-fundamentals'],
  sections: [
    {
      title: 'Module 1 — Workers & messaging (Tuần 1–2)',
      description: 'Khi nào worker, Web/Node, transfer, channel.',
      lessons: [
        buildLesson({
          title: 'Khi nào cần Worker? CPU-bound vs I/O-bound',
          slug: 'js-when-workers',
          description: 'Offload CPU; chi phí serialize.',
          estimatedTime: 35,
          isPreview: true,
          lessonType: 'article',
          objectives: [
            'Chọn worker vs async I/O',
            'Ước lượng chi phí postMessage',
            'Biết transfer giảm copy',
          ],
          sections: [
            {
              heading: 'Bảng quyết định',
              body:
                '| Workload | Gợi ý |\n|---|---|\n| Network/DB I/O | async main đủ |\n| Image/crypto/parse lớn | **Worker** |\n| Shared counter đa thread | SAB + Atomics |\n\n' +
                'Main thread bị block → jank UI / latency API Node.',
            },
            {
              heading: 'Chi phí',
              body: 'structured clone có thể đắt. Transfer ArrayBuffer khi pipeline big data.',
            },
          ],
          nextUp: 'Web Workers API.',
        }),
        buildLesson({
          title: 'Web Workers API (browser)',
          slug: 'js-web-workers',
          description: 'new Worker, message, terminate, module workers.',
          estimatedTime: 40,
          lessonType: 'mixed',
          objectives: [
            'Tạo worker và postMessage',
            'Biết worker không DOM',
            'Handle error/terminate',
          ],
          sections: [
            {
              heading: 'API cơ bản',
              body: '',
              code: {
                language: 'javascript',
                code: `const w = new Worker('worker.js', { type: 'module' });
w.postMessage({ type: 'start', payload: 42 });
w.onmessage = (e) => console.log(e.data);
w.onerror = console.error;
// w.terminate();`,
              },
            },
            {
              heading: 'Giới hạn',
              body: 'Không DOM/window. Giao tiếp message hoặc SAB (nếu isolated).',
            },
          ],
          nextUp: 'Node worker_threads.',
          codeSnippets: [
            codeBlock('javascript', `const w = new Worker('worker.js');\nw.postMessage({ n: 40 });`),
          ],
        }),
        buildLesson({
          title: 'Node.js worker_threads',
          slug: 'js-node-worker-threads',
          description: 'Worker, parentPort, workerData; lab fib.',
          estimatedTime: 45,
          lessonType: 'coding',
          objectives: [
            'Spawn worker với workerData',
            'Giao tiếp parentPort',
            'Viết protocol {n} → {result}',
          ],
          sections: [
            {
              heading: 'Main + worker',
              body: '',
              code: {
                language: 'javascript',
                code: `// main
const { Worker } = require('worker_threads');
const w = new Worker('./worker.js', { workerData: { n: 40 } });
w.on('message', console.log);

// worker.js
const { parentPort, workerData } = require('worker_threads');
parentPort.postMessage(fib(workerData.n));`,
              },
            },
            {
              heading: 'Isolate',
              body: 'Mỗi worker có V8 isolate + event loop riêng — không share object JS thường.',
            },
          ],
          exercises: [
            {
              title: 'Fibonacci worker message protocol',
              description: 'handle({n}) → fib iterative; trả result.',
              language: 'javascript',
              timeLimitMs: 8000,
              starterCode: `function fib(n) { /* TODO */ }\nfunction handle(msg) { /* TODO */ }\n`,
              testCases: [
                { input: 'n=10', expectedOutput: '55', isHidden: false, points: 3 },
                { input: 'n=0', expectedOutput: '0', isHidden: true, points: 2 },
              ],
            },
          ],
          nextUp: 'Transferables & MessageChannel.',
        }),
        buildLesson({
          title: 'Transferables & MessageChannel',
          slug: 'js-transferables-channel',
          description: 'Zero-copy; ports pipeline.',
          estimatedTime: 35,
          lessonType: 'article',
          objectives: [
            'Transfer ArrayBuffer đúng',
            'Giải thích sender mất access',
            'Biết MessageChannel use case',
          ],
          sections: [
            {
              heading: 'Transfer',
              body: '',
              code: {
                language: 'javascript',
                code: `worker.postMessage(buffer, [buffer]); // zero-copy ownership`,
              },
            },
            {
              heading: 'MessageChannel',
              body: 'Tạo cặp port cho pipeline worker↔worker hoặc main↔worker phức tạp.',
            },
          ],
          nextUp: 'Module 2: pools & SAB.',
        }),
      ],
    },
    {
      title: 'Module 2 — Pools & shared memory (Tuần 3–4)',
      description: 'Worker pool, SAB, Atomics, wait/notify.',
      lessons: [
        buildLesson({
          title: 'Worker pool pattern',
          slug: 'js-worker-pool',
          description: 'Reuse N workers; job queue.',
          estimatedTime: 40,
          lessonType: 'mixed',
          objectives: [
            'Thiết kế pool N worker',
            'Queue job khi bận',
            'Liên hệ JobQueue FREE course',
          ],
          sections: [
            {
              heading: 'Ý tưởng',
              body:
                'Spawn N worker cố định; idle list; queue jobs; gán khi idle. ' +
                'Tránh spawn/teardown mỗi task (tốn kém).',
            },
          ],
          nextUp: 'SharedArrayBuffer.',
        }),
        buildLesson({
          title: 'SharedArrayBuffer fundamentals',
          slug: 'js-sharedarraybuffer',
          description: 'Shared bytes; COOP/COEP; data race risk.',
          estimatedTime: 40,
          lessonType: 'article',
          objectives: [
            'Tạo SAB + TypedArray view',
            'Biết yêu cầu cross-origin isolation',
            'Nhận non-atomic RMW là data race',
          ],
          sections: [
            {
              heading: 'Mô hình',
              body: 'Nhiều thread cùng vùng nhớ. `view[0]=view[0]+1` không Atomics → data race.',
            },
            {
              heading: 'Browser security',
              body: 'Sau Spectre: cần COOP/COEP để enable SAB.',
            },
          ],
          nextUp: 'Atomics RMW.',
        }),
        buildLesson({
          title: 'Atomics: RMW, load/store, compareExchange',
          slug: 'js-atomics-rmw',
          description: 'Atomic ops; lab safeAdd.',
          estimatedTime: 45,
          lessonType: 'coding',
          objectives: [
            'Dùng Atomics.add/load/store/cas',
            'Tránh RMW tay trên SAB',
            'Hoàn thành safeAdd',
          ],
          sections: [
            {
              heading: 'API',
              body: '',
              code: {
                language: 'javascript',
                code: `const sab = new SharedArrayBuffer(4);
const view = new Int32Array(sab);
Atomics.store(view, 0, 0);
Atomics.add(view, 0, 1);
Atomics.compareExchange(view, 0, expected, replacement);`,
              },
            },
          ],
          exercises: [
            {
              title: 'safeAdd với Atomics',
              description: 'safeAdd(view, delta) dùng Atomics.add index 0.',
              language: 'javascript',
              timeLimitMs: 5000,
              starterCode: `function safeAdd(view, delta) {\n  // TODO\n}\n`,
              testCases: [
                { input: 'add 1 from 0', expectedOutput: '1', isHidden: false, points: 2 },
                { input: 'add 5 x3', expectedOutput: '15', isHidden: true, points: 3 },
              ],
            },
          ],
          nextUp: 'Atomics.wait/notify.',
          codeSnippets: [
            codeBlock('javascript', `function safeAdd(view, d){ return Atomics.add(view, 0, d); }`),
          ],
        }),
        buildLesson({
          title: 'Atomics.wait / notify (futex-style)',
          slug: 'js-atomics-wait-notify',
          description: 'Block trên worker; so sánh Java wait.',
          estimatedTime: 35,
          lessonType: 'article',
          objectives: [
            'Dùng wait/notify đúng thread',
            'Biết không wait trên main browser',
            'So sánh Object.wait Java',
          ],
          sections: [
            {
              heading: 'API',
              body: '',
              code: {
                language: 'javascript',
                code: `// worker
Atomics.wait(view, 0, expected);
// main/other
Atomics.notify(view, 0, 1);`,
              },
            },
          ],
          nextUp: 'Module 3 hazards & capstone.',
        }),
      ],
    },
    {
      title: 'Module 3 — Hazards & capstone (Tuần 5)',
      description: 'Data race, parallelMap, final quiz.',
      lessons: [
        buildLesson({
          title: 'Data race, false sharing & memory ordering (overview)',
          slug: 'js-data-race-false-sharing',
          description: 'UB logic; cache line contention.',
          estimatedTime: 35,
          lessonType: 'article',
          objectives: ['Định nghĩa data race', 'False sharing overview', 'Luôn Atomics cho RMW SAB'],
          sections: [
            {
              heading: 'Data race',
              body: 'Hai thread, ≥1 write, cùng location, không sync → kết quả không xác định.',
            },
            {
              heading: 'False sharing',
              body: 'Ghi biến khác nhau nhưng cùng cache line → perf giảm. Padding khi optimize sâu.',
            },
          ],
          nextUp: 'Capstone parallelMap.',
        }),
        buildLesson({
          title: 'Capstone: Parallel map với worker pool',
          slug: 'js-capstone-parallel-map',
          description: 'Chunk → pool → merge order; lab chunkArray.',
          estimatedTime: 55,
          lessonType: 'assignment',
          objectives: [
            'Chia mảng chunk',
            'Giới hạn concurrency workers',
            'Merge đúng thứ tự index',
          ],
          sections: [
            {
              heading: 'Yêu cầu',
              body:
                'parallelMap(arr, workerScript, concurrency):\n' +
                '1. Chunk input\n2. ≤ concurrency workers\n3. Merge đúng order\n4. Fail → reject rõ\n5. Bonus transfer TypedArray',
            },
          ],
          exercises: [
            {
              title: 'chunkArray helper',
              description: 'chunkArray(arr, size) → chunks; last có thể ngắn.',
              language: 'javascript',
              timeLimitMs: 5000,
              starterCode: `function chunkArray(arr, size) {\n  // TODO\n}\n`,
              testCases: [
                { input: '[1,2,3,4,5] size 2', expectedOutput: '[[1,2],[3,4],[5]]', isHidden: false, points: 3 },
              ],
            },
          ],
          nextUp: 'Final quiz.',
        }),
        buildLesson({
          title: 'Final Quiz: Parallel JS',
          slug: 'js-parallel-final-quiz',
          description: 'Workers, SAB, Atomics.',
          estimatedTime: 30,
          lessonType: 'quiz',
          showIdeNote: false,
          objectives: ['Đạt ≥ 75%'],
          sections: [{ heading: 'Phạm vi', body: 'Toàn khóa Premium Parallel JS.' }],
          quiz: makeQuiz(
            'Final — Parallel JS Workers & Shared Memory',
            'Premium final',
            [
              mcq('Worker giao tiếp mặc định?', ['Shared DOM', 'postMessage', 'Global var', 'SQL'], 1),
              mcq('view[0]=view[0]+1 trên SAB multi-thread?', ['An toàn', 'Data race', 'Tự Atomics', 'Chỉ fail Node'], 1),
              mcq('Atomics.add?', ['Parse HTML', 'Atomic RMW TypedArray shared', 'Tạo DOM', 'CORS'], 1),
              mcq('Transfer ArrayBuffer?', ['AES', 'Zero-copy ownership', 'GC slower always', 'eval'], 1),
              mcq('Atomics.wait main browser?', ['OK', 'Throw / không cho phép', '→ setTimeout', 'Chỉ Firefox'], 1),
            ],
            { passingScorePercent: 75, timeLimitSeconds: 720, xpReward: 180 },
          ),
          nextUp: 'Có thể học Advanced Concurrent Java song song track.',
        }),
      ],
    },
  ],
};
