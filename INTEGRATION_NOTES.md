# DEV 3 Integration Notes

## 1. Pending DEV 2 / DEV 4 Dependencies

| Caller | Expects | Status |
|--------|---------|--------|
| `CommentService.checkTargetAccess` | `Enrollment.findOne({ userId, courseId })` | ✅ Uses existing Enrollment model directly |
| `NoteService.checkLessonAccess` | `Enrollment.findOne({ userId, courseId: lesson.courseId })` | ✅ Uses existing Enrollment model directly |
| `BookmarkService` | No enrollment check required (by spec) | ✅ No dependency |
| `NotificationsService.notifyAdmin` | Admin users exist in DB (`role: 'ADMIN'`) | Requires at least one ADMIN seeded |
| `LESSON_COMPLETED` notification | `EnrollmentsService.markLessonComplete` → `NotificationsService.notify` | ✅ Done — `PATCH /api/v1/lessons/:id/complete` |
| DEV 4 — `PAYMENT_SUCCESS` notification | Payment service calling `NotificationsService.notify(userId, 'PAYMENT_SUCCESS', ...)` | ⏳ DEV 4 must wire this — no payment service exists yet |
| DEV 4 — `BOOKMARK_COURSE_UPDATED` notification | Lesson-add event triggering notify for bookmarked-course users | ⏳ DEV 4 must wire this — needs lesson-add hook in course admin flow |

## 2. Environment Variables Required

All variables are in `.env.example`. Copy to `.env` and fill in values:

```env
# Required (no defaults)
DATABASE_URL=mongodb://localhost:27017/threadlearn
JWT_ACCESS_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<strong-random-secret>

# Optional — features degrade gracefully if absent
REDIS_URL=redis://localhost:6379        # Rate limiting falls back to in-memory
JUDGE0_API_URL=http://localhost:2358    # Code execution falls back to mock mode
JUDGE0_API_KEY=                         # Only required for api.judge0.com (paid)
OPENAI_API_KEY=sk-...                   # AI analysis falls back to mock suggestions
```

## 3. npm install Required

`node_modules` is not present. Run before starting:

```bash
npm install
```

No new packages were added by DEV 3 — all dependencies (socket.io, redis, zod, mongoose, jsonwebtoken) were already in `package.json`.

## 4. Cross-Module Notification Wiring — What Was Done

| Service | Notification Type | Triggered When |
|---------|------------------|----------------|
| `AuthService.register` | `NEW_USER_REGISTERED` → all ADMINs | Student creates account |
| `EnrollmentsService.enrollInCourse` | `COURSE_ENROLLED` → student | Student enrolls |
| `EnrollmentsService.markLessonComplete` | `LESSON_COMPLETED` → student | Student marks a lesson complete |
| `EnrollmentsService.updateLessonProgress` | `COURSE_COMPLETED` → student | Progress reaches 100% |
| `EnrollmentsService.updateLessonProgress` | `LEVEL_UP` → student | Level increases after course XP |
| `QuizAttemptsService.submitAttempt` | `QUIZ_PASSED` → student | Score ≥ 80% |
| `QuizAttemptsService.submitAttempt` | `QUIZ_FAILED` → student | Score < 80% |
| `QuizAttemptsService.submitAttempt` | `LEVEL_UP` → student | Level increases after quiz XP |

All notification calls are **fire-and-forget** (`.catch()` logs warning) — a failed notification never breaks the primary business operation.

## 5. Socket.IO Room Convention

- Room name: `user:{userId}` (colon separator, not underscore)
- Client connects with: `io('/notifications', { auth: { userId } })`
- Backend emits: `io.to('user:{userId}').emit('notification', payload)`
- Room join happens automatically on connect in `src/socket/index.ts`

## 6. Known Issues / Limitations

| Issue | Notes |
|-------|-------|
| `LESSON_COMPLETED` type now triggered | `PATCH /api/v1/lessons/:id/complete` calls `EnrollmentsService.markLessonComplete` — fire-and-forget notification included |
| AI analysis `@babel/parser` not used | Replaced with regex-based code context extraction. Real AST can be wired by installing `@babel/parser` and replacing `extractCodeContext()` in `ai-engine.service.ts` |
| `openai` SDK not installed | AI engine uses `fetch` directly to `api.openai.com`. Drop-in replacement: `new OpenAI().chat.completions.create(...)` in `callOpenAI()` |
| Judge0 mock returns `passed: true` always | Intentional for local dev. Deploy self-hosted Judge0 and set `JUDGE0_API_URL=http://your-judge0:2358` |
| `User.isPremium` not in JWT | `AIAnalysisService` does a DB lookup per request. If needed for performance, add `isPremium` to JWT payload and regenerate tokens on plan change |
| TypeScript check blocked | `node_modules` absent — run `npm install` then `npx tsc --noEmit` |

## 7. New API Routes Added in DEV 3

```
POST   /api/v1/comments
GET    /api/v1/comments?targetType=&targetId=
GET    /api/v1/comments/:commentId/replies
PATCH  /api/v1/comments/:commentId
DELETE /api/v1/comments/:commentId

POST   /api/v1/bookmarks/toggle
GET    /api/v1/bookmarks/me
GET    /api/v1/bookmarks/check

GET    /api/v1/notes?lessonId=
POST   /api/v1/notes
PATCH  /api/v1/notes/:noteId
DELETE /api/v1/notes/:noteId

GET    /api/v1/exercises/:lessonId
POST   /api/v1/code-execution/run
GET    /api/v1/code-execution/history

POST   /api/v1/ai-analysis/recommend
GET    /api/v1/ai-analysis/history

PATCH  /api/v1/lessons/:id/complete

GET    /api/v1/notifications            (updated — now paginated)
GET    /api/v1/notifications/unread-count
PATCH  /api/v1/notifications/:id/read
PATCH  /api/v1/notifications/read-all
```
