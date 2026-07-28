import { SeedCourse } from './types';
import { buildLesson, codeBlock, makeQuiz, mcq } from './lesson-builder';

/** FREE — Java Multithreading Foundations — complete course */
export const javaFundamentalsCourse: SeedCourse = {
  title: 'Java Multithreading Foundations',
  slug: 'java-multithreading-foundations',
  shortDescription:
    'Lộ trình 8 tuần: process/thread, lifecycle, synchronized, volatile, atomic, deadlock, capstone BankAccount.',
  description:
    'Khóa FREE nền tảng đa luồng Java cho SV CNTT. Outcomes: bộ nhớ chia sẻ, lifecycle, sync/visibility, ' +
    'atomic, coordination cơ bản, BankAccount thread-safe. Chuẩn bị Premium Advanced Concurrent Java.',
  thumbnailPhotoId: 'photo-1517694712202-14dd9538aa97',
  language: 'java',
  level: 'BEGINNER',
  tags: ['java', 'multithreading', 'synchronized', 'volatile', 'deadlock', 'threads'],
  category: 'Concurrent Programming',
  isPremium: false,
  price: 0,
  status: 'published',
  estimatedDuration: 1080,
  sections: [
    {
      title: 'Module 1 — Threads & lifecycle (Tuần 1–2)',
      description: 'Process vs thread, tạo thread, lifecycle, interrupt, daemon.',
      lessons: [
        buildLesson({
          title: 'Process, Thread và mô hình bộ nhớ chia sẻ',
          slug: 'java-process-vs-thread',
          description: 'Heap share, stack riêng, lost update — bài mở đầu đầy đủ.',
          estimatedTime: 40,
          isPreview: true,
          lessonType: 'article',
          objectives: [
            'Phân biệt process và thread trong JVM',
            'Giải thích heap dùng chung, stack riêng',
            'Dự đoán lost update khi 2 thread tăng counter',
            'Liên hệ 3 lớp vấn đề: race, visibility, deadlock',
          ],
          sections: [
            {
              heading: 'Process là gì?',
              body:
                'Process là chương trình đang chạy với **không gian địa chỉ ảo riêng**. ' +
                'Hai process Java (hai lần `java MyApp`) **không** share heap.\n\n' +
                '| Tài nguyên | Ý nghĩa |\n|---|---|\n| Address space | Cách ly bộ nhớ |\n| Handles | File, socket |\n| ≥ 1 thread | Bắt đầu với main |',
            },
            {
              heading: 'Thread là gì?',
              body:
                'Thread là đơn vị lập lịch CPU **trong** process. Trong một JVM:\n' +
                '- Nhiều thread có thể chạy (parallel trên multi-core)\n' +
                '- **Cùng heap** — object `new` có thể được nhiều thread đụng tới\n' +
                '- **Stack riêng** — biến local method không share\n\n' +
                '```\n┌──────── Process (JVM) ────────┐\n│ Heap: Counter, arrays…        │\n│ T1 stack      T2 stack        │\n└───────────────────────────────┘\n```',
            },
            {
              heading: 'Demo lost update (đọc và hiểu từng dòng)',
              body:
                'Hai thread cùng `value++` thường ra kết quả **nhỏ hơn** 200000. ' +
                '`++` là read-modify-write không atomic.',
              code: {
                language: 'java',
                caption: 'Chạy mentally hoặc IDE Java — actual thường < expected',
                code: `public class SharedCounter {
  static class Counter { int value = 0; }
  public static void main(String[] args) throws Exception {
    Counter c = new Counter();
    Runnable job = () -> {
      for (int i = 0; i < 100_000; i++) c.value++;
    };
    Thread t1 = new Thread(job, "t1");
    Thread t2 = new Thread(job, "t2");
    t1.start(); t2.start();
    t1.join(); t2.join();
    System.out.println("Expected 200000, actual = " + c.value);
  }
}`,
              },
            },
            {
              heading: 'Ba lớp vấn đề khóa này sẽ cover',
              body:
                '| Vấn đề | Mô tả | Module |\n|---|---|---|\n| Race/lost update | RMW đồng thời | M2 synchronized/atomic |\n| Visibility | A ghi B không thấy | M2 volatile |\n| Deadlock | Vòng chờ lock | M3 |\n\n' +
                '**Quy tắc vàng:** share mutable state giữa threads → phải có chiến lược an toàn.',
            },
            {
              heading: 'So với track JavaScript ThreadLearn',
              body:
                'JS main: logic race sau `await`. Java threads: race/data race trên field heap thật. ' +
                'IDE playground FE có thể hiện demo JS seats — đó là **công cụ luyện**, ' +
                'không thay phần lý thuyết Java của bài này. Hãy đọc hết markdown trước.',
            },
            {
              heading: 'Best practices mở đầu',
              body:
                '1. Ưu tiên immutability sau publish\n2. Thu hẹp shared mutable\n' +
                '3. Production: ExecutorService (khóa Advanced)\n4. Đừng nhầm `run()` với `start()` (bài sau)',
            },
          ],
          pitfalls: [
            'Nghĩ local variable luôn race giữa threads',
            'Bỏ qua visibility (chỉ nghĩ race = lost update)',
          ],
          selfCheck: [
            'Process khác thread điểm nào?',
            'Vì sao value++ 2 threads có thể sai?',
            'Stack riêng giúp gì cho biến local?',
          ],
          nextUp: 'Tạo thread: Thread, Runnable, start vs run, join.',
          codeSnippets: [
            codeBlock(
              'java',
              `// Lost update demo
Counter c = new Counter();
Runnable job = () -> { for (int i = 0; i < 100_000; i++) c.value++; };
Thread t1 = new Thread(job); Thread t2 = new Thread(job);
t1.start(); t2.start(); t1.join(); t2.join();
System.out.println(c.value); // thường < 200000`,
              'Hai thread tăng counter không sync',
            ),
          ],
        }),
        buildLesson({
          title: 'Tạo thread: Thread, Runnable, Callable',
          slug: 'java-create-threads',
          description: 'start vs run; join; preview Callable.',
          estimatedTime: 40,
          lessonType: 'mixed',
          objectives: [
            'Tạo thread bằng Runnable',
            'Phân biệt start() và run()',
            'Dùng join chờ kết thúc',
            'Biết Callable trả giá trị (preview Executor)',
          ],
          sections: [
            {
              heading: 'Ba cách giao việc',
              body:
                '**Subclass Thread** — ít dùng (single inheritance).\n' +
                '**Runnable** — khuyến nghị khi học.\n' +
                '**Callable&lt;V&gt;** — có return + checked exception; thường với Executor.',
              code: {
                language: 'java',
                code: `Runnable job = () -> System.out.println(Thread.currentThread().getName());
Thread t = new Thread(job, "worker-1");
t.start();
t.join();`,
              },
            },
            {
              heading: 'start() vs run() — lỗi kinh điển',
              body:
                '| Gọi | Hành vi |\n|---|---|\n| start() | Thread mới, schedule run |\n| run() | Chạy trên thread **hiện tại** |\n\n' +
                'Gọi run() “cho có vẻ multithread” nhưng vẫn single-thread.',
            },
            {
              heading: 'Ví dụ 2 worker',
              body: 'Thứ tự in A/B không đảm bảo — scheduling OS/JVM.',
              code: {
                language: 'java',
                code: `Runnable job = () -> {
  for (int i = 0; i < 3; i++)
    System.out.println(Thread.currentThread().getName() + " " + i);
};
Thread a = new Thread(job, "A");
Thread b = new Thread(job, "B");
a.start(); b.start();
a.join(); b.join();`,
              },
            },
            {
              heading: 'Production note',
              body: 'Đừng new Thread mỗi request. Dùng thread pool (khóa Advanced).',
            },
          ],
          selfCheck: ['Gọi run() có tạo thread OS mới không?'],
          nextUp: 'Thread lifecycle.',
          codeSnippets: [
            codeBlock(
              'java',
              `Thread t = new Thread(() -> System.out.println(Thread.currentThread().getName()), "w");
t.start();
t.join();`,
            ),
          ],
        }),
        buildLesson({
          title: 'Thread lifecycle & join',
          slug: 'java-thread-lifecycle',
          description: '6 state; sleep vs wait; join.',
          estimatedTime: 35,
          lessonType: 'article',
          objectives: [
            'Liệt kê 6 Thread.State',
            'Phân biệt BLOCKED và WAITING',
            'Giải thích sleep không nhả monitor',
          ],
          sections: [
            {
              heading: 'Sơ đồ',
              body:
                '`NEW → RUNNABLE ⇄ BLOCKED|WAITING|TIMED_WAITING → TERMINATED`\n\n' +
                '| State | Ví dụ |\n|---|---|\n| NEW | new Thread |\n| RUNNABLE | đang/sẵn sàng chạy |\n| BLOCKED | chờ synchronized lock |\n| WAITING | wait(), join() |\n| TIMED_WAITING | sleep, wait(ms) |\n| TERMINATED | run xong |',
            },
            {
              heading: 'sleep vs wait',
              body: 'sleep không nhả monitor. wait phải giữ lock và **nhả** lock khi wait.',
            },
          ],
          nextUp: 'Interrupt & daemon.',
        }),
        buildLesson({
          title: 'Interruption & daemon threads',
          slug: 'java-interrupt-daemon',
          description: 'Cooperative cancel; restore flag; daemon.',
          estimatedTime: 35,
          lessonType: 'mixed',
          objectives: [
            'Dùng interrupt đúng cooperative model',
            'Restore interrupt flag sau InterruptedException',
            'Biết daemon không giữ JVM',
          ],
          sections: [
            {
              heading: 'Interrupt',
              body:
                '`t.interrupt()` set flag — không kill ngay. Loop kiểm tra `isInterrupted()` ' +
                'hoặc method ném InterruptedException.',
              code: {
                language: 'java',
                code: `try {
  Thread.sleep(1000);
} catch (InterruptedException e) {
  Thread.currentThread().interrupt();
  return;
}`,
              },
            },
            {
              heading: 'Daemon',
              body: '`setDaemon(true)` **trước** start. JVM thoát khi chỉ còn daemon. Không dùng cho ghi dữ liệu quan trọng dở dang.',
            },
          ],
          nextUp: 'Module 2: synchronized.',
        }),
      ],
    },
    {
      title: 'Module 2 — Sync & visibility (Tuần 3–5)',
      description: 'synchronized, lost update, volatile, AtomicInteger.',
      lessons: [
        buildLesson({
          title: 'synchronized và intrinsic lock',
          slug: 'java-synchronized-deep',
          description: 'Monitor, critical section, reentrancy, lab Counter.',
          estimatedTime: 45,
          lessonType: 'coding',
          objectives: [
            'Dùng synchronized method/block',
            'Hiểu reentrancy và visibility qua unlock/lock',
            'Tránh khóa sai object',
            'Hoàn thành lab Counter',
          ],
          sections: [
            {
              heading: 'Monitor lock',
              body: 'Mỗi object có intrinsic lock. synchronized đảm bảo mutual exclusion trên cùng lock.',
              code: {
                language: 'java',
                code: `public class Counter {
  private int count;
  public synchronized void inc() { count++; }
  public synchronized int get() { return count; }
}`,
              },
            },
            {
              heading: 'Cạm bẫy',
              body:
                '1. Khóa khác object → không bảo vệ field\n2. Critical section quá rộng\n' +
                '3. I/O trong sync → chậm/deadlock\n4. `synchronized(new Object())` mỗi lần — vô dụng',
            },
          ],
          exercises: [
            {
              title: 'Thread-safe Counter',
              description: 'synchronized inc/get; 2 threads ×1000 → 2000.',
              language: 'java',
              timeLimitMs: 8000,
              starterCode: `public class Counter {
  private int count = 0;
  // TODO
}
`,
              testCases: [
                { input: 'single-thread 5', expectedOutput: '5', isHidden: false, points: 2 },
                { input: '2 threads x1000', expectedOutput: '2000', isHidden: false, points: 4 },
                { input: '4 threads x500', expectedOutput: '2000', isHidden: true, points: 4 },
              ],
            },
          ],
          nextUp: 'Lost updates phân tích.',
          codeSnippets: [
            codeBlock('java', `public synchronized void inc() { count++; }`),
          ],
        }),
        buildLesson({
          title: 'Lost updates: phân tích count++',
          slug: 'java-lost-updates',
          description: 'RMW không atomic; flaky tests; cách fix.',
          estimatedTime: 35,
          lessonType: 'article',
          objectives: [
            'Phân rã count++ thành 3 bước',
            'Giải thích lost update interleaving',
            'Chọn synchronized hoặc AtomicInteger',
          ],
          sections: [
            {
              heading: 'Ba bước RMW',
              body: 'read → add → write. Hai thread read cùng giá trị → một lần tăng bị mất.',
            },
            {
              heading: 'Test flaky',
              body: 'Unsync counter test thỉnh thoảng pass — không chứng minh an toàn. Stress nhiều vòng lặp.',
            },
            {
              heading: 'Fix',
              body: 'synchronized · AtomicInteger · LongAdder (high contention).',
            },
          ],
          nextUp: 'volatile & JMM cơ bản.',
        }),
        buildLesson({
          title: 'volatile và visibility (JMM cơ bản)',
          slug: 'java-volatile-jmm',
          description: 'Visibility; volatile ≠ atomic; happens-before rút gọn.',
          estimatedTime: 45,
          lessonType: 'mixed',
          objectives: [
            'Giải thích visibility bug trên flag',
            'Biết volatile không làm ++ atomic',
            'Nêu 2 quan hệ happens-before',
          ],
          sections: [
            {
              heading: 'Visibility',
              body: 'Không sync, thread có thể không thấy ghi của thread khác. `volatile boolean running` cho flag shutdown.',
              code: {
                language: 'java',
                code: `volatile boolean running = true;
// worker: while (running) { ... }
// main: running = false;`,
              },
            },
            {
              heading: 'happens-before (rút gọn)',
              body:
                'Unlock → lock sau cùng monitor; write volatile → read sau; start() → code thread; end → join().',
            },
          ],
          pitfalls: ['Dùng volatile cho count++'],
          nextUp: 'AtomicInteger.',
        }),
        buildLesson({
          title: 'AtomicInteger & java.util.concurrent.atomic',
          slug: 'java-atomic-integer',
          description: 'CAS; lab AtomicCounter.',
          estimatedTime: 40,
          lessonType: 'coding',
          objectives: [
            'Dùng incrementAndGet/compareAndSet',
            'Biết CAS ý tưởng',
            'Chọn atomic vs lock',
          ],
          sections: [
            {
              heading: 'API',
              body: '',
              code: {
                language: 'java',
                code: `AtomicInteger n = new AtomicInteger();
n.incrementAndGet();
n.compareAndSet(expect, update);`,
              },
            },
            {
              heading: 'Khi nào đủ / không đủ',
              body: 'Counter/flag đơn giản: atomic. Invariant nhiều field: lock/transaction.',
            },
          ],
          exercises: [
            {
              title: 'AtomicCounter',
              description: 'AtomicInteger; 2 threads ×1000 → 2000.',
              language: 'java',
              timeLimitMs: 8000,
              starterCode: `import java.util.concurrent.atomic.AtomicInteger;
public class AtomicCounter {
  // TODO
}
`,
              testCases: [
                { input: '2 threads x1000', expectedOutput: '2000', isHidden: false, points: 5 },
              ],
            },
          ],
          nextUp: 'Module 3: wait/notify.',
        }),
      ],
    },
    {
      title: 'Module 3 — Coordination & hazards (Tuần 6–7)',
      description: 'wait/notify, deadlock, livelock, midterm.',
      lessons: [
        buildLesson({
          title: 'wait / notify / notifyAll',
          slug: 'java-wait-notify',
          description: 'Condition queue; while không if.',
          estimatedTime: 40,
          lessonType: 'mixed',
          objectives: [
            'Gọi wait trong synchronized',
            'Dùng while re-check condition',
            'Biết khi dùng BlockingQueue thay thế',
          ],
          sections: [
            {
              heading: 'Pattern chuẩn',
              body: '',
              code: {
                language: 'java',
                code: `synchronized (lock) {
  while (!ready) lock.wait();
  // ...
  lock.notifyAll();
}`,
              },
            },
            {
              heading: 'Quy tắc',
              body: 'wait nhả lock. Ưu tiên notifyAll khi nhiều điều kiện. Higher-level: BlockingQueue, Latch.',
            },
          ],
          nextUp: 'Deadlock.',
        }),
        buildLesson({
          title: 'Deadlock: 4 điều kiện & phòng tránh',
          slug: 'java-deadlock',
          description: 'Coffman; lock ordering; tools preview.',
          estimatedTime: 40,
          lessonType: 'article',
          objectives: [
            'Nêu 4 điều kiện Coffman',
            'Nhận circular wait',
            'Áp dụng lock ordering',
          ],
          sections: [
            {
              heading: 'Coffman',
              body: 'ME · hold-and-wait · no preemption · **circular wait**.',
            },
            {
              heading: 'Ví dụ & phòng',
              body:
                'A: L1→L2; B: L2→L1.\n\n' +
                'Phòng: thứ tự lock toàn cục; ít lock; tryLock timeout (Advanced); jstack detect.',
            },
          ],
          nextUp: 'Livelock & starvation.',
        }),
        buildLesson({
          title: 'Livelock, starvation & priority (overview)',
          slug: 'java-livelock-starvation',
          description: 'Không tiến dù “bận”; fairness.',
          estimatedTime: 30,
          lessonType: 'article',
          objectives: ['Định nghĩa livelock vs deadlock', 'Biết starvation', 'Backoff ngẫu nhiên'],
          sections: [
            {
              heading: 'Khái niệm',
              body:
                '**Livelock:** đáp ứng nhau mãi không tiến.\n' +
                '**Starvation:** không được CPU/lock.\n' +
                'Mitigation: random backoff, fair lock khi cần.',
            },
          ],
          nextUp: 'Midterm quiz.',
        }),
        buildLesson({
          title: 'Quiz giữa kỳ Java Threads',
          slug: 'java-midterm-quiz',
          description: 'Module 1–2 assessment.',
          estimatedTime: 30,
          lessonType: 'quiz',
          showIdeNote: false,
          objectives: ['Đạt ≥ 70%'],
          sections: [{ heading: 'Phạm vi', body: 'start/run, synchronized, volatile, atomic, wait.' }],
          quiz: makeQuiz(
            'Midterm — Java Threads & Sync',
            'Foundations midterm',
            [
              mcq('Tạo thread OS mới?', ['run()', 'start()', 'call()', 'execute same thread'], 1),
              mcq('synchronized instance khóa?', ['Class', 'this', 'Thread', 'System'], 1),
              mcq('volatile đảm bảo?', ['count++ atomic', 'Visibility biến đó', 'No deadlock', 'Fairness'], 1),
              mcq('AtomicInteger dựa trên?', ['File lock', 'CAS', 'SQL', 'GC'], 1),
              mcq('wait() khi?', ['Ngoài lock', 'Đang giữ monitor object', 'Chỉ main', 'Sau yield only'], 1),
            ],
            { passingScorePercent: 70, xpReward: 100 },
          ),
          nextUp: 'Module 4 capstone.',
        }),
      ],
    },
    {
      title: 'Module 4 — Capstone & final (Tuần 8)',
      description: 'Safe publication, BankAccount, final quiz.',
      lessons: [
        buildLesson({
          title: 'Safe publication & immutability',
          slug: 'java-safe-publication',
          description: 'Publish object an toàn giữa threads.',
          estimatedTime: 35,
          lessonType: 'article',
          objectives: [
            'Nêu cách publish an toàn',
            'Ưu tiên immutable',
            'Tránh escape this trong constructor',
          ],
          sections: [
            {
              heading: 'Cách publish',
              body:
                'static init · volatile/AtomicReference · final fields · synchronized/concurrent collection.\n\n' +
                'Immutable = đơn giản nhất cho share rộng.',
            },
          ],
          nextUp: 'Capstone BankAccount.',
        }),
        buildLesson({
          title: 'Capstone: Thread-safe BankAccount',
          slug: 'java-capstone-bank',
          description: 'deposit/withdraw/transfer; stress invariant; no deadlock.',
          estimatedTime: 60,
          lessonType: 'assignment',
          objectives: [
            'Implement API BankAccount an toàn',
            'Giữ invariant tổng tiền',
            'transfer không deadlock',
          ],
          sections: [
            {
              heading: 'API',
              body: '',
              code: {
                language: 'java',
                code: `class BankAccount {
  void deposit(long amount);
  void withdraw(long amount);
  long getBalance();
  static void transfer(BankAccount from, BankAccount to, long amount);
}`,
              },
            },
            {
              heading: 'Tiêu chí',
              body:
                '1. Không âm balance\n2. Stress multi-thread — tổng hệ thống không đổi (trừ fee nếu có)\n' +
                '3. transfer lock order (identityHashCode) hoặc global lock lab\n4. Main in tổng sau stress',
            },
          ],
          exercises: [
            {
              title: 'BankAccount thread-safe',
              description: 'deposit/withdraw/getBalance synchronized; stress 2 threads.',
              language: 'java',
              timeLimitMs: 10000,
              starterCode: `public class BankAccount {
  private long balance;
  public BankAccount(long initial) { this.balance = initial; }
  // TODO
}
`,
              testCases: [
                { input: 'deposit 100', expectedOutput: 'ok', isHidden: false, points: 2 },
                { input: 'concurrent transfers invariant', expectedOutput: 'invariant-hold', isHidden: true, points: 5 },
              ],
            },
          ],
          nextUp: 'Final quiz.',
        }),
        buildLesson({
          title: 'Final Quiz: Java Multithreading Foundations',
          slug: 'java-final-quiz',
          description: 'Tổng kết FREE Java.',
          estimatedTime: 35,
          lessonType: 'quiz',
          showIdeNote: false,
          objectives: ['Đạt ≥ 75%'],
          sections: [{ heading: 'Phạm vi', body: 'Toàn khóa foundations.' }],
          quiz: makeQuiz(
            'Final — Java Multithreading Foundations',
            'End-of-course',
            [
              mcq('Điều kiện deadlock gồm?', ['GC only', 'Circular wait', 'DNS', 'JIT'], 1),
              mcq('Phòng deadlock 2 lock?', ['Sleep only', 'Lock ordering', 'Bỏ sync', 'yield'], 1),
              mcq('Daemon?', ['Không stop', 'Không giữ JVM khi chỉ còn daemon', 'Max priority', 'Heap riêng'], 1),
              mcq('wait() nhả lock?', ['Không', 'Có', 'Chỉ sleep', 'Chỉ static'], 1),
              mcq('Immutable giúp?', ['GC nhanh luôn', 'Ít cần sync khi share an toàn', 'Tắt JIT', 'Single-thread'], 1),
              mcq('count++ unsync multi-thread?', ['Compile error', 'Lost updates', 'Tự atomic', 'Deadlock chắc'], 1),
            ],
            { passingScorePercent: 75, timeLimitSeconds: 900, xpReward: 150 },
          ),
          nextUp: 'Premium: Advanced Concurrent Java Patterns.',
        }),
      ],
    },
  ],
};
