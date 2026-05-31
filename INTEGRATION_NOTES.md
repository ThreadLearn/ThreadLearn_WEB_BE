# DEV3 — Cross-DEV Integration Contract

## What DEV3 *consumes* from other devs

| From | Model / Service           | Used in                          | Notes |
|------|---------------------------|----------------------------------|-------|
| DEV1 | `User.isPremium: boolean` | `AIAnalysisService`              | Drives quota tier (Free=10 / Premium=40) |
| DEV2 | `Enrollment` model        | `CommentService`, `NoteService`  | `findOne({ userId, courseId })` for access guard |
| DEV2 | `Lesson` model + `courseId` | `CommentService`, `NoteService`, `EnrollmentsService` | Used to resolve lesson→course for access checks |
| DEV2 | `Course.title`            | `EnrollmentsService` notifications | Snapshot in notification message |
| DEV4 | `Quiz.title`, `xpReward`  | `QuizAttemptsService` notifications | Snapshot in notification message |
| DEV4 | `UserStats.{xp, level, …}` | `EnrollmentsService`, `QuizAttemptsService` | Read+write on completion |

## What DEV3 *exposes* for other devs

| Symbol | Where | Use |
|--------|-------|-----|
| `NotificationsService.notify(userId, type, title, message, metadata?)` | `notifications/services/notifications.service.ts` | Any module emits a notification |
| `NotificationsService.notifyAdmin(type, title, message, metadata?)`    | same | Broadcast to all `role: 'ADMIN'` users |
| WS namespace `/notifications` with `auth: { token }` | `notifications/gateways/notifications.gateway.ts` | Real-time delivery |

## Event types contract (UC53)

### Student events (DEV2 / DEV4 may emit)
- `LESSON_COMPLETED`        — DEV2 emits in `EnrollmentsService.markLessonComplete`
- `COURSE_ENROLLED`         — DEV2 emits in `EnrollmentsService.enrollInCourse`
- `COURSE_COMPLETED`        — DEV2 emits in `EnrollmentsService.updateLessonProgress`
- `QUIZ_PASSED` / `QUIZ_FAILED` — DEV4 emits in `QuizAttemptsService.submitAttempt`
- `LEVEL_UP`                — DEV4 (XP engine) and DEV2 (course completion) both emit
- `BOOKMARK_COURSE_UPDATED` — DEV2 should emit when bookmarked course has new lessons
- `PAYMENT_SUCCESS`         — DEV4 emits after payment gateway callback

### Admin events
- `NEW_USER_REGISTERED`     — DEV1 emits via `notifyAdmin` in `AuthService.register`
- `STUDENT_COMMENT_REPORT`  — Future: DEV3 emits if report feature added
- `SYSTEM_ERROR`            — Anyone can emit on unrecoverable errors

## Module wiring already done

- `EnrollmentsModule` imports `NotificationsModule` ✓
- `QuizAttemptsModule` imports `NotificationsModule` ✓
- DEV1 `AuthModule` and DEV4 `XPModule` should also add `imports: [NotificationsModule]` to inject `NotificationsService`.

## Mocking when DEV1/2/4 not ready

- **Judge0**: `JUDGE0_RAPIDAPI_KEY` unset → `Judge0Service` returns echo mock
- **OpenAI**: `OPENAI_API_KEY` unset → `AIEngineService` returns canned suggestions
- **Redis**: any Redis op falls back to in-memory `Map` automatically
- **Enrollment data**: seed a fake `Enrollment` doc to test gates

## How to verify

```bash
npx ts-node -P tsconfig.json src/scripts/mock-integration-check.ts
```

Should print contract OK summary.

## Env vars DEV3 needs

```
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_RAPIDAPI_KEY=<optional — mock mode if absent>
JUDGE0_RAPIDAPI_HOST=judge0-ce.p.rapidapi.com
JUDGE0_TIMEOUT_MS=10000
OPENAI_API_KEY=<optional — mock mode if absent>
REDIS_URL=<optional — in-memory fallback if absent>
JWT_ACCESS_SECRET=<shared with DEV1>
CORS_ORIGIN=http://localhost:3000
```
