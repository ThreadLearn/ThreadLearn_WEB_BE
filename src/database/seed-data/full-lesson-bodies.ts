/**
 * Full-length lesson bodies keyed by lesson slug.
 * Mỗi bài article/coding/mixed/assignment: ~1.5–5KB markdown (đủ 1 session).
 * Quiz giữ short trong course file.
 */
import { md } from './types';

export const FULL: Record<string, string> = {
  // ════════════════════════════════════════════════════════════
  // JAVA FOUNDATIONS
  // ════════════════════════════════════════════════════════════
  'java-process-vs-thread': md`
# Process, Thread và mô hình bộ nhớ chia sẻ

## Mục tiêu bài học
Sau bài này bạn sẽ:
1. Phân biệt **process** và **thread** trong JVM.
2. Hiểu thread **chia sẻ heap** nhưng **mỗi thread có stack riêng**.
3. Giải thích vì sao đa luồng cần **đồng bộ** khi ghi shared state.
4. Nhận diện lost update, visibility bug, race condition.

> **Lưu ý UI:** Phần IDE bên dưới trang học là **playground luyện tập** (FE). Nội dung lý thuyết chính là toàn bộ markdown bài này — hãy đọc hết trước khi bấm Run.

---

## 1. Process là gì?

**Process** = chương trình đang chạy, OS cấp không gian địa chỉ ảo **riêng**.

| Tài nguyên | Ý nghĩa |
|------------|---------|
| Address space | Process A không đọc RAM process B (trừ IPC) |
| Handles | File, socket… |
| ≥ 1 thread | Thread \`main\` lúc start |

Hai lần \`java MyApp\` = **hai process**, hai heap tách biệt.

---

## 2. Thread là gì?

**Thread** = đơn vị lập lịch CPU **trong** process.

Trong một JVM process:
- Nhiều thread (\`main\`, worker, …)
- **Cùng heap** — object \`new\` ra ai cũng (có thể) thấy
- **Stack riêng** — biến local method không share

\`\`\`
┌──────────── Process (JVM) ────────────┐
│  Heap: Counter, User, byte[]…         │
│  Thread-1 stack     Thread-2 stack    │
│  [inc] [main]       [inc] [run]       │
└───────────────────────────────────────┘
\`\`\`

---

## 3. Demo lost update (đọc kỹ)

\`\`\`java
public class SharedCounter {
  static class Counter { int value = 0; }

  public static void main(String[] args) throws Exception {
    Counter c = new Counter();
    Runnable job = () -> {
      for (int i = 0; i < 100_000; i++) c.value++; // RACE
    };
    Thread t1 = new Thread(job, "t1");
    Thread t2 = new Thread(job, "t2");
    t1.start(); t2.start();
    t1.join(); t2.join();
    System.out.println("Expected 200000, actual = " + c.value);
  }
}
\`\`\`

\`value++\` = đọc → cộng → ghi. Hai thread xen kẽ → **lost update** (actual < 200000).

Biến \`int local\` trong \`run()\` **không** race giữa threads (stack riêng), trừ khi escape ra heap shared.

---

## 4. Ba lớp vấn đề (preview khóa)

| Vấn đề | Mô tả | Bài sau |
|--------|--------|---------|
| Race / lost update | RMW đồng thời | synchronized, Atomic |
| Visibility | A ghi, B không thấy | volatile, JMM |
| Deadlock | Vòng chờ lock | Deadlock |

> Share **mutable** state giữa threads → cần chiến lược: immutable / sync / concurrent util.

---

## 5. So với JavaScript track

| | Java threads | JS main + workers |
|--|--------------|-------------------|
| Share heap mặc định | Có | Object JS thường **không** share sang Worker |
| Parallel CPU | Nhiều thread | Worker / native |
| Race biến thường | Rất phổ biến | Logic race (await); data race khi SAB |

---

## 6. Best practices mở đầu

1. Ưu tiên **immutability** sau khi publish object.  
2. Thu hẹp shared mutable — đừng global lung tung.  
3. Production: \`ExecutorService\` (khóa Advanced), đừng spawn thread vô tội vạ.  
4. Đừng gọi \`run()\` thay \`start()\` (bài sau).

---

## 7. Checklist

- [ ] Process ≠ thread  
- [ ] Heap share, stack riêng  
- [ ] Giải thích được \`value++\` 2 threads  
- [ ] Nêu 1 cách giảm rủi ro  

## 8. Câu hỏi ôn

1. \`local int\` trong \`run()\` mỗi thread có lost update không?  
2. Hai process ghi chung một **file** — có phải thread-safety heap không?

## Bước tiếp
**Tạo thread:** \`Thread\`, \`Runnable\`, \`start\` vs \`run\`, \`join\`.
`,

  'java-create-threads': md`
# Tạo thread: Thread, Runnable, Callable

## Mục tiêu
Tạo thread đúng; phân biệt \`start\`/\`run\`; biết \`join\`; preview Callable.

---

## 1. Ba cách giao việc

### Subclass Thread (ít dùng)
\`\`\`java
class MyThread extends Thread {
  public void run() { System.out.println(getName()); }
}
new MyThread().start();
\`\`\`
Hạn chế: single inheritance.

### Runnable (khuyến nghị học)
\`\`\`java
Runnable job = () -> System.out.println(Thread.currentThread().getName());
new Thread(job, "worker-1").start();
\`\`\`

### Callable&lt;V&gt; (có return)
\`\`\`java
Callable<Integer> c = () -> 42;
// Thường: executor.submit(c) → Future<Integer>
\`\`\`

---

## 2. start() vs run()

| | Ý nghĩa |
|--|---------|
| \`start()\` | Tạo thread mới, schedule \`run\` |
| \`run()\` | Gọi trên **thread hiện tại** — không parallel |

\`\`\`java
Thread t = new Thread(() -> System.out.println(Thread.currentThread().getName()));
t.run();   // "main"
t.start(); // "Thread-0"
\`\`\`

---

## 3. join

\`\`\`java
Thread t = new Thread(() -> doWork());
t.start();
t.join(); // main chờ t xong
\`\`\`

---

## 4. Ví dụ 2 worker

\`\`\`java
Runnable job = () -> {
  for (int i = 0; i < 3; i++)
    System.out.println(Thread.currentThread().getName() + " " + i);
};
Thread a = new Thread(job, "A");
Thread b = new Thread(job, "B");
a.start(); b.start();
a.join(); b.join();
\`\`\`
Thứ tự A/B **không đảm bảo**.

---

## Production
Hàng trăm \`new Thread\`/request → tốn kém. Dùng **thread pool** (khóa Advanced).

## Checklist
- [ ] Chỉ \`start()\` khi cần thread mới  
- [ ] Biết \`join\`  
- [ ] Ưu tiên Runnable  

## Tiếp
Thread lifecycle.
`,

  'java-thread-lifecycle': md`
# Thread lifecycle

## Mục tiêu
Thuộc 6 state và chuyển trạng thái.

\`\`\`
NEW → RUNNABLE ⇄ BLOCKED | WAITING | TIMED_WAITING → TERMINATED
\`\`\`

| State | Ý nghĩa |
|-------|---------|
| NEW | Chưa start |
| RUNNABLE | Đang/sẵn sàng chạy (OS schedule) |
| BLOCKED | Chờ intrinsic lock |
| WAITING | \`wait()\`, \`join()\` không timeout |
| TIMED_WAITING | \`sleep\`, \`wait(ms)\` |
| TERMINATED | run kết thúc |

\`Thread.getState()\` — JVM gộp RUNNING vào RUNNABLE.

## sleep vs wait
- \`sleep\`: không nhả monitor  
- \`wait\`: phải giữ lock, **nhả** lock khi wait  

## Demo
\`\`\`java
Thread t = new Thread(() -> {
  try { Thread.sleep(200); } catch (InterruptedException e) {
    Thread.currentThread().interrupt();
  }
});
System.out.println(t.getState()); // NEW
t.start();
t.join();
System.out.println(t.getState()); // TERMINATED
\`\`\`

## Checklist
- [ ] 6 state  
- [ ] BLOCKED ≠ WAITING  
- [ ] sleep ≠ wait  

## Tiếp
Interrupt & daemon.
`,

  'java-interrupt-daemon': md`
# Interruption & daemon threads

## Interrupt = cooperative cancel
\`t.interrupt()\` set flag — **không** kill ngay.

Worker nên:
\`\`\`java
while (!Thread.currentThread().isInterrupted()) {
  // work
}
\`\`\`
Hoặc bắt \`InterruptedException\` từ \`sleep/wait/join/queue.take\`.

## Restore flag
\`\`\`java
try {
  Thread.sleep(1000);
} catch (InterruptedException e) {
  Thread.currentThread().interrupt();
  return;
}
\`\`\`

## Daemon
\`\`\`java
Thread bg = new Thread(loop);
bg.setDaemon(true); // trước start
bg.start();
\`\`\`
JVM thoát khi chỉ còn daemon. Không dùng daemon cho ghi dữ liệu quan trọng.

## Checklist
- [ ] Interrupt ≠ stop deprecated  
- [ ] Restore flag  
- [ ] setDaemon trước start  

## Tiếp
synchronized.
`,

  'java-synchronized-deep': md`
# synchronized và intrinsic lock

## Mục tiêu
Mutual exclusion bằng monitor; sync method/block/static; reentrancy; cạm bẫy.

---

## 1. Monitor lock
Mỗi object Java có intrinsic lock.

\`\`\`java
public synchronized void inc() { count++; }

public void inc2() {
  synchronized (this) { count++; }
}

public static synchronized void classLock() { /* lock Class */ }
\`\`\`

## 2. Tính chất
- **ME**: một thread trong critical section (cùng lock)  
- **Reentrant**: cùng thread vào lại được  
- Unlock → happens-before → lock sau (visibility)

## 3. Counter an toàn
\`\`\`java
public class Counter {
  private int count;
  public synchronized void inc() { count++; }
  public synchronized int get() { return count; }
}
\`\`\`
2 threads × 1000 → get() == 2000.

## 4. Cạm bẫy
1. Khóa **khác object** → không bảo vệ cùng field  
2. Critical section **quá rộng** → contention  
3. Gọi code ngoài (I/O) trong sync → chậm, dễ deadlock  
4. \`synchronized (new Object())\` mỗi lần — **vô dụng**

## 5. Khi nào chưa đủ
Nhiều biến liên quan, timeout lock, fair → \`ReentrantLock\` (khóa Advanced).

## Lab
Làm exercise **Thread-safe Counter** gắn bài.

## Tiếp
Lost updates phân tích sâu.
`,

  'java-lost-updates': md`
# Lost updates: phân tích count++

## Mục tiêu
Hiểu count++ không atomic; quan sát race; liên hệ bytecode/RMW.

---

\`count++\` ≈  
1. read field  
2. add  
3. write field  

Hai thread:
\`\`\`
T1 read 0    T2 read 0
T1 write 1   T2 write 1   → mất 1 lần tăng
\`\`\`

## Thí nghiệm
Tăng iterations (1e6), nhiều threads, lặp test — unsync **flaky** (thỉnh thoảng đúng, thường sai).

## Fix
- \`synchronized\`  
- \`AtomicInteger.incrementAndGet()\`  
- \`LongAdder\` (high contention)

## Checklist
- [ ] Giải thích RMW  
- [ ] Biết vì sao test flaky  
- [ ] 2 cách fix  

## Tiếp
volatile & visibility.
`,

  'java-volatile-jmm': md`
# volatile và visibility (JMM cơ bản)

## Mục tiêu
Hiểu visibility; volatile làm gì / không làm gì; happens-before rút gọn.

---

## 1. Vấn đề visibility
Không sync, thread có thể **không thấy** ghi của thread khác (cache CPU, reorder).

Pattern spin:
\`\`\`java
// thread worker
while (running) { ... } // running có thể "dính" true mãi

// main
running = false;
\`\`\`
Sửa: \`volatile boolean running\`.

## 2. volatile đảm bảo
- Visibility cho **đọc/ghi đơn** biến đó  
- Không reorder một số truy cập quanh volatile  

## 3. volatile KHÔNG
- Làm \`count++\` atomic  
- Thay critical section nhiều bước  

## 4. happens-before (rút gọn)
- Unlock → lock sau cùng monitor  
- Write volatile → read sau cùng var  
- \`start()\` → code trong thread  
- Thread end → \`join()\` return  

## Checklist
- [ ] Flag shutdown dùng volatile  
- [ ] Không dùng volatile cho counter++  
- [ ] Biết 2 quan hệ happens-before  

## Tiếp
AtomicInteger.
`,

  'java-atomic-integer': md`
# AtomicInteger & java.util.concurrent.atomic

## CAS
Compare-And-Swap: hardware primitive — update nếu giá trị còn expected.

\`\`\`java
AtomicInteger n = new AtomicInteger(0);
n.incrementAndGet();
n.compareAndSet(5, 6);
\`\`\`

## Khi nào dùng
Counter, sequence, flag đơn giản — giảm lock contention.

## Khi nào không đủ
Invariant nhiều field → vẫn cần lock/transaction.

## Lab
Exercise AtomicCounter.

## Tiếp
wait/notify.
`,

  'java-wait-notify': md`
# wait / notify / notifyAll

## Quy tắc vàng
1. Gọi trong \`synchronized\` cùng object  
2. \`wait\` trong **while** (không if) — spurious wakeup  
3. Ưu tiên \`notifyAll\` khi nhiều điều kiện  

\`\`\`java
synchronized (lock) {
  while (!ready) lock.wait();
  // ...
  lock.notifyAll();
}
\`\`\`

\`wait\` **nhả lock** để thread khác vào signal.

## Higher-level
\`BlockingQueue\`, \`CountDownLatch\`… thường dễ đúng hơn wait/notify tay.

## Tiếp
Deadlock.
`,

  'java-deadlock': md`
# Deadlock: 4 điều kiện & phòng tránh

## Coffman
1. Mutual exclusion  
2. Hold and wait  
3. No preemption  
4. **Circular wait**

## Ví dụ
A: lock1 → lock2  
B: lock2 → lock1  

## Phòng
1. **Thứ tự lock toàn cục** (identityHashCode)  
2. Ít lock / immutable  
3. \`tryLock\` timeout (Advanced)  
4. Detect: jstack, ThreadMXBean  

## Tiếp
Livelock & starvation.
`,

  'java-livelock-starvation': md`
# Livelock, starvation & priority

## Livelock
Threads “lịch sự” mãi, không tiến — thêm random backoff.

## Starvation
Thread không được CPU/lock (priority, non-fair lock). Fair lock khi cần fairness (đắt hơn).

## Priority inversion (overview)
Thread thấp giữ lock, cao chờ; trung bình chiếm CPU — OS/priority ceiling (beyond scope intro).

## Tiếp
Safe publication.
`,

  'java-safe-publication': md`
# Safe publication & immutability

Object tạo ở thread A phải publish đúng để B thấy trạng thái khởi tạo:

- static initializer  
- volatile / AtomicReference  
- final fields + constructor an toàn  
- synchronized / concurrent collection  

**Immutable** (final fields, no escape mutable): chiến lược đơn giản nhất.

## Tiếp
Capstone BankAccount.
`,

  'java-capstone-bank': md`
# Capstone: Thread-safe BankAccount

## API yêu cầu
\`\`\`java
class BankAccount {
  void deposit(long amount);
  void withdraw(long amount); // thiếu tiền → exception
  long getBalance();
  static void transfer(BankAccount from, BankAccount to, long amount);
}
\`\`\`

## Tiêu chí chấm
1. Không âm balance  
2. Stress nhiều thread — **tổng tiền hệ thống** invariant  
3. \`transfer\` không deadlock (lock order)  
4. Main in tổng balance sau stress  

## Gợi ý
- sync từng account  
- transfer: luôn lock account có id hash nhỏ hơn trước  
- hoặc 1 global lock (lab đơn giản, throughput thấp)

Làm exercise gắn bài + tự viết stress main.
`,

  // ════════════════════════════════════════════════════════════
  // JS FUNDAMENTALS
  // ════════════════════════════════════════════════════════════
  'js-concurrent-vs-parallel': md`
# Concurrent vs Parallel

## Mục tiêu
Định nghĩa concurrency/parallelism; định vị JS; lộ trình khóa.

**Concurrency** = nhiều task tiến triển (có thể 1 core xen kẽ).  
**Parallelism** = chạy cùng lúc nhiều core.

## JS
- Engine: 1 call stack (JS thường)  
- Host: event loop + I/O concurrent  
- Worker: parallel CPU (Premium)

\`\`\`javascript
await Promise.all([fetch('/a'), fetch('/b')]); // concurrent I/O
// for (huge) {}  // chặn event loop
\`\`\`

## Lộ trình FREE
Event loop → Promise/async → race patterns → JobQueue capstone.

## Checklist
- [ ] concurrent ≠ parallel  
- [ ] I/O concurrent vs CPU parallel  
`,

  'js-runtime-architecture': md`
# Runtime: Engine, Host, Event Loop

\`\`\`
[JS code] → Call Stack → Engine (V8)
                ↑ callbacks
         Host: timers, network, FS + queues + event loop
\`\`\`

Browser: Web APIs. Node: libuv + phases.  
Hệ quả: CPU-bound dài trên main → đơ; I/O → Promise; CPU parallel → Worker.
`,

  'js-call-stack-heap': md`
# Call Stack & Heap

Stack: frames hàm; tràn → stack overflow.  
Heap: object, closure.  
\`await\` suspend function → nhả stack → task khác chạy (cửa sổ race logic).
`,

  'js-event-loop-deep': md`
# Event Loop sâu

## Thuật toán (browser-centric)
1. Sync đến stack rỗng  
2. Drain **hết** microtasks  
3. (Có thể) render  
4. 1 macrotask → lặp  

## Micro vs Macro
- Micro: \`then\`, \`queueMicrotask\`  
- Macro: \`setTimeout\`, nhiều I/O  

\`\`\`javascript
console.log('A');
setTimeout(() => console.log('B'), 0);
Promise.resolve().then(() => console.log('C'));
console.log('D');
// A D C B
\`\`\`

Microtask flood có thể starve macrotask.  
CPU-bound chặn mọi queue.
`,

  'js-callbacks-hell': md`
# Callbacks & callback hell

Error-first Node: \`(err, data) =>\`.  
Vấn đề: nesting, compose khó, quên handle error.  
Promise linearize control flow — bài sau.
`,

  'js-promises-deep': md`
# Promise sâu

pending → fulfilled | rejected.  
Chaining: **return** trong then.  

Anti-patterns: nested then, empty catch, new Promise bọc sẵn Promise.

\`\`\`javascript
doAsync()
  .then(process)
  .then(console.log)
  .catch(console.error);
\`\`\`
`,

  'js-async-await-mastery': md`
# async/await mastery

async luôn trả Promise. await pause **hàm**, không đóng process.

Tuần tự: \`for + await\`.  
Song song I/O: \`Promise.all\`.  

Race window: sau await, shared var có thể đổi — Module 3.
`,

  'js-promise-combinators': md`
# Combinators

| API | Hành vi |
|-----|---------|
| all | fail-fast |
| allSettled | chờ tất cả |
| race | settled đầu |
| any | fulfill đầu / AggregateError |

Timeout: \`Promise.race([p, sleep.reject])\`.
`,

  'js-abort-controller': md`
# AbortController

\`\`\`javascript
const ac = new AbortController();
fetch(url, { signal: ac.signal });
ac.abort();
\`\`\`

Use: search-as-you-type, unmount, timeout.  
Abort không rollback server — cần idempotent API.
`,

  'js-logic-race-conditions': md`
# Race condition logic (JS)

## Check-then-act
\`if (!cache[k]) cache[k]=await load(k)\`

## Stale RMW
\`\`\`javascript
const cur = balance;
await delay(10);
balance = cur - amount;
\`\`\`

## Out-of-order UI
Abort / version token.

## Demo seats (IDE hay dùng)
\`\`\`javascript
let seats = 1;
async function enroll(userId) {
  if (seats <= 0) return false;
  await reserveSeat(userId);
  seats -= 1;
  return true;
}
Promise.all([enroll('an'), enroll('binh')]);
// cả hai có thể true → overbook
\`\`\`

Single-thread vẫn race vì **await yield**.  
IDE playground để **Run** snippet này — lý thuyết là toàn bài markdown.
`,

  'js-promise-mutex': md`
# Promise mutex & queues

\`\`\`javascript
class Mutex {
  constructor() { this._p = Promise.resolve(); }
  run(fn) {
    const next = this._p.then(fn, fn);
    this._p = next.catch(() => {});
    return next;
  }
}
\`\`\`

Serialize critical section. Lab: SafeCounter.
`,

  'js-debounce-throttle-coalesce': md`
# Debounce, throttle, coalesce

Debounce: sau khi ngừng gõ.  
Throttle: max 1 / N ms.  
Coalesce: nhiều caller share 1 in-flight Promise.

\`\`\`javascript
let inflight;
function load() {
  if (!inflight) inflight = fetch('/x').finally(() => { inflight = null; });
  return inflight;
}
\`\`\`
`,

  'js-streams-backpressure': md`
# Streams & backpressure (overview)

\`for await (const chunk of source)\`  
Consumer chậm → producer phải chậm (backpressure) tránh OOM.
`,

  'js-async-api-checklist': md`
# Production async checklist

Timeouts · Retry + jitter · Idempotency · AbortSignal · Log correlation · Limit concurrency · Ít shared mutable · Test concurrent invocations.
`,

  'js-capstone-job-queue': md`
# Capstone: Concurrent Job Queue

\`\`\`ts
class JobQueue {
  constructor(concurrency: number) {}
  add(task: () => Promise<unknown>): Promise<unknown>
  onIdle(): Promise<void>
  size(): number
}
\`\`\`

Max concurrency active; lỗi 1 job không chết queue; bonus retry/clear.  
Làm exercise gắn bài.
`,

  // ════════════════════════════════════════════════════════════
  // PARALLEL JS
  // ════════════════════════════════════════════════════════════
  'js-when-workers': md`
# Khi nào cần Worker?

| Workload | Gợi ý |
|----------|--------|
| I/O | async main đủ |
| CPU nặng | **Worker** |
| Shared mem throughput | SAB + Atomics |

\`postMessage\` clone tốn kém → transfer ArrayBuffer khi được.
`,

  'js-web-workers': md`
# Web Workers

\`\`\`javascript
const w = new Worker('worker.js', { type: 'module' });
w.postMessage(data);
w.onmessage = (e) => console.log(e.data);
\`\`\`
Không DOM. Giao tiếp message (hoặc SAB).
`,

  'js-node-worker-threads': md`
# Node worker_threads

\`\`\`javascript
const { Worker } = require('worker_threads');
new Worker('./w.js', { workerData: { n: 40 } });
// worker: parentPort.postMessage(result)
\`\`\`
Mỗi worker isolate + event loop riêng.
`,

  'js-transferables-channel': md`
# Transferables & MessageChannel

\`postMessage(buf, [buf])\` — zero-copy, sender mất access.  
MessageChannel: cặp port pipeline.
`,

  'js-worker-pool': md`
# Worker pool

N worker cố định + job queue + gán khi idle.  
Tránh spawn/teardown liên tục. Giống concurrency limit JobQueue.
`,

  'js-sharedarraybuffer': md`
# SharedArrayBuffer

Nhiều thread cùng bytes qua TypedArray.  
Browser: cần COOP/COEP isolation.  
RMW không Atomics → **data race**.
`,

  'js-atomics-rmw': md`
# Atomics RMW

\`\`\`javascript
Atomics.add(view, 0, 1);
Atomics.compareExchange(view, 0, exp, rep);
\`\`\`
Counter/flags lock-free đơn giản. Lab safeAdd.
`,

  'js-atomics-wait-notify': md`
# Atomics.wait / notify

Futex-style trên worker (không wait trên main browser).  
Giống Condition / Object.wait Java.
`,

  'js-data-race-false-sharing': md`
# Data race & false sharing

Data race: concurrent write/read không sync.  
False sharing: biến khác nhau cùng cache line → perf ↓. Padding khi optimize.
`,

  'js-capstone-parallel-map': md`
# Capstone: parallelMap

Chia chunk → worker pool concurrency → merge **đúng thứ tự**.  
Fail → reject rõ. Bonus transfer TypedArray.
`,

  // ════════════════════════════════════════════════════════════
  // ADVANCED JAVA
  // ════════════════════════════════════════════════════════════
  'java-executor-anatomy': md`
# ExecutorService anatomy

core/max pool, queue, factory, rejection.  
\`newFixedThreadPool\`, cached (unbounded risk), single, scheduled.  
Đừng unbounded queue + traffic lớn → OOM.
`,

  'java-rejection-shutdown': md`
# Rejection & shutdown

AbortPolicy · CallerRuns (backpressure) · Discard.  
\`shutdown\` vs \`shutdownNow\` + awaitTermination.
`,

  'java-forkjoin': md`
# ForkJoin & parallelStream

Work-stealing. Tránh blocking I/O trong common pool.
`,

  'java-completable-future': md`
# CompletableFuture

thenApply / thenCompose / thenCombine / exceptionally / *Async + executor.
`,

  'java-explicit-locks': md`
# ReentrantLock & ReadWriteLock

tryLock, fair, conditions, interruptibly.  
ReadWrite: nhiều reader / 1 writer.
`,

  'java-concurrent-collections': md`
# Concurrent collections

CHM, CopyOnWriteArrayList, BlockingQueues, ConcurrentLinkedQueue.  
Chọn theo read/write ratio.
`,

  'java-synchronizers': md`
# Latch, Barrier, Semaphore, Phaser

CountDownLatch one-shot · CyclicBarrier reusable · Semaphore permits · Phaser multi-phase.
`,

  'java-producer-consumer': md`
# Producer–Consumer

Bounded BlockingQueue = backpressure. Poison pill dừng consumer.
`,

  'java-deadlock-tools': md`
# Deadlock diagnosis

jstack · ThreadMXBean.findDeadlockedThreads · tryLock timeout · lock order.
`,

  'java-capstone-pipeline': md`
# Capstone: concurrent pipeline

Ingest → parse pool → enrich pool → writer.  
Bounded queues, graceful shutdown, error isolation, metrics.
`,

  // ════════════════════════════════════════════════════════════
  // AI DRAFT
  // ════════════════════════════════════════════════════════════
  'ai-arch-overview': md`
# AI microservice architecture

IDE → BE /ai (JWT, quota 10/40) → AI service analyze → AST + rules + BM25 + LLM → AIHistory.  
Redis cache hash(code).
`,

  'ai-ast-patterns': md`
# AST patterns

async-rmw-race · sab-data-race · java-non-atomic-increment · lock-order-risk.
`,

  'ai-bm25-llm': md`
# BM25 + LLM

Rules = signal; BM25 = docs; LLM = wording. Human review patches.
`,

  'ai-ide-workflow': md`
# IDE workflow

Code → AI analyze → đọc issues → fix → re-run tests → rate feedback.
`,
};
