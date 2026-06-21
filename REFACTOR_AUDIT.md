# ThreadLearn BE — Audit Coupling/Cohesion (DEV2 + DEV3)

> Mục tiêu: chốt **hiện trạng** kiến trúc của các module DEV2 (Course/Lesson/Learning) và DEV3
> (Comment/Bookmark/Note/IDE/AI) trước khi refactor sang low-coupling / high-cohesion / clean architecture.
> Mọi phát hiện đều kèm `file:line` để 4 dev đối chiếu trực tiếp.
>
> Ngày lập: 2026-06-21 · Phạm vi: `ThreadLearn_WEB_BE/src/modules/`

---

## 0. Tóm tắt điều hành (đọc cái này trước)

Hệ thống **đã chạy được** và **100% endpoint dùng `ApiResponse` wrapper** (điểm mạnh). Vấn đề không phải "thiếu tính năng" mà là **3 điểm coupling** khiến module khó test/khó sửa độc lập:

| # | Vấn đề | Mức độ | Gốc rễ |
|---|---|---|---|
| **C1** | **Coupling ngược DEV2 → DEV3**: `LessonsController` import & gọi `CommentService`, `BookmarkService`, `NotesService`, `EnrollmentsService` | 🔴 Cao | Nested-route đặt nhầm vào controller của module không sở hữu |
| **C2** | **Access-control kernel đặt sai chỗ**: logic "user có được xem/tương tác lesson?" nằm trong `LessonsService.checkAccess()`, bị 8 nơi DEV3 gọi với tham số lệch nhau | 🔴 Cao | Chưa tách thành service dùng chung; logic bị nhân bản + lệch chuẩn |
| **C3** | **`EnrollmentsService` là god-object**: `markLessonComplete()` gọi trực tiếp Gamification + Certificates + Notifications + Leaderboard + 4 model ngoài | 🔴 Cao | Side-effect chạy đồng bộ trong luồng nghiệp vụ chính |

Phụ trợ: thiếu DTO ở 3 module, field legacy rải rác, `Section` hard-delete ngược chuẩn soft-delete, manual JWT decode trong controller.

---

## 1. Bản đồ phụ thuộc hiện tại

