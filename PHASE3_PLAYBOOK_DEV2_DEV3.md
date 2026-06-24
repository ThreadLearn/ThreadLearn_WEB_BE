# PHASE 3 — EXECUTION PLAYBOOK (DEV2 enrollment + DEV3) — HARD SPEC

> **Mục đích:** đây là spec THỰC THI cứng. Model/dev nào đọc cũng phải ra **cùng một đích**.
> Đọc kèm [`ARCHITECTURE_RULES.md`](./ARCHITECTURE_RULES.md) (§0–§6 + skeleton §3 là luật nền).
> **Tham chiếu mẫu ĐÃ HOÀN THÀNH trong repo:** module `src/modules/course/` (golden) và
> `src/modules/lessons/` (đã refactor xong Phase 3 — copy y hệt cấu trúc/idiom của nó).
>
> Quy tắc tối thượng: **không tự nghĩ kiểu mới**. Copy `course`/`lessons`. Xong thì chạy §VERIFY.

---

## 0. INVARIANTS (vi phạm = sai, không bàn)

1. **Giữ nguyên path + shape response** cho FE. Field legacy che ở mapper (ghi) + presenter (đọc), KHÔNG xoá.
2. **File `models/*.ts` GIỮ NGUYÊN** (lớp dữ liệu dùng chung). Chỉ code của-chính-module mới đi qua repo.
   Module khác (analytics/admin…) còn import model trực tiếp = nợ của họ, KHÔNG sửa ở phase này.
3. **Cross-module CHỈ qua port đã `exports`**. Cấm import `*.model.ts`/service nội bộ của module khác.
4. `domain/` thuần (no `@nestjs`, no `mongoose`, no `*.model`, no layer ngoài).
   `application/` chỉ chạm DB qua `@Inject(TOKEN)` + interface. `infrastructure/` là nơi DUY NHẤT có `mongoose` + `*.model`.
5. **1 use-case = 1 file service = 1 method `execute()`**. Controller MỎNG: parse DTO → gọi 1 service → `ApiResponse`.
6. Mỗi module xong: `tsc --noEmit` xanh + §VERIFY của module đó sạch. **Không big-bang** — xong module này mới sang module kế.

---

## 1. TEMPLATE BẮT BUỘC (mọi module dưới đây)

```
modules/<tên-số-ít>/
├── domain/
│   ├── entities/<x>.entity.ts          # private ctor + fromPersistence() + createNew() + method nghiệp vụ + toProps()
│   ├── value-objects/<x>-status.vo.ts  # (nếu có enum/status)
│   └── interfaces/<x>.repository.ts     # I<X>Repository + export const <X>_REPOSITORY = Symbol('<X>_REPOSITORY')
├── application/
│   ├── dto/<x>.dto.ts                   # Zod schema + type (z từ '../../../../common/zod/z')
│   └── services/<verb>-<x>.service.ts   # 1 use-case / 1 execute(); @Inject(<X>_REPOSITORY)
├── infrastructure/
│   ├── mapper/<x>.mapper.ts             # doc<->entity; NƠI DUY NHẤT biết field legacy
│   └── persistence/mongo-<x>.repository.ts  # implements I<X>Repository; import model Ở ĐÂY
└── presentation/
    ├── controller/<x>.controller.ts     # mỏng
    └── response/<x>.presenter.ts        # entity -> JSON FE (gom legacy)
```

**Import paths chuẩn** (copy đúng):
`../../../../shared/errors/error-codes` (DomainError/ErrorCode) ·
`../../../../shared/http/pagination` (normalizePagination/buildPaginationMeta/PaginationParams) ·
`../../../../common/api-response` (ApiResponse) · `../../../../common/pipes/zod-validation.pipe` ·
`../../../../common/guards/jwt-auth.guard` · `../../../../common/decorators/{current-user,roles}.decorator` ·
`../../../../common/api-handler` (AuthenticatedUser) · `../../../../common/zod/z`.

**Module wiring** (y hệt `course.module.ts`):
```ts
providers: [
  MongoXRepository,
  { provide: X_REPOSITORY, useExisting: MongoXRepository },
  ...UseCaseServices,
],
exports: [X_REPOSITORY],   // export PORT, KHÔNG export service lẻ
```

