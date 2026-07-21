import { SeedCourse } from './types';
import { buildLesson, codeBlock, makeQuiz, mcq } from './lesson-builder';

/** FREE — JS Concurrency Fundamentals — complete course (syllabus aligned) */
export const jsFundamentalsCourse: SeedCourse = {
  title: 'JavaScript Concurrency Fundamentals',
  slug: 'js-concurrency-fundamentals',
  shortDescription:
    'Lộ trình 8 tuần: event loop, Promise/async, race logic, pattern an toàn, capstone JobQueue.',
  description:
    'Khóa FREE nền tảng Concurrent Programming với JavaScript cho SV CNTT. ' +
    'Outcomes: đọc event loop, thiết kế async an toàn, giảm race condition, hoàn thành JobQueue. ' +
    'Chuẩn bị cho Premium Parallel JS (Workers/Atomics).',
  thumbnailPhotoId: 'photo-1579468118864-1b9ea3c0db4a',
  language: 'javascript',
  level: 'BEGINNER',
  tags: ['javascript', 'concurrency', 'event-loop', 'promises', 'async-await', 'race-condition'],
  category: 'Concurrent Programming',
  isPremium: false,
  price: 0,
  status: 'published',
  estimatedDuration: 1080,
  prerequisiteThreshold: 80,
  sections: [
    {
      title: 'Module 1 — Runtime & Event Loop (Tuần 1–2)',
      description: 'Concurrent vs parallel, kiến trúc runtime, call stack, event loop.',
      lessons: [
        buildLesson({
          title: 'Concurrent vs Parallel: bản đồ khái niệm',
          slug: 'js-concurrent-vs-parallel',
          description: 'Định nghĩa concurrency/parallelism và vị trí của JavaScript.',
          estimatedTime: 35,
          isPreview: true,
          lessonType: 'article',
          objectives: [
            'Phân biệt concurrency và parallelism bằng ví dụ đời thực',
            'Mô tả JS: concurrent I/O mạnh, parallel CPU cần Worker',
            'Nêu 4 outcome chính của khóa FREE này',
            'Liên hệ race logic dù engine single-threaded',
          ],
          sections: [
            {
              heading: 'Định nghĩa chuẩn',
              body:
                '**Concurrency** là cấu trúc chương trình cho phép nhiều task *đang tiến triển* ' +
                'trong cùng khoảng thời gian — có thể xen kẽ trên một core.\n\n' +
                '**Parallelism** là thực thi *cùng lúc* trên nhiều core/CPU.\n\n' +
                'Ẩn dụ nhà bếp: một đầu bếp làm nhiều món (concurrent); nhiều đầu bếp cùng nấu (parallel). ' +
                'Một hệ thống có thể concurrent nhưng không parallel (JS main thread + event loop).',
            },
            {
              heading: 'JavaScript nằm ở đâu trên bản đồ?',
              body:
                '| Thành phần | Vai trò |\n|---|---|\n' +
                '| Engine (V8…) | Một call stack cho JS thường |\n' +
                '| Host (browser/Node) | Timers, network, FS + event loop |\n' +
                '| Worker | Isolate riêng → parallel CPU |\n\n' +
                'Hầu hết web app sống ở **I/O concurrency**. CPU-bound dài trên main thread làm đơ UI/API.',
              code: {
                language: 'javascript',
                caption: 'Concurrent I/O vs CPU-bound',
                code: `// Concurrent I/O — tốt
await Promise.all([fetch('/a'), fetch('/b')]);

// CPU-bound trên main — chặn event loop
let s = 0;
for (let i = 0; i < 5e8; i++) s += i;

// Parallel CPU → Worker (khóa Premium)
// new Worker('./heavy.js')`,
              },
            },
            {
              heading: 'Vì sao vẫn có “race” trong JS?',
              body:
                'Dù một thời điểm chỉ một đoạn JS chạy trên một stack, \`await\` **tạm dừng hàm** và cho ' +
                'continuation khác chạy. Shared mutable state (biến module, object) có thể bị đọc/ghi ' +
                'theo thứ tự không mong muốn — gọi là **logic race**, khác data race C++/SAB.',
            },
            {
              heading: 'Lộ trình khóa học (8 tuần gợi ý)',
              body:
                '1. Module 1: Runtime & event loop\n' +
                '2. Module 2: Promise, async/await, combinators, AbortController\n' +
                '3. Module 3: Race, mutex, debounce/coalesce + midterm\n' +
                '4. Module 4: Checklist production + **capstone JobQueue** + final quiz',
            },
          ],
          pitfalls: [
            'Nhầm concurrent = luôn dùng nhiều CPU',
            'Cho rằng single-thread ⇒ không bao giờ race',
            'Tối ưu parallel sớm khi bottleneck là I/O',
          ],
          selfCheck: [
            'Concurrent khác parallel ở điểm cốt lõi nào?',
            'Cho 1 ví dụ I/O concurrent trong app bạn biết.',
            'Tại sao await có thể tạo race trên biến shared?',
          ],
          nextUp: 'Bài sau: kiến trúc Engine / Host / Event Loop.',
          codeSnippets: [
            codeBlock(
              'javascript',
              `await Promise.all([fetch('/a'), fetch('/b')]);`,
              'I/O concurrent',
            ),
          ],
        }),
        buildLesson({
          title: 'Kiến trúc runtime: Engine, Host, Event Loop',
          slug: 'js-runtime-architecture',
          description: 'V8/host APIs/libuv và đường đi của callback.',
          estimatedTime: 40,
          lessonType: 'article',
          objectives: [
            'Vẽ được 3 tầng Engine / Host / Your code',
            'Giải thích callback rời stack rồi vào queue',
            'Phân biệt browser Web APIs và Node libuv ở mức khái niệm',
          ],
          sections: [
            {
              heading: 'Ba tầng',
              body:
                '```\n[ Your JS ] → Call Stack\n     ↓\n[ Engine ]\n     ↓ callbacks đăng ký\n[ Host: Browser / Node ]\n  timers, network, FS, queues, event loop\n```\n\n' +
                'JS **không** tự “chạy nền” network; host hoàn thành I/O rồi đẩy callback vào queue.',
            },
            {
              heading: 'Browser vs Node (đủ để lập trình đúng)',
              body:
                '**Browser:** \`setTimeout\`, \`fetch\`, DOM events qua Web APIs.\n\n' +
                '**Node:** libuv + thread pool cho một số I/O; event loop có phases ' +
                '(\`timers → poll → check…\`). Microtask vẫn drain khi stack rỗng.\n\n' +
                'Chi tiết phase Node không cần thuộc lòng ngay — quan trọng là: ' +
                '**đừng block stack bằng CPU nặng**.',
            },
            {
              heading: 'Hệ quả thiết kế hệ thống',
              body:
                '1. API handler CPU nặng → latency tăng cho mọi request trên process.\n' +
                '2. Fan-out I/O → \`Promise.all\` / queue có limit.\n' +
                '3. Cần parallel CPU → Worker (Premium) hoặc native service.',
            },
          ],
          pitfalls: ['Nghĩ fetch chạy “trong V8 thread riêng” theo nghĩa JS multithread heap'],
          selfCheck: ['Callback \`setTimeout\` được host hay engine thực thi I/O?'],
          nextUp: 'Call stack, heap, và cửa sổ sau await.',
        }),
        buildLesson({
          title: 'Call Stack, Heap và memory model cơ bản',
          slug: 'js-call-stack-heap',
          description: 'Stack frames, heap objects, await suspend.',
          estimatedTime: 35,
          lessonType: 'mixed',
          objectives: [
            'Mô tả call stack và stack overflow',
            'Biết object/closure sống trên heap',
            'Giải thích await nhả stack như thế nào',
          ],
          sections: [
            {
              heading: 'Call stack',
              body:
                'Mỗi lời gọi hàm push frame (tham số, local, return address). Return thì pop. ' +
                'Đệ quy quá sâu → *Maximum call stack size exceeded*.',
              code: {
                language: 'javascript',
                code: `function recurse(n) {
  if (n === 0) return 0;
  return recurse(n - 1) + 1;
}
// recurse(1e6) có thể stack overflow`,
              },
            },
            {
              heading: 'Heap & closure',
              body:
                'Object, array, môi trường closure trên heap. Closure giữ reference → object chưa GC ' +
                '→ có thể “rò” logic (listener không gỡ).',
            },
            {
              heading: 'await và concurrency',
              body:
                'Khi \`await promise\`, function **suspend**: frame không giữ stack “bận” theo nghĩa chặn loop; ' +
                'engine có thể chạy task khác. Đó là cửa sổ **logic race** trên biến shared (Module 3).',
            },
          ],
          selfCheck: ['Biến local number trong async function có share giữa 2 lần gọi không?'],
          nextUp: 'Event loop: microtask vs macrotask.',
          codeSnippets: [
            codeBlock('javascript', `async function f(){ const x=1; await delay(); return x; }`),
          ],
        }),
        buildLesson({
          title: 'Event Loop: microtask, macrotask, render',
          slug: 'js-event-loop-deep',
          description: 'Thứ tự ưu tiên queue; A-D-C-B; starvation; Node phases overview.',
          estimatedTime: 45,
          lessonType: 'mixed',
          objectives: [
            'Thuật toán event loop browser-centric',
            'Phân loại microtask / macrotask',
            'Giải thích output A D C B',
            'Nhận biết microtask flood và CPU-bound chặn loop',
          ],
          sections: [
            {
              heading: 'Thuật toán (browser-centric)',
              body:
                '1. Chạy sync đến call stack rỗng\n' +
                '2. **Drain toàn bộ microtask queue**\n' +
                '3. Có thể render (nếu đến frame)\n' +
                '4. Lấy **một** macrotask → quay lại bước 1',
            },
            {
              heading: 'Ai vào đâu?',
              body:
                '| Microtask | Macrotask |\n|---|---|\n' +
                '| promise then/catch/finally | setTimeout/setInterval |\n' +
                '| queueMicrotask | nhiều I/O callback |\n' +
                '| MutationObserver | một số UI events |',
              code: {
                language: 'javascript',
                caption: 'Classic interview',
                code: `console.log('A');
setTimeout(() => console.log('B'), 0);
Promise.resolve().then(() => console.log('C'));
console.log('D');
// A D C B`,
              },
            },
            {
              heading: 'Starvation & CPU-bound',
              body:
                'Lên lịch microtask đệ quy có thể trì hoãn macrotask rất lâu. ' +
                'Vòng lặp CPU dài trên main chặn **mọi** queue — UI đơ, timer trễ.',
              code: {
                language: 'javascript',
                code: `function flood(){ Promise.resolve().then(flood); }
// flood(); // nguy hiểm — đừng chạy production`,
              },
            },
            {
              heading: 'Node phases (overview)',
              body:
                '\`timers → pending → poll → check (setImmediate) → close\`. ' +
                'Microtask vẫn được xử lý khi stack rỗng. ' +
                'Đừng phụ thuộc order \`setImmediate\` vs \`setTimeout(0)\` mọi context.',
            },
          ],
          pitfalls: [
            'Nghĩ setTimeout(0) chạy trước promise.then',
            'Schedule microtask vô hạn',
          ],
          selfCheck: ['Vì sao C trước B trong ví dụ A/B/C/D?'],
          nextUp: 'Module 2: từ callback hell đến Promise.',
          codeSnippets: [
            codeBlock(
              'javascript',
              `console.log('A');
setTimeout(() => console.log('B'), 0);
Promise.resolve().then(() => console.log('C'));
console.log('D');`,
              'Event loop order',
            ),
          ],
        }),
      ],
    },
    {
      title: 'Module 2 — Async primitives (Tuần 3–5)',
      description: 'Callback → Promise → async/await → combinators → AbortController.',
      lessons: [
        buildLesson({
          title: 'Callbacks và callback hell',
          slug: 'js-callbacks-hell',
          description: 'Error-first, inversion of control, pyramid of doom.',
          estimatedTime: 30,
          lessonType: 'article',
          objectives: [
            'Viết được error-first callback',
            'Nêu 3 vấn đề của callback hell',
            'Hiểu Promise ra đời để linearize flow',
          ],
          sections: [
            {
              heading: 'Error-first (Node style)',
              body: 'Quy ước \`(err, data) => { if (err) … }\` — dễ quên handle ở mỗi tầng.',
              code: {
                language: 'javascript',
                code: `fs.readFile(path, (err, data) => {
  if (err) return handle(err);
  fs.readFile(other, (err2, data2) => { /* pyramid */ });
});`,
              },
            },
            {
              heading: 'Vấn đề cốt lõi',
              body:
                '1. Nesting / khó đọc\n2. Compose khó\n3. Inversion of control (bạn giao tiếp cho lib)\n' +
                '4. Error path rải rác\n\nPromise + async/await giải quyết phần lớn DX.',
            },
          ],
          nextUp: 'Promise lifecycle và chaining.',
        }),
        buildLesson({
          title: 'Promise: lifecycle, chaining, anti-patterns',
          slug: 'js-promises-deep',
          description: 'pending/fulfilled/rejected; return trong then; nuốt lỗi.',
          estimatedTime: 40,
          lessonType: 'mixed',
          objectives: [
            'Thuộc 3 trạng thái Promise',
            'Chain đúng bằng return',
            'Tránh 4 anti-pattern phổ biến',
          ],
          sections: [
            {
              heading: 'Lifecycle',
              body: 'pending → fulfilled | rejected (settled, không đổi lại).',
            },
            {
              heading: 'Chaining',
              body: 'Mỗi then trả Promise mới. **Phải return** giá trị hoặc Promise để nối tiếp.',
              code: {
                language: 'javascript',
                code: `// Bad
doAsync().then(v => { process(v).then(console.log); });
// Good
doAsync().then(v => process(v)).then(console.log).catch(console.error);`,
              },
            },
            {
              heading: 'Anti-patterns',
              body:
                '1. Nested then không cần\n2. \`new Promise\` bọc API đã trả Promise\n' +
                '3. Empty \`.catch(() => {})\`\n4. Quên return trong then → \`undefined\`',
            },
          ],
          nextUp: 'async/await mastery + lab sumParallel.',
          codeSnippets: [
            codeBlock(
              'javascript',
              `doAsync().then(process).then(console.log).catch(console.error);`,
            ),
          ],
        }),
        buildLesson({
          title: 'async/await: tuần tự, song song, readable stack',
          slug: 'js-async-await-mastery',
          description: 'await yield; parallel I/O; try/catch; race window preview.',
          estimatedTime: 45,
          lessonType: 'coding',
          objectives: [
            'Viết async function và await đúng',
            'Chọn tuần tự vs Promise.all',
            'Bắt lỗi bằng try/catch',
            'Nhận biết race window sau await',
          ],
          sections: [
            {
              heading: 'Cơ chế',
              body:
                '\`async function\` luôn return Promise. \`await\` pause **function đó**, ' +
                'không “đóng băng” cả process — event loop vẫn chạy task khác.',
            },
            {
              heading: 'Tuần tự vs song song',
              body:
                'Phụ thuộc dữ liệu → await tuần tự. I/O độc lập → \`Promise.all\`.\n\n' +
                'Sai phổ biến: \`for\` + \`await fetch\` khi các URL không phụ thuộc nhau.',
              code: {
                language: 'javascript',
                code: `// Tuần tự (cần user trước posts)
const user = await api.user(id);
const posts = await api.posts(user.id);

// Song song
const [stats, notifs] = await Promise.all([api.stats(), api.notifications()]);`,
              },
            },
            {
              heading: 'Race window (preview Module 3)',
              body:
                '```javascript\nlet balance = 100;\nasync function withdraw(a) {\n  const cur = balance;\n  await delay(10);\n  balance = cur - a;\n}\n```\nHai withdraw concurrent có thể overdraw.',
            },
          ],
          exercises: [
            {
              title: 'Parallel sum với Promise.all',
              description:
                'async sumParallel(nums): Promise.all map Promise.resolve, reduce tổng; [] → 0.',
              language: 'javascript',
              timeLimitMs: 5000,
              starterCode: `async function sumParallel(nums) {\n  // TODO\n}\n`,
              testCases: [
                { input: '[1,2,3]', expectedOutput: '6', isHidden: false, points: 2 },
                { input: '[10,-5,5]', expectedOutput: '10', isHidden: false, points: 2 },
                { input: '[]', expectedOutput: '0', isHidden: true, points: 2 },
                { input: '[100]', expectedOutput: '100', isHidden: true, points: 1 },
              ],
            },
          ],
          nextUp: 'Promise combinators.',
        }),
        buildLesson({
          title: 'Promise combinators: all, allSettled, race, any',
          slug: 'js-promise-combinators',
          description: 'Fail-fast, soft-fail, timeout, AggregateError.',
          estimatedTime: 40,
          lessonType: 'mixed',
          objectives: [
            'Chọn đúng combinator theo use case',
            'Viết withTimeout bằng race',
            'Biết allSettled khi cần partial success',
          ],
          sections: [
            {
              heading: 'Bảng so sánh',
              body:
                '| API | Hành vi |\n|---|---|\n| all | reject ngay nếu 1 fail |\n| allSettled | chờ hết, luôn fulfill mảng status |\n| race | settled đầu (kể cả reject) |\n| any | fulfill đầu; tất cả reject → AggregateError |',
              code: {
                language: 'javascript',
                code: `function withTimeout(p, ms) {
  const t = new Promise((_, rej) =>
    setTimeout(() => rej(new Error('timeout')), ms));
  return Promise.race([p, t]);
}`,
              },
            },
          ],
          nextUp: 'AbortController.',
        }),
        buildLesson({
          title: 'Cancellation với AbortController',
          slug: 'js-abort-controller',
          description: 'Hủy fetch, search-as-you-type, unmount, timeout.',
          estimatedTime: 40,
          lessonType: 'coding',
          objectives: [
            'Dùng AbortController với fetch',
            'Liệt kê 3 use case',
            'Hiểu abort không rollback server',
          ],
          sections: [
            {
              heading: 'API',
              body: '',
              code: {
                language: 'javascript',
                code: `const ac = new AbortController();
fetch(url, { signal: ac.signal }).catch(e => {
  if (e.name === 'AbortError') return;
  throw e;
});
ac.abort();`,
              },
            },
            {
              heading: 'Use cases & giới hạn',
              body:
                'Search debounce + abort request cũ; unmount component; timeout.\n\n' +
                'Server có thể đã xử lý xong trước abort — cần **idempotent** API / versioning.',
            },
          ],
          exercises: [
            {
              title: 'withTimeout helper',
              description: 'withTimeout(promise, ms) reject Error("timeout") nếu quá hạn.',
              language: 'javascript',
              timeLimitMs: 5000,
              starterCode: `function withTimeout(promise, ms) {\n  // TODO\n}\n`,
              testCases: [
                { input: 'fast-resolve', expectedOutput: 'ok', isHidden: false, points: 2 },
                { input: 'slow-timeout', expectedOutput: 'timeout', isHidden: false, points: 3 },
              ],
            },
          ],
          nextUp: 'Module 3: race conditions.',
        }),
      ],
    },
    {
      title: 'Module 3 — Race conditions & safe patterns (Tuần 6–7)',
      description: 'Logic races, mutex, debounce/coalesce, midterm quiz.',
      lessons: [
        buildLesson({
          title: 'Race condition logic trong single-threaded JS',
          slug: 'js-logic-race-conditions',
          description: 'Check-then-act, stale RMW, out-of-order; demo seats.',
          estimatedTime: 50,
          lessonType: 'mixed',
          objectives: [
            'Nêu 3 pattern race logic',
            'Giải thích await yield',
            'Phân tích demo seats overbook',
            'Liệt kê mitigation',
          ],
          sections: [
            {
              heading: 'Ba pattern',
              body:
                '1. **Check-then-act:** \`if (!cache[k]) cache[k]=await load(k)\`\n' +
                '2. **Stale RMW:** read → await → write dựa giá trị cũ\n' +
                '3. **Out-of-order response:** request chậm ghi đè UI mới hơn',
            },
            {
              heading: 'Demo overbook seats (hay gặp trên IDE playground)',
              body:
                'Hai \`enroll\` concurrent đều thấy \`seats > 0\`, cùng await, rồi cùng giảm — ' +
                'có thể bán 2 ghế khi chỉ còn 1. **Đây là đúng lý thuyết race logic.** ' +
                'Playground IDE để bạn Run và quan sát; phần markdown mới là bài học đầy đủ.',
              code: {
                language: 'javascript',
                caption: 'Race: capacity check trước await',
                code: `let seats = 1;
async function reserveSeat(userId) {
  await new Promise((r) => setTimeout(r, 100));
  return { userId, ok: true };
}
async function enroll(userId) {
  if (seats <= 0) return false;
  await reserveSeat(userId);
  seats -= 1;
  return true;
}
Promise.all([enroll('an'), enroll('binh')]).then(console.log);`,
              },
            },
            {
              heading: 'Mitigation',
              body:
                '| Cách | Ý tưởng |\n|---|---|\n| Promise mutex/queue | Serialize critical section |\n| Atomic server update | Transaction / conditional update |\n| Abort + version | Client ignore stale |\n| Coalesce | Một in-flight load |',
            },
          ],
          pitfalls: ['Nghĩ “JS single-thread nên snippet seats luôn an toàn”'],
          selfCheck: ['Sửa enroll thế nào để không overbook trong single process?'],
          nextUp: 'Promise mutex.',
          codeSnippets: [
            codeBlock(
              'javascript',
              `let seats = 1;
async function enroll(userId) {
  if (seats <= 0) return false;
  await new Promise((r) => setTimeout(r, 100));
  seats -= 1;
  return true;
}
Promise.all([enroll('an'), enroll('binh')]).then(console.log);`,
              'Overbook race — Run trên IDE để quan sát',
            ),
          ],
        }),
        buildLesson({
          title: 'Serialize critical section: promise mutex & queues',
          slug: 'js-promise-mutex',
          description: 'Chuỗi then làm mutex; SafeCounter lab.',
          estimatedTime: 45,
          lessonType: 'coding',
          objectives: [
            'Implement/ hiểu promise-chain mutex',
            'Biết khi nào serialize',
            'Hoàn thành SafeCounter',
          ],
          sections: [
            {
              heading: 'Mutex bằng Promise chain',
              body: 'Mọi \`run\` nối tiếp trên một chain — critical section chạy tuần tự.',
              code: {
                language: 'javascript',
                code: `class Mutex {
  constructor() { this._p = Promise.resolve(); }
  run(fn) {
    const next = this._p.then(fn, fn);
    this._p = next.catch(() => {});
    return next;
  }
}`,
              },
            },
            {
              heading: 'Khi nào dùng',
              body: 'Ghi shared state in-process; init singleton; rate-limit side effect. Giữ section ngắn.',
            },
          ],
          exercises: [
            {
              title: 'SafeCounter với chuỗi Promise',
              description: 'async inc() serialize bằng this._chain; concurrent inc đúng tổng.',
              language: 'javascript',
              timeLimitMs: 8000,
              starterCode: `class SafeCounter {
  constructor() {
    this.value = 0;
    this._chain = Promise.resolve();
  }
  async inc() {
    // TODO
  }
}
`,
              testCases: [
                { input: 'inc x3 sequential', expectedOutput: '3', isHidden: false, points: 3 },
                { input: 'inc x10 concurrent', expectedOutput: '10', isHidden: true, points: 4 },
              ],
            },
          ],
          nextUp: 'Debounce / throttle / coalesce.',
        }),
        buildLesson({
          title: 'Debounce, throttle, request coalescing',
          slug: 'js-debounce-throttle-coalesce',
          description: 'Giảm bão async từ UI.',
          estimatedTime: 35,
          lessonType: 'article',
          objectives: [
            'Phân biệt debounce vs throttle',
            'Implement ý tưởng coalesce in-flight',
            'Chọn pattern cho search box',
          ],
          sections: [
            {
              heading: 'Ba kỹ thuật',
              body:
                '**Debounce:** gọi sau khi user ngừng N ms.\n' +
                '**Throttle:** tối đa 1 lần / N ms.\n' +
                '**Coalesce:** nhiều caller share một Promise đang bay.',
              code: {
                language: 'javascript',
                code: `let inflight = null;
function loadConfig() {
  if (!inflight) {
    inflight = fetch('/config')
      .then((r) => r.json())
      .finally(() => { inflight = null; });
  }
  return inflight;
}`,
              },
            },
          ],
          nextUp: 'Midterm quiz Module 1–2 (+ race intro).',
        }),
        buildLesson({
          title: 'Quiz giữa kỳ: Event Loop & Async',
          slug: 'js-midterm-quiz',
          description: 'Kiểm tra Module 1–2.',
          estimatedTime: 30,
          lessonType: 'quiz',
          showIdeNote: false,
          objectives: ['Đạt ≥ 70% midterm', 'Ôn event loop và Promise'],
          sections: [
            {
              heading: 'Phạm vi',
              body: 'Event loop order, micro/macro, combinators, async parallel, AbortController.',
            },
          ],
          quiz: makeQuiz(
            'Midterm — Event Loop & Promises',
            'Module 1–2 assessment',
            [
              mcq(
                'Output: console.log(1); setTimeout(()=>console.log(2),0); Promise.resolve().then(()=>console.log(3)); console.log(4);',
                ['1,2,3,4', '1,4,2,3', '1,4,3,2', '1,3,4,2'],
                2,
              ),
              mcq('Promise.then nằm queue nào?', ['Macrotask', 'Microtask', 'Render only', 'GPU queue'], 1),
              mcq('Promise.all reject khi?', ['Tất cả reject', 'Promise đầu reject', 'Timeout mặc định', 'Không bao giờ'], 1),
              mcq('Fetch 10 URL độc lập nhanh hơn?', ['for+await', 'Promise.all(map fetch)', 'eval', 'sync XHR'], 1),
              mcq('AbortController dùng để?', ['Tăng heap', 'Hủy work hỗ trợ signal', 'Thay Promise', 'Tắt GC'], 1),
            ],
            { passingScorePercent: 70, timeLimitSeconds: 600, xpReward: 100 },
          ),
          nextUp: 'Module 4: production + capstone.',
        }),
      ],
    },
    {
      title: 'Module 4 — Capstone & tổng kết (Tuần 8)',
      description: 'Streams, checklist, JobQueue, final quiz.',
      lessons: [
        buildLesson({
          title: 'Async iteration, streams & backpressure (overview)',
          slug: 'js-streams-backpressure',
          description: 'for-await-of; ý tưởng backpressure.',
          estimatedTime: 30,
          lessonType: 'article',
          objectives: [
            'Biết khi nào không buffer toàn bộ data',
            'Mô tả backpressure một câu',
          ],
          sections: [
            {
              heading: 'Async iterator',
              body: '',
              code: {
                language: 'javascript',
                code: `for await (const chunk of asyncSource) {
  await process(chunk);
}`,
              },
            },
            {
              heading: 'Backpressure',
              body: 'Consumer chậm → producer phải chậm (pause/pull) để tránh OOM.',
            },
          ],
          nextUp: 'Production checklist.',
        }),
        buildLesson({
          title: 'Checklist thiết kế API async production',
          slug: 'js-async-api-checklist',
          description: 'Timeouts, retries, idempotency, observability.',
          estimatedTime: 30,
          lessonType: 'article',
          objectives: ['Liệt kê ≥ 6 hạng mục checklist', 'Áp dụng được cho 1 API bạn viết'],
          sections: [
            {
              heading: 'Checklist',
              body:
                '1. Timeouts mọi network call\n2. Retry transient + backoff + jitter\n' +
                '3. Idempotency key cho POST quan trọng\n4. Propagate AbortSignal\n' +
                '5. Không nuốt lỗi; correlation id\n6. Giới hạn concurrency fan-out\n' +
                '7. Ít shared mutable global\n8. Test concurrent invocations',
            },
          ],
          nextUp: 'Capstone JobQueue.',
        }),
        buildLesson({
          title: 'Capstone: Concurrent Job Queue',
          slug: 'js-capstone-job-queue',
          description: 'Queue giới hạn concurrency, isolation lỗi, drain.',
          estimatedTime: 60,
          lessonType: 'assignment',
          objectives: [
            'Implement JobQueue(concurrency)',
            'Đảm bảo max active tasks',
            'Lỗi 1 job không chết queue',
          ],
          sections: [
            {
              heading: 'API yêu cầu',
              body: '',
              code: {
                language: 'javascript',
                code: `class JobQueue {
  constructor(concurrency) {}
  add(task) { /* return Promise */ }
  onIdle() { /* resolve khi hết job */ }
  size() { /* pending + active */ }
}`,
              },
            },
            {
              heading: 'Tiêu chí',
              body:
                '1. ≤ concurrency job active\n2. add trong lúc chạy vẫn schedule đúng\n' +
                '3. Task throw → reject promise đó, queue chạy tiếp\n' +
                '4. Bonus: retry 2 lần; clear() reject pending',
            },
            {
              heading: 'Gợi ý thiết kế',
              body: 'Mảng waiting + counter active; khi job xong pull waiting; mỗi add có resolve/reject riêng.',
            },
          ],
          exercises: [
            {
              title: 'JobQueue concurrency limit',
              description: 'JobQueue(concurrency).add(fn) với max concurrent active.',
              language: 'javascript',
              timeLimitMs: 10000,
              starterCode: `class JobQueue {
  constructor(concurrency) {
    this.concurrency = concurrency;
    // TODO
  }
  add(task) {
    // TODO
  }
}
`,
              testCases: [
                { input: 'concurrency=1 three tasks', expectedOutput: 'serial-ok', isHidden: false, points: 3 },
                { input: 'concurrency=2 max active', expectedOutput: 'max-2', isHidden: false, points: 4 },
                { input: 'task throws isolated', expectedOutput: 'isolated', isHidden: true, points: 3 },
              ],
            },
          ],
          nextUp: 'Final quiz toàn khóa.',
        }),
        buildLesson({
          title: 'Final Quiz: JS Concurrency Fundamentals',
          slug: 'js-final-quiz',
          description: 'Tổng kết FREE JS concurrent.',
          estimatedTime: 35,
          lessonType: 'quiz',
          showIdeNote: false,
          objectives: ['Đạt ≥ 75%', 'Ôn toàn khóa'],
          sections: [{ heading: 'Phạm vi', body: 'Toàn bộ Module 1–4: loop, promise, race, mutex, job queue.' }],
          quiz: makeQuiz(
            'Final — JS Concurrency Fundamentals',
            'End-of-course assessment',
            [
              mcq('Concurrent khác Parallel?', ['Luôn nhiều CPU', 'Xen kẽ tiến triển vs chạy cùng lúc nhiều core', 'Không khác', 'Chỉ browser'], 1),
              mcq('await tạo race window vì?', ['JS đa luồng CPU', 'Yield cho task khác trước khi ghi lại state', 'JSON unsafe', 'GC reorder'], 1),
              mcq('Promise-chain mutex?', ['Tăng parallel CPU', 'Serial hóa critical section async', 'Tắt loop', 'Thay Worker'], 1),
              mcq('Promise.race phù hợp?', ['allSettled soft', 'Timeout / first-done', 'Chỉ retry', 'Parse JSON'], 1),
              mcq('JobQueue concurrency=2?', ['Chỉ 2 job đời', 'Tối đa 2 active cùng lúc', '2ms delay', '2 retry'], 1),
              mcq('Coalescing?', ['Gọi API 2 lần', 'Share một in-flight Promise', 'Abort mọi request', 'localStorage'], 1),
            ],
            { passingScorePercent: 75, timeLimitSeconds: 900, xpReward: 150 },
          ),
          nextUp: 'Khóa Premium: Parallel JS Workers & Shared Memory.',
        }),
      ],
    },
  ],
};