```
┌─ DEV2: COURSES ──────────────┐      ┌─ DEV2: LESSONS ─────────────────────────────┐
│ CoursesService               │      │ LessonsController                            │
│  └─ read: Lesson, Section    │      │  ├─→ CommentService      (POST :id/comments) │  C1
│ CourseReviewsService         │      │  ├─→ BookmarkService     (POST :id/bookmarks)│  C1
│  └─ read: Enrollment ⚠       │      │  ├─→ NotesService        (GET/POST :id/notes)│  C1
│ CoursesController            │      │  └─→ EnrollmentsService  (POST :id/complete) │  C1
│  └─→ EnrollmentsService      │ C1   │ LessonsService                               │
│      (POST :id/enroll)       │      │  ├─ checkAccess(): read Course/User/Enroll ⚠ │  C2 (kernel)
└──────────────────────────────┘      │  └─→ CoursesService.refreshLessonCount()     │
                                       │  └─ dynamic import Exercise (code-exec) ⚠    │
                                       └──────────────────────────────────────────────┘
┌─ DEV2: ENROLLMENTS ───────────────────────────────────────────────────────────────┐
│ EnrollmentsService.markLessonComplete()  → god-object                              │  C3
│   ├─→ UserStats (XP/level)        ├─→ CertificatesService                          │
│   ├─→ NotificationsService        ├─→ LeaderboardService.invalidateCache()         │
│   └─ read: Course, Lesson, User                                                    │
└────────────────────────────────────────────────────────────────────────────────────┘
┌─ DEV3: COMMENT/BOOKMARK/NOTE/CODE/AI ──────────────────────────────────────────────┐
│ 8 call-site → LessonsService.assertLessonAccess()  (tham số allowPreview lệch nhau)│  C2
│ comment.service: tự viết access-control riêng cho COURSE (thiếu check premium) ⚠   │  C2-bug
└────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Chi tiết theo module (DEV2)

### 2.1 `courses/`
- Cấu trúc: `controllers/{courses,sections}.controller.ts`, `services/{courses,sections,course-reviews}.service.ts`, `models/{course,section,course-review}.model.ts`. **Không có `validators/`.**
- Routes `CoursesController` (`courses.controller.ts:33-192`): list/search/detail (public), create/update/publish/delete/restore/thumbnail (ADMIN), `POST :id/enroll` (STUDENT), reviews.
- **Smell:**
  - `POST /v1/courses/:id/enroll` → gọi `EnrollmentsService.enrollInCourse()` (`courses.controller.ts:135-142`) — **C1**, có 2 đường enroll trùng (`/courses/:id/enroll` và `/enrollments`).
  - `CourseReviewsService.createOrUpdate()` import `Enrollment` để check 50% progress (`course-reviews.service.ts:3,36`) — đọc model module khác.
  - Field legacy `coverImage`(=thumbnailUrl), `isPublished`(=status) (`course.model.ts:34-36`), dual-write tại `courses.service.ts:146-148`.
  - `@Body() body: any` ở create/update/publish/review — **thiếu DTO**.
  - Response: ✅ 100% `ApiResponse.success()`.

### 2.2 `lessons/`
- Cấu trúc: `controllers/lessons.controller.ts`, `services/lessons.service.ts`, `models/{lesson,lesson-version}.model.ts`. **Không có `validators/`.**
- **Smell C1** — `LessonsController` (`lessons.controller.ts:80-197`) host route của module khác:
  - `GET/POST :id/comments` → `CommentService` (`:82,:98`)
  - `POST :id/bookmarks` → `BookmarkService` (`:115`)
  - `GET :id/notes/me`, `POST :id/notes` → `NotesService` (`:132,:144`)
  - `POST :id/complete` → `EnrollmentsService.markLessonComplete()` (`:195`)
- **Smell C2 (kernel)** — `LessonsService.checkAccess()` (`lessons.service.ts:246-287`): đọc `Lesson`+`Course`+`User`+`Enrollment`, trả `reason ∈ {ADMIN, PREVIEW, ENROLLED, NOT_ENROLLED, LESSON_LOCKED, LESSON_NOT_FOUND, PREMIUM_REQUIRED}`. Đây là **logic dùng chung toàn hệ thống** nhưng đang chôn trong service của lessons.
- Khác: `createLesson()`/`softDelete()` gọi `CoursesService.refreshLessonCount()` (`:123,:229`); dynamic import `Exercise` (`:137`); manual JWT decode `getOptionalUser()` (`:39-48`); field legacy `content/attachmentUrl/order` (`lesson.model.ts:28-30`).
- Response: ✅ 100% `ApiResponse.success()`.

### 2.3 `enrollments/`
- Cấu trúc: `controllers/enrollments.controller.ts` (chứa cả `EnrollmentsController` + `StudentMeController`), `services/enrollments.service.ts`, `models/{enrollment,lesson-progress}.model.ts`. **Không có `validators/`.**
- **Smell C3** — import từ 6+ module (`enrollments.service.ts:1-14`): `Course, Lesson, UserStats, User, NotificationsService, CertificatesService, LeaderboardService`.
  - `enrollInCourse()` (`:17-80`): validate status/premium/prerequisites → tạo enrollment → `++Course.totalEnrollments` → notify+email.
  - `markLessonComplete()` (`:101-201`): cập nhật progress → cấp certificate → award XP → cập nhật UserStats → invalidate leaderboard → notify. **Tất cả đồng bộ trong 1 hàm.**
- Field legacy `progress` + `progressPercent` (cùng giá trị, `enrollment.model.ts:7`), check phòng thủ `progressPercent ?? progress` (`course-reviews.service.ts:44`).
- Response: ✅ 100% `ApiResponse.success()`.

---

## 3. Chi tiết coupling DEV3 → DEV2

### 3.1 Import chéo (DEV3 → DEV2)
| Module DEV3 | Import từ DEV2 | File |
|---|---|---|
| comment | `LessonsService`, `Lesson`, `Course`, `Enrollment` | `comment.service.ts:3-6` |
| bookmark | `LessonsService` | `bookmark.service.ts:4` |
| notes | `LessonsService` | `notes.service.ts:3` |
| code-execution | `LessonsService` | `code-execution.service.ts:5`, `exercises.service.ts:4` |
| ai | `LessonsService`, `Course`, `User` | `ai.service.ts:2-4` |

> DEV3 **chỉ** phụ thuộc access-control (`assertLessonAccess`) + vài model để lấy `courseId`. → Tách kernel sẽ cắt gần hết coupling này.

### 3.2 8 call-site `assertLessonAccess` (tham số **không nhất quán**)
| Nơi gọi | File:Line | `allowPreview` |
|---|---|---|
| comment.checkTargetAccess (LESSON) | `comment.service.ts:197` | ❌ |
| comment (COURSE) — **logic tự viết, thiếu check premium** ⚠ | `comment.service.ts:175-199` | n/a |
| bookmark.toggleBookmark | `bookmark.service.ts:25` | ✅ true |
| notes.listByLesson / upsert | `notes.service.ts:12,18` | ❌ |
| code-execution.executeCode | `code-execution.service.ts:230` | ✅ true |
| exercises.grade | `exercises.service.ts:84` | ❌ |
| ai.requestRecommendation | `ai.service.ts:39` | ❌ |

**Hệ quả:** cùng khái niệm "được tương tác với lesson" nhưng 8 nơi cho ra kết quả khác nhau → bug tiềm ẩn về quyền (vd comment khoá premium chưa mua vẫn lọt).

---

## 4. Các smell phụ (gom để xử lý ở phase cleanup)
- **Thiếu DTO/validator**: `courses`, `lessons`, `enrollments` nhận `@Body() body: any` (auth/admin/quiz/bookmark/comment thì có validator).
- **Field legacy** (single source of truth bị nhân đôi): `Course.{coverImage,isPublished}`, `Lesson.{content,attachmentUrl,order}`, `Enrollment.{progressPercent}`.
- **Soft-delete không nhất quán**: Course/Lesson soft-delete; `Section` **hard delete** (`sections.service.ts:55`).
- **Manual JWT decode** trong controller: `LessonsController.getOptionalUser()` (`lessons.controller.ts:39-48`) thay vì decorator.
- **Premium edge case**: `subscriptionExpiresAt = null` đang bị coi như "không hết hạn" (`lessons.service.ts:271-276`).
- **Tài liệu lỗi thời**: `uc_audit.md` còn trỏ path `d:/FPT_University.../WDP301/...`.

---

## 5. Điểm mạnh cần GIỮ
- Response contract đồng nhất (`ApiResponse`) trên toàn bộ ~37 endpoint.
- Index DB thiết kế tốt (compound `{userId,courseId}` unique, `{courseId,orderIndex}`...).
- Soft-delete + restore window 30 ngày cho Course.
- Phân tách `controllers/ · services/ · models/` rõ ràng theo chuẩn NestJS.

→ Refactor sẽ **không phá** các điểm này; chỉ tái cấu trúc phụ thuộc.