---

## 2. CATALOG PORT DÙNG CHUNG (đã tồn tại — REUSE, KHÔNG tạo lại)

| Token | Interface | File | Method chính |
| --- | --- | --- | --- |
| `LEARNING_ACCESS` | `ILearningAccess` | `shared/domain/interfaces/learning-access.port.ts` | `checkLessonAccess`, `assertLessonViewAccess`, `assertLessonInteractionAccess`, `assertCourseInteractionAccess`, `touchLessonCursor` |
| `LEARNING_ACCESS_DATA` | `ILearningAccessData` | `shared/domain/interfaces/learning-access-data.port.ts` | `findLesson`, `findCourse`, `isEnrolled`, `hasActivePremium`, `touchCursor` |
| `COURSE_REPOSITORY` | `ICourseRepository` | `modules/course/domain/interfaces/course.repository.ts` | `findById`, `findByIdOrSlug`, `update` |
| `COURSE_CONTENT_PORT` | `ICourseContentPort` | `modules/course/domain/interfaces/course-content.port.ts` | `countActiveLessons`, `refreshLessonCount` |
| `LESSON_READ_PORT` | `ILessonReadPort` | `modules/lessons/domain/interfaces/lesson-read.port.ts` | `getForCompletion`, `countCourseLessons` |

> Module cần dữ liệu của aggregate khác → **import Module đó** + `@Inject(TOKEN)`. Tuyệt đối không import model lạ.
> Truy cập kiểm soát học tập (enrolled/premium/preview/locked) → **luôn** qua `LEARNING_ACCESS` (đừng tự query).

---

## 3. DEV2 — HOÀN THIỆN MODULE `enrollment`

**Hiện trạng:** đã có `application/` (services + events Phase 4) + `presentation/`, **THIẾU `domain/` và `infrastructure/`**, còn `services/enrollments.service.ts` cũ. Việc còn lại: bổ sung domain+infra, nối use-case vào repo/entity, xoá service cũ.

### 3.1 Domain
- `domain/entities/enrollment.entity.ts` — props: `id,userId,courseId,progress,progressPercent,completedLessons[],totalLessons,lastLessonId?,completed,completedAt?,enrolledAt,lastAccessedAt?`. Method:
  - `createInitial({userId,courseId,totalLessons})` → progress 0, completed false.
  - `markLessonCompleted(lessonId,totalLessons)` → push nếu chưa có (idempotent), `progress = totalLessons>0 ? round(done/total*100):0`, `progressPercent=progress`, set `lastLessonId/lastAccessedAt`; trả `{ firstTime:boolean, justCompleted:boolean }` (justCompleted = progress≥100 && !completed → set completed+completedAt).
  - `recalcByCount(count,total)` → cho route `/progress`.
- `domain/entities/lesson-progress.entity.ts` — props `userId,courseId,lessonId,isCompleted,completedAt?,lastAccessedAt`; `static markCompleted(...)`.
- `domain/interfaces/enrollment.repository.ts` — `IEnrollmentRepository` + `ENROLLMENT_REPOSITORY`:
  `findByUserAndCourse(userId,courseId)`, `findById(id)`, `listByUser(userId)` (kèm course populate → trả read-model, xem 3.4), `findActiveResume(userId)`, `create(e)`, `update(e)`.
- `domain/interfaces/lesson-progress.repository.ts` — `ILessonProgressRepository` + token: `upsertCompleted(userId,courseId,lessonId)`.

### 3.2 Cross-module (KHÔNG import model lạ)
- Đọc/validate course khi enroll → `@Inject(COURSE_REPOSITORY)`: `findById` trả `CourseEntity` (đủ `status,isPremium,prerequisites,prerequisiteThreshold,title` qua `.toProps()`).
- Tăng `totalEnrollments` → **thêm method** `incrementEnrollmentCount(courseId): Promise<void>` vào `ICourseRepository` + `MongoCourseRepository` (in-lane DEV2). KHÔNG tự đụng Course model trong enrollment.
- Đếm tổng bài tính tiến độ + validate lesson khi complete → `@Inject(LESSON_READ_PORT)`: `countCourseLessons`, `getForCompletion`.
- Check premium → `LEARNING_ACCESS_DATA.hasActivePremium` **hoặc** logic enroll cũ (giữ message `'COURSE_PREMIUM_REQUIRED'`).

