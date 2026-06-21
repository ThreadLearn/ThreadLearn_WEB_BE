# ThreadLearn BE — Refactor Plan (DEV2 + DEV3)

> Mục tiêu: đưa DEV2 (Course/Lesson/Learning) và DEV3 (Comment/Bookmark/Note/IDE/AI) về
> **low coupling · high cohesion · clean architecture**, không phá API đang chạy của FE.
>
> Đọc kèm: [`REFACTOR_AUDIT.md`](./REFACTOR_AUDIT.md) (hiện trạng + file:line).
>
> ## Quyết định kiến trúc đã chốt
> - **Khung: Clean Architecture 4 tầng theo `check.txt`** (đồng bộ với DEV4) — `domain / application / infrastructure / presentation`, có **Repository pattern**.
> - **Decouple EnrollmentsService = Domain Events** (`@nestjs/event-emitter`).
> - **Field legacy = cô lập qua Mapper/Presenter** (giữ single source of truth, không phá FE).

---

## 1. Khung thư mục chuẩn (áp cho MỖI module DEV2/DEV3)

Theo đúng `check.txt`. Ví dụ module `course`:

```
modules/course/
├── domain/                         # Tầng lõi — KHÔNG phụ thuộc NestJS/Mongoose
│   ├── entities/course.entity.ts   # Entity thuần (business rules), tách khỏi Mongoose
│   ├── interfaces/
│   │   └── course.repository.ts    # PORT: interface ICourseRepository
│   └── value-objects/              # CourseStatus, Slug, Price... (nếu cần)
├── application/                    # Use-case orchestration
│   ├── dto/                        # Input/output DTO + class-validator
│   ├── commands/                   # Lệnh ghi (CreateCourseCommand...)
│   ├── queries/                    # Lệnh đọc (ListCoursesQuery...)
│   ├── services/                   # 1 service / 1 use case
│   │   ├── create-course.service.ts
│   │   ├── update-course.service.ts
│   │   ├── delete-course.service.ts
│   │   └── enroll-course.service.ts
│   └── events/                     # Domain events + handlers (cho enrollment)
├── infrastructure/                 # Adapter ra thế giới ngoài
│   ├── persistence/
│   │   └── mongo-course.repository.ts  # impl ICourseRepository bằng Mongoose
│   └── mapper/course.mapper.ts     # Entity  <->  Mongoose document  <->  Response DTO
└── presentation/
    ├── controller/course.controller.ts # Controller MỎNG
    └── response/                    # Presenter: shape trả về FE (che field legacy)
```

**Quy tắc phụ thuộc (Dependency Rule):** `presentation → application → domain`. `infrastructure` chỉ được `domain`/`application` biết qua **interface (port)**, nối bằng DI. **Domain không import bất cứ thứ gì của Mongoose/NestJS.**

---

## 2. Nguyên tắc bắt buộc

1. **Controller mỏng** (`presentation/`): parse input (DTO) → gọi 1 application service → trả `ApiResponse`. Cấm business logic, cấm decode JWT thủ công.
2. **Truy cập DB chỉ qua Repository port**. Service **không** import Mongoose model trực tiếp (kể cả model của chính module).
3. **Cross-module = qua port/application-service của module kia**, KHÔNG import model/service nội bộ module khác. (Giải C1)
4. **Side-effect (XP, certificate, notification, leaderboard) = Domain Event handler**, không gọi trực tiếp trong use case. (Giải C3)
5. **1 nguồn sự thật / field**; shape cho FE do **Mapper/Presenter** sinh. (Giải legacy)
6. **Đường dẫn API không đổi** → FE không phải sửa.

---

## 3. Ánh xạ 3 coupling (C1/C2/C3) vào 4 tầng

| Vấn đề (xem AUDIT) | Giải pháp trong khung Clean Architecture |
|---|---|
| **C1** — `LessonsController` gọi `Comment/Bookmark/Notes/Enrollment` service | Mỗi nested-route về **`presentation/controller` của module sở hữu** (path giữ nguyên). Lesson không còn biết các module kia. |
| **C2** — access-control kernel chôn trong `LessonsService.checkAccess()` | Tách **`LearningAccessService`** = shared application service sau **port `ILearningAccess`**. DEV3 inject port này, không import `LessonsService`/model. |
| **C3** — `EnrollmentsService` god-object | `complete-lesson.service.ts` chỉ cập nhật Enrollment/Progress qua repo rồi **emit `lesson.completed`/`course.completed`**. Gamification/Cert/Notif/Leaderboard là **event handler** (`application/events/`). |

| Khái niệm trong plan cũ | Vị trí trong khung `check.txt` |
|---|---|
| Presenter | `infrastructure/mapper` + `presentation/response` |
| DTO | `application/dto` (+ `commands/` ghi, `queries/` đọc) |
| LearningAccessService | shared module: port ở `domain/interfaces`, impl ở `application/services` |
| Domain Events | `application/events` + `EventEmitterModule` (shared) |
| "Service đụng model trực tiếp" | thay bằng `domain/interfaces/*.repository.ts` + `infrastructure/persistence` |

---

## 4. Shared Kernel (dùng chung, không thuộc dev nào)

