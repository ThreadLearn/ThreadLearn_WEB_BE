# Database Seed — Khóa học Concurrent Programming hoàn chỉnh

Seed ThreadLearn theo **3 bước**:

1. **Syllabus** (`seed-data/syllabus.ts`) — outcomes, modules, tuần, capstone  
2. **Full lessons** (`buildLesson` + course-*.ts) — body đủ session, lab, quiz, capstone  
3. **Orchestrator** (`seed.ts`) — users, progress, commerce + `npm run db:seed`

## Chạy

```bash
npm run db:seed
```

⚠️ Wipe collection seedable — chỉ local/dev.

## Curriculum (sau bước 1–2–3)

| Course | Tier | Lessons | Assessment |
|--------|------|---------|------------|
| `js-concurrency-fundamentals` | FREE ~18h | 17 | Midterm + Final + JobQueue + labs |
| `java-multithreading-foundations` | FREE ~18h | 15 | Midterm + Final + BankAccount + labs |
| `parallel-js-workers-shared-memory` | PREMIUM | 11 | Final + parallelMap + labs |
| `advanced-concurrent-java-patterns` | PREMIUM | 11 | Final + pipeline + labs |
| `ai-assisted-concurrency-debugging` | DRAFT | 5 | Draft quiz |

**59 lessons** · **7 quizzes** · **13 exercises** · body dạy học qua `buildLesson` (mục tiêu, sections, pitfalls, checklist, IDE note).

## Cấu trúc

```
src/database/
  seed.ts
  seed-data/
    syllabus.ts           # B1
    lesson-builder.ts     # helper full body
    course-js-fundamentals.ts
    course-java-fundamentals.ts
    course-parallel-js.ts
    course-advanced-java.ts
    course-ai-draft.ts
    index.ts
    helpers.ts / types.ts
```

> `full-lesson-bodies.ts` (bản patch cũ) có thể bỏ qua — nội dung chính nằm trong `course-*.ts` + `buildLesson`.

## IDE trên trang học

FE luôn có playground — **không thay** markdown bài. Mỗi lesson non-quiz có ghi chú IDE trong body. Lesson 0 Java có snippet Counter lost-update trong `codeSnippets`.

## Accounts

| Email | Password |
|-------|----------|
| admin@threadlearn.com | Admin@123 |
| instructor@threadlearn.com | Admin@123 |
| student@threadlearn.com | Student@123 (PREMIUM, xong JS fund) |
| bob@ / huy@ / alice@ / expired@ / locked@ | Student@123 |