### 3.3 Side-effect (XP/cert/notif/leaderboard)
Module **đã có** `application/events/*.handler.ts` + publisher (Phase 4). Đích: `complete-lesson.service` chỉ update Enrollment/LessonProgress qua repo rồi **emit** `lesson.completed`/`course.completed`; handler lo XP/cert/notif/leaderboard. **Giữ nguyên hành vi + message tiếng Việt + object trả về** `{ enrollment,totalLessons,completedLessons,progressPercent,courseCompleted,xpRewarded,stats }`.
> Nếu muốn nhanh & an toàn cho demo: tạm gọi side-effect inline trong use-case (đã được phép), nhưng PHẢI bọc sau 1 port ở `infrastructure/` — domain/application không được import model gamification.

### 3.4 Application + Presentation (giữ shape cũ)
- `enroll-in-course.service.ts`, `complete-lesson.service.ts`, `update-lesson-progress.service.ts`, `list-my-enrollments.service.ts`, `get-my-resume.service.ts`, `get-my-course-enrollment.service.ts` — nối vào repo/entity ở trên (bỏ mọi truy cập model trực tiếp).
- `list-my-enrollments`/`get-my-resume` cần course populate → repo trả **read-model** `EnrollmentWithCourseView` (populate trong adapter); presenter map đúng shape cũ (course = `{title,slug,thumbnailUrl,level,language,status,isPremium,totalLessons}`).
- `presentation/response/enrollment.presenter.ts` — giữ `_id`,`progress`,`progressPercent`,`completedLessons`,`completed`,`completedAt`,`enrolledAt`,`lastAccessedAt`,`lastLessonId`.

### 3.5 Routes enrollment (GIỮ NGUYÊN path)
| Method | Path | Use-case |
| --- | --- | --- |
| POST | `/v1/enrollments` | enroll-in-course |
| GET | `/v1/enrollments/me` | list-my-enrollments |
| GET | `/v1/enrollments/me/:courseId` | get-my-course-enrollment |
| GET | `/v1/enrollments/me/progress/:courseId` | get-my-course-enrollment |
| POST | `/v1/enrollments/:enrollmentId/progress` | complete-lesson (body `{lessonId}`) |
| GET | `/v1/students/me/enrollments` · `/progress` · `/resume` | list / list / get-my-resume |
| POST | `/v1/lessons/:id/complete` | complete-lesson — **route NÀY do enrollment host** (controller riêng `lesson-completion.controller.ts`, `@Controller('v1/lessons')` + `@Post(':id/complete')`) |

### 3.6 Dọn coupling ngoài + xoá legacy
- `modules/courses/controllers/course-legacy.controller.ts` đang gọi `EnrollmentsService.enrollInCourse` (static) → đổi sang `@Inject` use-case `EnrollInCourseService` (export use-case này từ EnrollmentsModule cho controller đó, hoặc course-legacy import EnrollmentsModule).
- Xoá `modules/enrollments/services/enrollments.service.ts` sau khi không còn ai gọi.

### 3.7 Wiring `enrollments.module.ts`
imports: `LessonsModule` (LESSON_READ_PORT), `CourseModule` (COURSE_REPOSITORY), `LearningAccessModule`, + module phát event (Phase 4). providers: 2 repo + adapters + token bindings + use-case + handlers + publisher. controllers: enrollment + student-me + lesson-completion. exports: token enroll nếu course-legacy cần.

---

## 4. DEV3 — NHÂN 4 TẦNG (comment · bookmark · notes · ai · code-execution)

**Hiện trạng:** cả 5 module legacy phẳng (`controllers/ services/ models/`), service là **static class**. Access-control đã dùng `ILearningAccess` (tốt) nhưng truyền qua tham số — đổi sang `@Inject(LEARNING_ACCESS)`.