```
src/shared/
├── domain/interfaces/learning-access.port.ts   # ILearningAccess
├── application/learning-access/                 # impl: canViewLesson / canInteractLesson / isEnrolled / hasActivePremium
├── application/events/                          # event bus setup + base event types
├── response/api-response.ts                     # contract { success, message, data, meta? }
└── errors/error-codes.ts                        # bảng ErrorCode dùng chung
```
> `LearningAccessService` phụ thuộc `ICourseRepository` / `ILessonRepository` / `IEnrollmentRepository` (port), **không** đụng Mongoose → vẫn test được bằng mock.

---

## 5. Roadmap theo Phase

### Phase 0 — Audit ✅
Deliverable: `REFACTOR_AUDIT.md`.

### Phase 1 — Khung + Contract (nền móng #1)
- Dựng `shared/` (ApiResponse, ErrorCode, EventEmitter).
- Định nghĩa **chuẩn skeleton 4 tầng** + 1 module mẫu hoàn chỉnh = **`course`** (đúng ví dụ `check.txt`): entity, `ICourseRepository`, `MongoCourseRepository`, mapper, application services per-UC, controller mỏng.
- Module mẫu này là **bản mẫu để 4 dev nhân theo**.

### Phase 2 — `LearningAccessService` (access kernel, nền móng #2)
- Port `ILearningAccess` + impl trong `shared`. Di chuyển logic `LessonsService.checkAccess()` (AUDIT §2.2) vào đây.
- **8 call-site DEV3** (AUDIT §3.2) inject port, bỏ import `LessonsService`/model.
- Sửa 2 bug nhất quán: comment-COURSE thêm check premium; chuẩn hoá `allowPreview`.

### Phase 3 — Tách module theo 4 tầng + đảo chiều C1
- Chuyển `course`, `lesson`, `enrollment` sang layout 4 tầng (repository + mapper + per-UC service + controller mỏng).
- Đưa nested-route `comments/bookmarks/notes/complete` về `presentation/controller` của module sở hữu. Gỡ import chéo khỏi `lesson`.

### Phase 4 — Domain Events cho Enrollment (C3)
- `complete-lesson.service.ts` emit `lesson.completed`/`course.completed`.
- Handler: `GamificationHandler`, `CertificatesHandler`, `NotificationsHandler`, `LeaderboardHandler`.
- ⚠ Side-effect async → test kỹ "course.completed → cert + XP".

### Phase 5 — Fix luồng Student (trên nền đã ổn)
`search/filter UC24` → `detail UC23` → `enroll UC26` → `view lesson UC25` → `complete UC27` → `progress UC28`. Mỗi UC = 1 application service mỏng + DTO + mapper + access qua port. Gộp 2 đường enroll trùng về 1.

### Phase 6 — Admin Course/Lesson CRUD (UC15–22)
DTO/command đầy đủ; đồng nhất soft-delete (sửa `Section` hard-delete → soft); rà `@Roles('ADMIN')`.

### Phase 7 — Cleanup + tài liệu
Gỡ/`@deprecated` field legacy (sau khi mapper che); bỏ manual JWT decode → `@CurrentUser()`; xử lý premium `subscriptionExpiresAt = null`; cập nhật `uc_audit.md`.

---

## 6. Thứ tự thực thi & checkpoint
1. **Phase 1 + 2** → checkpoint (chuẩn khung + access kernel; ai cũng phụ thuộc → làm trước).
2. **Phase 3 + 4** → checkpoint (gỡ coupling cấu trúc).
3. **Phase 5 + 6** → luồng nghiệp vụ.
4. **Phase 7** → dọn.

Sau mỗi phase: `npm run build` xanh + smoke-test luồng học chính.

---

## 7. Ma trận tác động FE
| Phase | Đụng API path? | Đụng response shape? | Rủi ro FE |
|---|---|---|---|
| 1–3 | Không (path giữ) | Không (mapper che) | Thấp |
| 4 | Không | Không | Trung bình (timing async) |
| 5–6 | Không | Không | Thấp |
| 7 | Không | Chỉ khi gỡ legacy → FE chuyển trước | Có kiểm soát |

---

## 8. Phân công 4 dev
- **Kernel (Phase 1–2)**: 1 người chủ trì + cả nhóm review. **Không ai code phase sau khi kernel chưa xong.** Module mẫu `course` = bản chuẩn để nhân.
- **DEV2**: Phase 3 (course/lesson/enrollment 4 tầng), Phase 5–6.
- **DEV3**: Phase 3 (comments/bookmarks/notes về module mình) + chuyển sang `ILearningAccess`.
- **DEV4**: đã theo `check.txt` → review chuẩn khung + handler Phase 4 (Gamification/Leaderboard). Notifications (DEV1) review handler của mình.

---

## 9. Nguyên tắc migrate an toàn
- **Không big-bang.** Làm **từng module**, bắt đầu `course` (khớp ví dụ `check.txt`), build xanh rồi sang module kế.
- Giữ Mongoose model hiện tại làm **persistence detail** sau repository — không xoá vội, chỉ ẩn sau port.
- Mọi thay đổi qua mapper → FE không cảm nhận khác biệt cho tới Phase 7.