**Quy tắc map use-case:** mỗi method public của service cũ → 1 application service (`execute()`). Bỏ tiền tố `static`, chuyển query model vào `infrastructure/persistence`. Method `assert*Access`/`checkTargetAccess` nội bộ → thay bằng gọi `LEARNING_ACCESS` trong use-case.

### 4.1 `comment`  → `modules/comment/`
- Entity `comment.entity.ts` (target LESSON/COURSE, content, parentId, authorId, likes…). Repo `IComment Repository` + `COMMENT_REPOSITORY`.
- Use-case (từ method cũ): `list-comments`, `list-replies`, `create-comment`, `update-comment`, `delete-comment`. Access qua `LEARNING_ACCESS.assertCourseInteractionAccess`/`assertLessonInteractionAccess`.
- Controllers: `@Controller('v1/comments')` (list/create/update/delete/replies) **+ controller nested** `@Controller('v1/lessons')` method `@Get(':id/comments')`,`@Post(':id/comments')` (route nhận về từ lessons — path GIỮ NGUYÊN).

### 4.2 `bookmark` → `modules/bookmark/`
- Entity + `BOOKMARK_REPOSITORY`. Use-case: `toggle-bookmark`, `list-my-bookmarks`, `update-bookmark`, `remove-bookmark`, `is-bookmarked`.
- Controllers: `@Controller('v1/bookmarks')` (toggle/me/check/update/delete + alias `/lesson/:lessonId`) **+ nested** `@Controller('v1/lessons')` `@Post(':id/bookmarks')`.

### 4.3 `notes` → `modules/notes/` (model `Note`)
- Entity + `NOTE_REPOSITORY`. Use-case: `list-by-lesson`, `search-notes`, `upsert-note`, `update-note`, `remove-note`. Access qua `LEARNING_ACCESS.assertLessonInteractionAccess`.
- Controllers: `@Controller('v1/notes')` (list/search/create/update/delete) **+ nested** `@Controller('v1/lessons')` `@Get(':id/notes/me')`,`@Post(':id/notes')`.

### 4.4 `ai` → `modules/ai/`
- Entity `ai-recommendation.entity.ts` / history. Repo `AI_HISTORY_REPOSITORY`. Use-case: `request-recommendation`, `get-history-logs`, `get-history-by-id`, `update-feedback`. `assertDailyLimit` → domain service hoặc method entity (thuần). Access lesson qua `LEARNING_ACCESS.assertLessonInteractionAccess`.
- Routes giữ nguyên: `/v1/ai/recommend|recommendation`, `/v1/ai/history*`, feedback.

### 4.5 `code-execution` → `modules/code-execution/` (model `Exercise` + history)
- Entity `exercise.entity.ts` + `execution.entity.ts`. Repo `EXERCISE_REPOSITORY` + `EXECUTION_REPOSITORY`. Use-case: `run-code`(`/v1/ide/run` hoặc `/v1/exercises`), `list-execution-history`, `get-exercise`, `list-exercises-by-lesson`, `create-exercise`, `update-exercise`, `remove-exercise`, `submit-exercise`(grade). Access qua `LEARNING_ACCESS.assertLessonViewAccess`/`assertLessonInteractionAccess`.
- **Lưu ý:** lessons gọi seed exercise qua `EXERCISE_SEEDER_PORT` (đã có ở lessons). Không phá interface đó. Nếu muốn sạch hơn: code-execution **export** 1 seeder port để lessons inject thay vì import model — *optional, không bắt buộc phase này*.

### 4.6 Sau khi xong DEV3
- Route nested comment/bookmark/note giờ do module sở hữu host → **xoá file** `modules/lessons/presentation/controller/lesson-nested-bridge.controller.ts` (nếu còn) và bỏ khỏi `lessons.module`.
- Mỗi service static cũ (`comment/services/*`, …) bị xoá; cập nhật mọi nơi gọi static (đặc biệt: lessons bridge đã bỏ; kiểm tra `grep`).

---

## 5. ROUTE MIGRATION (nested off `lessons`) — KIỂM CHỨNG SAU CÙNG

| Path (GIỮ NGUYÊN) | Trước | Sau (owner) |
| --- | --- | --- |
| `GET/POST /v1/lessons/:id/comments` | lessons bridge | **comment** module |
| `POST /v1/lessons/:id/bookmarks` | lessons bridge | **bookmark** module |
| `GET/POST /v1/lessons/:id/notes(/me)` | lessons bridge | **notes** module |
| `POST /v1/lessons/:id/complete` | lessons (cũ) | **enrollment** module |
| `*/lessons` còn lại (CRUD/lock/versions/attachment/detail/access-check) | — | **lessons** (đã xong) |

Sau migration: `grep -rn "lessons/.*bridge\|EnrollmentsService\|CommentService\|BookmarkService\|NotesService" src/modules/lessons` phải **rỗng**.

---

## 6. VERIFY — chạy từ `ThreadLearn_WEB_BE/` sau MỖI module (BẮT BUỘC, phải sạch)

```bash
./node_modules/.bin/tsc.cmd -p tsconfig.json --noEmit            # exit 0

# domain bẩn?
grep -rEl "from 'mongoose'|\.model'|\.schema'|@nestjs|presentation/" src/modules/<m>/domain && echo "❌ DOMAIN" || echo "✅"
# application chạm DB?
grep -rEl "from 'mongoose'|\.model'|\.schema'" src/modules/<m>/application && echo "❌ APP" || echo "✅"
# presentation chạm DB?
grep -rEl "from 'mongoose'|\.model'" src/modules/<m>/presentation && echo "❌ PRES" || echo "✅"
# coupling: import model/service module khác?
grep -rnE "modules/(lessons|enrollments|comment|bookmark|notes)/.*(model|\.service)|LessonsService|EnrollmentsService" src/modules/<m>/{domain,application} && echo "❌ COUPLING" || echo "✅"
```

**Toàn repo (cuối Phase 3):**
```bash
grep -rEl "from 'mongoose'|\.model'|\.schema'|@nestjs|presentation/" src/modules/*/domain
grep -rEl "from 'mongoose'|\.model'|\.schema'" src/modules/*/application
# => chỉ được phép rỗng. (gamification còn 2 lỗi cũ: user-stats.repository.interface.ts + get-stats.service.ts — DEV4 sửa)
```

---

## 7. DEFINITION OF DONE (tick từng module)

- [ ] Đủ 4 tầng đúng §1: entity thuần (private ctor + factory + method + toProps), port + Symbol token, repo+mapper, controller mỏng, presenter.
- [ ] Service static cũ "đụng model" → đã thay bằng `@Inject(TOKEN)` + `infrastructure/persistence`. **Đã xoá file service cũ.**
- [ ] Business rule nằm trong Entity, KHÔNG ở service. 1 service = 1 `execute()`.
- [ ] Cross-module 100% qua port đã `exports`; KHÔNG import model/service module khác.
- [ ] Nested-route đã về controller module sở hữu; **path + shape response KHÔNG đổi**; field legacy còn nguyên.
- [ ] `tsc --noEmit` xanh + §6 grep của module sạch + coupling grep rỗng.

---

## 8. GUARDRAILS — KHÔNG ĐƯỢC LÀM

- KHÔNG đổi path/route, KHÔNG đổi shape JSON trả về, KHÔNG xoá field legacy (chỉ `@deprecated`).
- KHÔNG xoá/di chuyển file `models/*.ts`; KHÔNG đổi tên model Mongoose.
- KHÔNG sửa module ngoài phạm vi được giao (vd DEV3 không đụng quiz/gamification). Ngoại lệ in-lane DEV2: thêm `incrementEnrollmentCount` vào `ICourseRepository`.
- KHÔNG đổi chữ ký các port đã export ở §2 (chỉ được THÊM method, không sửa/bỏ).
- KHÔNG gộp nhiều use-case vào 1 service. KHÔNG để business logic trong controller.
- Mỗi module xong PHẢI chạy §6 trước khi báo "done". Không đoán — copy `course`/`lessons`.
