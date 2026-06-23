# ThreadLearn BE DEV1 Clean Architecture Progress

## Last Updated

- Date/time: 2026-06-23
- Branch: `refactor/dev1-clean-architecture`
- Module: DEV1 / `auth`
- Task: **DEV1.2 Auth Infrastructure Adapters** (mapper + Mongo repos + bcrypt/JWT/SMTP/Google adapter; KHÔNG wire runtime). Xem section "DEV1.2 Auth Infrastructure Adapters" cuối file. (Trước đó: DEV1.1 Skeleton + Ports.)

## Current Status

Baseline audit của toàn bộ scope DEV1 đã hoàn tất. **Không thay đổi source code, không di chuyển/đổi tên file, không commit.**
Hiện trạng: 3 module DEV1 (`auth`, `users`, `admin`) + `analytics` vẫn đang ở **layout legacy phẳng**
(`controllers/`, `services/`, `models/`, `validators/`, `utils/`) theo kiểu `Controller → static Service → Mongoose Model`.
Chưa có tầng `domain/ · application/ · infrastructure/ · presentation/`.

Tin tốt:
- Shared code (`JwtAuthGuard`, `Roles`, `CurrentUser`, `ApiResponse`, `AuthenticatedUser`) **đã được dùng đúng** ở cả 3 controller — không có duplicate guard/decorator/helper/type.
- `npm run build`, `npm run lint` (0 error), `npm test` (13/13) đều xanh.

Rủi ro chính: `auth.service.ts` là **God service ~563 dòng** ôm 100% nghiệp vụ auth + tự tay gọi bcrypt/jwt/crypto/fetch (không qua `src/utils`), và có **coupling chéo module** (tạo `UserStats` của gamification trực tiếp).

---

## Current DEV1 Baseline

> Lưu ý đường dẫn thật: app có `app.setGlobalPrefix('api')` (main.ts:24) và controller dùng `@Controller('v1/...')`.
> ⇒ **Path thật = `/api/v1/...`** (REFACTOR_PLAN_DEV1.md mục 6 ghi `/auth/...` là rút gọn — không phải path thật).

### Auth

- **Controllers:**
  - `src/modules/auth/controllers/auth.controller.ts` (`@Controller('v1/auth')`). Controller gọi thẳng `AuthService.<static>` (không inject — gọi static class). Chỉ route `session` có `@UseGuards(JwtAuthGuard)`.
- **Routes (path thật):**
  - `POST   /api/v1/auth/register`              → 201
  - `POST   /api/v1/auth/verify-email`          → 200
  - `POST   /api/v1/auth/resend-verification`   → 200
  - `POST   /api/v1/auth/forgot-password`       → 200
  - `POST   /api/v1/auth/reset-password`        → 200
  - `GET    /api/v1/auth/google`                → 302 redirect tới Google
  - `GET    /api/v1/auth/google/callback`       → 302 redirect về FE (success/failure URL)
  - `POST   /api/v1/auth/login`                 → 200
  - `POST   /api/v1/auth/refresh`               → 200
  - `POST   /api/v1/auth/logout`                → 200
  - `GET    /api/v1/auth/session`               → 200 (JwtAuthGuard)
- **Services:**
  - `src/modules/auth/services/auth.service.ts` (~563 dòng, **static class**). Methods:
    `generateTokens`, `register`, `login`, `getGoogleAuthorizationUrl`, `loginWithGoogleCode`, `refresh`, `logout`,
    `verifyEmail`, `resendVerification`, `forgotPassword`, `resetPassword`, `getSessionUser`,
    + private: `createAndSendVerificationToken`, `createAndSendPasswordResetToken`, `generateRawToken`, `hashToken`,
    `assertGoogleOAuthConfigured`, `getGoogleCallbackUrl`, `exchangeGoogleCode`, `getGoogleUserInfo`, `createGoogleUser`, `createAuthResponse`.
  - `src/modules/auth/services/email.service.ts` (static class) — SMTP qua `nodemailer`. Methods: `sendVerificationEmail`, `sendPasswordResetEmail`, `sendStudentInvitationEmail`, + private `hasSmtpConfig`, `dispatch` (fire-and-forget + retry backoff), `sendMail`, `escapeHtml`.
  - `src/modules/auth/utils/user-sanitizer.ts` — `sanitizeUser()` (presenter) + `assertUserCanAuthenticate()` (guard nghiệp vụ) + type `SafeUser`.
- **Models (Mongoose, import trực tiếp):**
  - `models/user.model.ts` (`User` / `IUser`) — unique index: `email`, `googleId` (sparse), `githubId` (sparse).
  - `models/refresh-token.model.ts` (`RefreshToken`) — lưu **raw token** field `token` (unique index) + **TTL index** `expiresAt` (`expireAfterSeconds: 0`).
  - `models/email-verification-token.model.ts` — lưu `tokenHash` (sha256, unique index) + `usedAt` + `expiresAt`.
  - `models/password-reset-token.model.ts` — lưu `tokenHash` (sha256, unique index) + `usedAt` + `expiresAt`.
- **Validators:** `validators/auth.validator.ts` (Zod): `registerSchema`, `loginSchema`, `refreshTokenSchema`, `verifyEmailSchema`, `resendVerificationSchema`, `forgotPasswordSchema`, `resetPasswordSchema`, `googleOAuthCallbackSchema`. (Password `min(6)`.)
- **Response shapes (bọc trong `ApiResponse.success`):**
  - `register` → `data: { user: SafeUser, verificationRequired: true, message: '...' }`
  - `login` → `data: { user: { id, email, firstName, lastName, role }, accessToken, refreshToken }`
    ⚠️ **login KHÔNG dùng `sanitizeUser`** — trả object thủ công, `id` = `user._id` (ObjectId, JSON hoá thành string), **thiếu** `avatarUrl/isVerified/isActive/...`. Khác với google/session/verify (dùng `sanitizeUser`).
  - `google/callback` → 302 redirect, query: `accessToken`, `refreshToken`, `user=JSON.stringify(sanitizeUser)`
  - `refresh` → `data: { accessToken, refreshToken }`
  - `logout` → chỉ `message`
  - `session` → `data: { user: SafeUser }`
  - `verify-email` → `data: { user: SafeUser }`
  - `SafeUser` = `{ id, email, firstName, lastName, avatarUrl?, role, isVerified?, isActive?, lastLoginAt?, createdAt?, updatedAt? }` (KHÔNG có `planType/subscriptionExpiresAt`).
- **Security behavior (xem thêm mục Security Baseline):** bcrypt rounds 10; anti-enumeration (dummy bcrypt compare khi user không tồn tại; forgot-password im lặng); account lockout 5 lần/15 phút; reject email chưa verify; refresh-token **reuse detection** + **rotation**; verification/reset token lưu **hash**; reset password **revoke all** refresh token; Google `email_verified===false` bị từ chối + check `googleId` linking.
- **Mongoose/model imports:** `auth.service.ts` import trực tiếp 4 model auth + `UserStats` (gamification → coupling chéo). `user-sanitizer.ts` thuần (chỉ import `common/custom-error`).
- **Refactor risks:** xem mục Risk Assessment. (auth.service = file rủi ro #1.)

### Users

- **Controllers:** `src/modules/users/controllers/users.controller.ts` (`@Controller('v1/users')`, class-level `@UseGuards(JwtAuthGuard)` + `@ApiBearerAuth`). Gọi `UsersService.<static>`.
- **Routes (path thật):**
  - `GET   /api/v1/users/profile`
  - `PATCH /api/v1/users/profile`
  - `POST  /api/v1/users/avatar`  (multipart, `FileInterceptor('avatar')`)
- **Services:** `services/users.service.ts` (static class): `getProfile`, `updateProfile`, `updateAvatar`.
- **Upload/avatar handling:** Controller dùng `@UploadedFile() file?: Express.Multer.File` → gọi `saveUploadedFile(file, 'avatars')` (từ `src/configs/upload.ts`, ghi xuống `UPLOAD_DIR/avatars`, trả URL `/uploads/avatars/...`) → `UsersService.updateAvatar(userId, url)`. ⚠️ `Express.Multer.File` + filesystem nằm ở **controller/config**, sẽ phải đẩy về infrastructure khi refactor.
- **Response shapes:**
  - `profile` GET → `data: { user: SafeUser, stats: UserStats | { xp:0, level:1, currentStreak:0, highestStreak:0 } }`
  - `profile` PATCH → `data: SafeUser`
  - `avatar` POST → `data: SafeUser`
- **Validators:** `validators/users.validator.ts` — `updateProfileSchema` (firstName/lastName/avatarUrl optional, refine ≥1 field).
- **Mongoose/model imports:** `users.service.ts` import `User` (auth model), `UserStats` (gamification model), `sanitizeUser`/`assertUserCanAuthenticate` (auth util). Service **đụng model trực tiếp** + coupling chéo 2 module.
- **Refactor risks:** response `profile` lồng `stats` của gamification ⇒ refactor users phải giữ cấu trúc `{ user, stats }`; `stats` mặc định khi null. Domain users không được biết `Express.Multer.File`.

### Admin

- **Controllers:** `src/modules/admin/controllers/admin.controller.ts` (`@Controller('v1/admin')`, class-level `@UseGuards(JwtAuthGuard)` + `@Roles('ADMIN')` + `@ApiBearerAuth`). **Có constructor inject `CodeExecutionService`** (route `execute`). Các route khác gọi `AdminService.<static>` / `AnalyticsService.<static>`.
- **Routes (path thật):**
  - `POST  /api/v1/admin/students`              → 201  (UC10 Add Student)
  - `GET   /api/v1/admin/students`              → 200  (UC12 List)
  - `PATCH /api/v1/admin/students/:id`          → 200  (UC13 Update)
  - `PATCH /api/v1/admin/students/:id/lock`     → 200  (UC11 Lock)
  - `PATCH /api/v1/admin/students/:id/unlock`   → 200  (UC11 Unlock)
  - `GET   /api/v1/admin/stats`                 → 200  (dashboard mini — counts)
  - `GET   /api/v1/admin/dashboard/statistics`  → 200  (UC14 — full chart/stat, delegate `AnalyticsService`)
  - `POST  /api/v1/admin/execute`               → 200  (code execution — KHÔNG thuộc scope DEV1, do `CodeExecutionService` xử lý)
- **Services:** `services/admin.service.ts` (static class). Methods dùng cho route: `ensureActiveAdmin`, `createStudent`, `listStudents`, `updateStudent`, `lockStudent`, `unlockStudent`. Methods **không gắn route DEV1 nào** (tồn tại sẵn, cẩn thận khi cleanup): `listUsers`, `updateUserRole`, `toggleCoursePublish`, `deleteUser`. Private: `getStudentOrThrow`, `generateTemporaryPassword`, `escapeRegex`, `toSafeStudent`.
- **Validators:** `validators/admin.validator.ts` — `objectIdParamSchema`, `createStudentSchema`, `listStudentsQuerySchema`, `updateStudentSchema`, `lockStudentSchema`, `dashboardStatisticsQuerySchema`.
- **Student management behavior:**
  - `createStudent`: nếu không truyền `password` → tự sinh temp password (`crypto.randomBytes(12).base64url`), hash bcrypt(10), tạo user `isVerified:true/isActive:true`, tạo `UserStats`, gửi `EmailService.sendStudentInvitationEmail` (chỉ khi sinh tự động).
  - `lockStudent`: `isActive=false`, `lockedAt=now`, `lockedReason`.
  - `unlockStudent`: `isActive=true`, `lockedAt=undefined`, `lockedReason=undefined`.
  - `listStudents`: filter `role:'STUDENT'` + isActive/isVerified + search regex (đã `escapeRegex`), phân trang, trả `{ items: SafeUser[], meta }`.
  - Response student = `sanitizeUser` (SafeUser).
- **Dashboard statistics behavior:** xem mục Dashboard bên dưới.
- **Mongoose/model imports:**
  - `admin.controller.ts` import trực tiếp `User`, `Course`, `Enrollment`, `QuizAttempt` và **chạy `.countDocuments()` ngay trong controller** (route `/stats`) ⇒ **controller đụng DB trực tiếp** (vi phạm tầng).
  - `admin.service.ts` import `User`, `Course` (toggleCoursePublish), `UserStats`, `EmailService`, `sanitizeUser`.
- **Refactor risks:** `/stats` (controller query DB) + `createStudent` (hash password + cross-module UserStats + email) là điểm nóng. `AdminService` ôm cả method ngoài scope student (role/course/delete) — đừng kéo theo khi tách.

### Dashboard / Analytics

- **Implement ở đâu:** Route `GET /api/v1/admin/dashboard/statistics` nằm trên **AdminController**, nhưng logic ở `src/modules/analytics/services/analytics.service.ts` (static `getAdminDashboardStatistics`). `AnalyticsController` (`v1/analytics`) **rỗng — không có route nào**.
- **Exact endpoint path:** `GET /api/v1/admin/dashboard/statistics` (+ `GET /api/v1/admin/stats` cho counts gọn).
- **Service/repository/model usage:** `analytics.service.ts` import **7 model trực tiếp**: `User`, `AIHistory`, `Course`, `Enrollment`, `Lesson`, `Notification`, `QuizAttempt`. Chạy nhiều `countDocuments` + **`aggregate`** (monthly group, quiz stats). **Aggregation nằm trong service** (chưa có repository tách).
- **Response shape (FE chart/stat) — phải giữ nguyên:**
  ```txt
  {
    summary: { totalUsers, totalStudents, totalAdmins, activeStudents, lockedStudents,
               verifiedUsers, unverifiedUsers, newUsersThisMonth, totalCourses, totalLessons,
               totalEnrollments, totalQuizAttempts, totalAiRequests, totalNotifications,
               averageQuizScore, quizPassRate, activeUsersThisMonth },
    charts:  { newUsersByMonth[], enrollmentsByMonth[], quizAttemptsByMonth[],
               coursesCreatedByMonth[], lessonsCreatedByMonth[] }   // mỗi item: { month: 'YYYY-MM', count }
  }
  ```
  `/admin/stats` → `{ totalUsers, totalCourses, totalEnrollments, totalQuizAttempts }`.
- **Refactor risks:** đụng model của 6 module khác (cross-module nặng). Khi refactor phải đọc qua port/được-export hoặc giữ aggregation trong infrastructure repository riêng; **giữ nguyên field names + format `YYYY-MM`** cho FE chart.

### Shared Code

- **JwtAuthGuard** (`src/common/guards/jwt-auth.guard.ts`): verify Bearer access token + check `@Roles`. Dùng ở **21 file** controller, gồm DEV1: `auth` (route session), `users` (class), `admin` (class). ✅ reuse đúng.
- **Roles** (`src/common/decorators/roles.decorator.ts`): `ROLES_KEY`, type `UserRole='STUDENT'|'ADMIN'`. DEV1 dùng ở `admin.controller` (`@Roles('ADMIN')` class-level). ✅
- **CurrentUser** (`src/common/decorators/current-user.decorator.ts`): trả `request.user`. DEV1 dùng ở `auth`, `users`, `admin` (18 file tổng). ✅
- **ApiResponse** (`src/common/api-response.ts`): `success({message,data,meta,statusCode})` / `error(...)`. ⚠️ `statusCode` **bị bỏ qua** (chỉ alias `_statusCode`) — HTTP status thật do `@HttpCode`/default Nest quyết; `statusCode` không xuất hiện trong body. DEV1 dùng ở cả 3. ✅
- **AuthenticatedUser** (`src/common/api-handler.ts`): `{ id, email, role }` (KHÔNG có firstName/lastName). Dùng ở 3 controller DEV1. ✅ dùng được — không cần tạo type mới.
- **src/utils/index.ts:** có sẵn `hashPassword`, `comparePasswords`, `signAccessToken`, `signRefreshToken`, `verifyAccessToken`, `verifyRefreshToken`, `generateRandomToken`, `parsePagination`.
  ⚠️ **DEV1 hiện KHÔNG dùng bất kỳ helper nào ở đây.** Chỉ `src/database/seed.ts` import `hashPassword`. `auth.service.ts` tự gọi `bcrypt`/`jwt`/`crypto` inline ⇒ logic JWT/bcrypt/token đang **trùng lặp ý tưởng** với utils (không phải duplicate class, nhưng reimplement). Khi refactor: **infrastructure adapter** nên wrap các helper này (theo PLAN §4). Lưu ý: `signAccessToken` nhận type `JWTPayload` (từ `src/types`) — cần xác minh `JWTPayload` khớp payload `{id,email,role}` mà auth đang ký.
- **Duplicate code found:** **KHÔNG** có duplicate của `JwtAuthGuard`/`Roles`/`CurrentUser`/`ApiResponse`/`AuthenticatedUser` (grep toàn `src` chỉ ra đúng 1 định nghĩa mỗi loại). ✅

---

## API Compatibility Baseline (toàn bộ DEV1 endpoints — GIỮ NGUYÊN)

| Method | Path (thật, có prefix `api`) | UC | Guard | Status |
| ------ | ---------------------------- | -- | ----- | ------ |
| POST  | `/api/v1/auth/register`             | UC01 | — | 201 |
| GET   | `/api/v1/auth/google`               | UC02/05 | — | 302 |
| GET   | `/api/v1/auth/google/callback`      | UC05 | — | 302 |
| POST  | `/api/v1/auth/verify-email`         | UC03 | — | 200 |
| POST  | `/api/v1/auth/resend-verification`  | UC03 | — | 200 |
| POST  | `/api/v1/auth/login`                | UC04 | — | 200 |
| POST  | `/api/v1/auth/logout`               | UC06 | — | 200 |
| POST  | `/api/v1/auth/forgot-password`      | UC07 | — | 200 |
| POST  | `/api/v1/auth/reset-password`       | UC08 | — | 200 |
| POST  | `/api/v1/auth/refresh`              | — | — | 200 |
| GET   | `/api/v1/auth/session`              | — | Jwt | 200 |
| GET   | `/api/v1/users/profile`             | UC09 | Jwt | 200 |
| PATCH | `/api/v1/users/profile`             | UC09 | Jwt | 200 |
| POST  | `/api/v1/users/avatar`              | UC09 | Jwt | 200 |
| POST  | `/api/v1/admin/students`            | UC10 | Jwt+ADMIN | 201 |
| GET   | `/api/v1/admin/students`            | UC12 | Jwt+ADMIN | 200 |
| PATCH | `/api/v1/admin/students/:id`        | UC13 | Jwt+ADMIN | 200 |
| PATCH | `/api/v1/admin/students/:id/lock`   | UC11 | Jwt+ADMIN | 200 |
| PATCH | `/api/v1/admin/students/:id/unlock` | UC11 | Jwt+ADMIN | 200 |
| GET   | `/api/v1/admin/stats`               | UC14 | Jwt+ADMIN | 200 |
| GET   | `/api/v1/admin/dashboard/statistics`| UC14 | Jwt+ADMIN | 200 |
| POST  | `/api/v1/admin/execute`             | (ngoài DEV1) | Jwt+ADMIN | 200 |

> `AnalyticsController` (`/api/v1/analytics`) hiện **không có route** — không có gì để bảo toàn ở đó.

---

## Security Baseline (GIỮ NGUYÊN khi refactor)

- **Password hashing:** bcrypt `hash(password, 10)` ở `register`, `resetPassword`, `admin.createStudent`. Không lưu raw password.
- **Login anti-enumeration timing:** khi user không tồn tại / không có `passwordHash` → chạy `bcrypt.compare` với hash giả để cân bằng thời gian, rồi báo lỗi chung "Invalid email or password".
- **Account lockout:** `MAX_LOGIN_ATTEMPTS=5`, khoá `LOGIN_LOCKOUT_MS=15 phút`; dùng `failedLoginAttempts` + `lockedUntil`; reset khi login thành công.
- **Verify gate:** login từ chối user `isVerified=false` (ForbiddenError). `assertUserCanAuthenticate` từ chối `isActive===false` hoặc `lockedAt` được set.
- **Refresh token:** lưu **raw token** (field `token`, unique). **Reuse detection:** token verify chữ ký nhưng không có trong store ⇒ `deleteMany({userId})` revoke toàn bộ session. **Rotation:** xoá token cũ → tạo token mới mỗi lần refresh. TTL index tự xoá khi `expiresAt`.
- **Email verification / password reset token:** chỉ lưu **sha256 `tokenHash`**; raw token chỉ đi trong link email; có `usedAt` (one-time) + `expiresAt` (verify 24h, reset 1h).
- **Reset password:** sau khi đổi mật khẩu → `RefreshToken.deleteMany({userId})` (đăng xuất mọi nơi).
- **Forgot password:** luôn trả message trung lập kể cả khi email không tồn tại / user inactive (anti-enumeration).
- **Google OAuth:** từ chối `email_verified===false`; nếu `googleId` đã tồn tại và khác `sub` ⇒ chặn ("linked to a different Google account"); user Google đánh dấu `isVerified:true` + `emailVerifiedAt`.
- **SMTP:** `hasSmtpConfig` gate (thiếu config → log mock, không gửi); `dispatch` fire-and-forget + retry backoff 3 lần; **không log `SMTP_PASS`**. Verify link = `FRONTEND_URL.replace(/\/$/,'') + '/verify-email?token=' + encodeURIComponent(token)`. Reset link = `PASSWORD_RESET_URL + '?token=' + encodeURIComponent(token)`.
- **Không expose:** `passwordHash`, `tokenHash`, `googleId`/`githubId`, raw reset/verification token, document refresh token, secret/env. (`sanitizeUser` chỉ whitelist field an toàn.)

---

## Proposed Migration Order (đề xuất — KHÔNG implement ở lượt này)

Dựa trên code thật, thứ tự an toàn (đúng tinh thần REFACTOR_PLAN_DEV1.md §9, ưu tiên `auth` trước vì rủi ro & độ phụ thuộc cao nhất):

1. **DEV1.1 — Auth ports/interfaces** (`domain/interfaces`): `UserRepositoryPort`, `RefreshTokenRepositoryPort`, `EmailVerificationTokenRepositoryPort`, `PasswordResetTokenRepositoryPort`, `PasswordHasherPort`, `TokenServicePort`, `EmailSenderPort`, `GoogleOAuthPort` (+ Symbol token). Định nghĩa entity `User`/token domain thuần. Build xanh, chưa đổi route.
2. **DEV1.2 — Auth infrastructure adapters:** `Mongo*Repository` (nơi DUY NHẤT import 4 model), `BcryptPasswordHasherService`, `JwtTokenService`, `SmtpEmailSenderService` (wrap `email.service.ts` hiện tại), `GoogleOAuthService` (wrap `exchangeGoogleCode`/`getGoogleUserInfo`). `src/utils/index.ts` chỉ import tại adapter. **Giữ raw-token storage + SMTP behavior + link format.**
3. **DEV1.3 — Auth use cases:** tách 563 dòng → 10 service 1-method (`RegisterUserService` … `GetSessionService`). Chuyển tạo `UserStats` thành **event handler** (`user.registered`) thay vì gọi model gamification trực tiếp. Controller wiring → inject service, giữ path + shape (đặc biệt giữ y nguyên login response thủ công).
4. **DEV1.4 — Users profile/avatar:** repo + `AvatarStoragePort`/`AvatarStorageService` (đẩy `Express.Multer.File` + `saveUploadedFile` về infra). Giữ response `{ user, stats }`.
5. **DEV1.5 — Admin students:** entity `AdminStudent` (lock/unlock là method domain), `CreateStudentService` hash qua `PasswordHasherPort`. Đưa `/admin/stats` ra khỏi controller (controller không query DB nữa).
6. **DEV1.6 — Dashboard statistics:** `ViewDashboardStatisticsService` + `DashboardStatisticsRepositoryPort`; chuyển aggregation 7-model vào infrastructure repository; presenter giữ shape `summary/charts`.
7. **DEV1.7 — Cleanup + docs:** `@deprecated` service cũ khi route đã chuyển; cập nhật Swagger/`uc_audit.md`/`CLEAN_ARCHITECTURE_MIGRATION.md`. Không xoá field legacy khi FE còn dùng.

---

## Test Results

- `npm run build`: ✅ PASS (`nest build`, không lỗi).
- `npm run lint`: ✅ 0 error, **7 warning** — **tất cả ngoài scope DEV1** (existing issues):
  - `modules/lessons/presentation/response/lesson.presenter.ts` (2 × no-unused-vars `_c`, `_c2`)
  - `modules/quiz-attempts/application/event-handlers/gamification.event-handler.ts` (2 × no-console)
  - `modules/quiz/application/services/quiz.facade.ts` (3 × no-unused-vars `Inject`, `QUIZ_REPOSITORY`, `IQuizRepository`)
- `npm test`: ✅ PASS — 1 suite, **13/13** (`src/modules/bugfix-regression.spec.ts`). **Không có test riêng cho DEV1** (suite hiện tại cover DEV2/DEV3/DEV4).

---

## Known Issues / Caveats (tìm thấy — KHÔNG sửa ở lượt này)

1. **`auth.service.ts` God service (~563 dòng):** ôm toàn bộ nghiệp vụ auth + bcrypt/jwt/crypto/fetch inline. File rủi ro #1.
2. **Login response không nhất quán:** `login` trả object user thủ công (id=ObjectId, thiếu `avatarUrl/isVerified/isActive`), trong khi google/session/verify dùng `sanitizeUser`. **Phải bảo toàn đúng sự khác biệt này** để không vỡ FE.
3. **Controller đụng DB:** `admin.controller.ts` `/stats` gọi `countDocuments` trực tiếp trên 4 model.
4. **Coupling chéo module:** `UserStats` (gamification) được tạo/đọc trực tiếp trong `auth.service`, `admin.service`, `users.service`; `analytics.service` đọc 7 model của nhiều module. `admin`/`users` service reuse `auth/models/user.model` + `auth/utils/user-sanitizer`.
5. **`src/utils` JWT/bcrypt/token helper hầu như không được DEV1 dùng** (chỉ `seed.ts`) — reimplement inline. Cần xác minh `JWTPayload` (src/types) khớp payload `{id,email,role}` trước khi wrap.
6. **`AdminService` còn method ngoài scope** (`updateUserRole`, `toggleCoursePublish`, `deleteUser`, `listUsers`) chưa gắn route DEV1 — cẩn thận khi cleanup (có thể được dùng nơi khác hoặc dead code).
7. **Reset link dùng `process.env.PASSWORD_RESET_URL`** (default `http://localhost:3000/reset-password`) — **không** đi qua `env` config object như verify link (`env.FRONTEND_URL`). Khác mô tả ở REFACTOR_PLAN §7. Giữ nguyên hành vi hiện tại khi refactor.
8. **`ApiResponse.success({statusCode})` bị bỏ qua** — status thật do `@HttpCode`. Đừng giả định `statusCode` nằm trong body.
9. **Path thật là `/api/v1/...`** (global prefix `api`), khác với path rút gọn trong REFACTOR_PLAN §6.
10. **`AnalyticsController` rỗng** — dashboard thực ra phục vụ qua `AdminController`.

---

## Next Recommended Task

**Phase DEV1.2 — Auth Infrastructure Adapters** (đã xong DEV1.1 skeleton + ports). Tạo các adapter hiện thực port:
- `MongoUserRepository`, `MongoRefreshTokenRepository`, `MongoEmailVerificationTokenRepository`, `MongoPasswordResetTokenRepository` (+ mapper doc↔entity) — nơi DUY NHẤT import 4 model auth.
- `BcryptPasswordHasherService`, `JwtTokenService`, `SmtpEmailSenderService` (wrap `email.service.ts`), `GoogleOAuthService` (wrap `exchangeGoogleCode`/`getGoogleUserInfo`).
- `src/utils/index.ts` chỉ import tại adapter. Giữ **raw refresh-token storage** + **SMTP behavior/link format** + **login response thủ công**.
- Trước khi implement `JwtTokenService`: xác minh `JWTPayload` (`src/types`) khớp `TokenPayload {id,email,role}` của `token-service.port.ts`.

---

## DEV1.1 Auth Skeleton + Ports

- **Date/time:** 2026-06-23
- **Branch:** `refactor/dev1-clean-architecture`

### Files created (25 mới — chỉ thêm, không sửa/không xoá file chạy thật)

Domain (17 file `.ts`):
- `src/modules/auth/domain/entities/user.entity.ts`
- `src/modules/auth/domain/entities/refresh-token.entity.ts`
- `src/modules/auth/domain/entities/email-verification-token.entity.ts`
- `src/modules/auth/domain/entities/password-reset-token.entity.ts`
- `src/modules/auth/domain/entities/index.ts` (barrel)
- `src/modules/auth/domain/value-objects/user-role.vo.ts`
- `src/modules/auth/domain/value-objects/email.vo.ts`
- `src/modules/auth/domain/value-objects/index.ts` (barrel)
- `src/modules/auth/domain/events/user-registered.event.ts`
- `src/modules/auth/domain/events/email-verified.event.ts`
- `src/modules/auth/domain/events/password-reset-requested.event.ts`
- `src/modules/auth/domain/events/index.ts` (barrel)
- `src/modules/auth/domain/interfaces/user.repository.ts`
- `src/modules/auth/domain/interfaces/refresh-token.repository.ts`
- `src/modules/auth/domain/interfaces/email-verification-token.repository.ts`
- `src/modules/auth/domain/interfaces/password-reset-token.repository.ts`
- `src/modules/auth/domain/interfaces/password-hasher.port.ts`
- `src/modules/auth/domain/interfaces/token-service.port.ts`
- `src/modules/auth/domain/interfaces/email-sender.port.ts`
- `src/modules/auth/domain/interfaces/google-oauth.port.ts`
- `src/modules/auth/domain/interfaces/index.ts` (barrel)

Khung thư mục rỗng (placeholder `.gitkeep`, chưa có logic): `application/{dto,services,events}`, `infrastructure/{persistence,mapper,services}`, `presentation/{controller,validators,response}`.

Docs: `docs/CLAUDE_PROGRESS.md` (file này), `docs/CLEAN_ARCHITECTURE_MIGRATION.md`.

### Entities created

- `UserEntity` (+ `UserProps`): private ctor; `fromPersistence`/`createNew`/`toProps`; getter `id/email/role/isVerified/isActive`; method `markEmailVerified` / `lock(reason?)` / `unlock` / `deactivate` / `activate`. `passwordHash` giữ trong props (internal), KHÔNG có presenter ở phase này. Behavior lock/unlock/verify mirror đúng `admin.service`/`auth.service` hiện tại.
- `RefreshTokenEntity`: props có `token` (raw — behavior hiện tại) + `tokenHash?` (reserved migration, chưa dùng); method `isExpired`/`isRevoked`/`revoke`/`toProps`.
- `EmailVerificationTokenEntity`: lưu `tokenHash`; method `isExpired`/`isUsed`/`markUsed`/`toProps`.
- `PasswordResetTokenEntity`: lưu `tokenHash`; method `isExpired`/`isUsed`/`markUsed`/`toProps`.
- Value-objects: `UserRole` (`'STUDENT'|'ADMIN'` mirror union trung tâm, không import @nestjs) + `Email` (validate/normalize, không class-validator).
- Events: `UserRegisteredEvent`, `EmailVerifiedEvent`, `PasswordResetRequestedEvent` (chỉ `userId`/`email`/`occurredAt` — KHÔNG mang raw token).

### Ports created (interface + Symbol token)

- `IUserRepository` / `USER_REPOSITORY` (`findById`, `findByEmail`, `findByGoogleId`, `create`, `update`, `updateLastLogin`).
- `IRefreshTokenRepository` / `REFRESH_TOKEN_REPOSITORY` (`findByToken`, `findByTokenHash`, `create`, `deleteByToken`, `deleteByTokenHash`, `deleteByUserId`). Giữ `findByToken` cho raw-token hiện tại.
- `IEmailVerificationTokenRepository` / `EMAIL_VERIFICATION_TOKEN_REPOSITORY`.
- `IPasswordResetTokenRepository` / `PASSWORD_RESET_TOKEN_REPOSITORY`.
- `IPasswordHasher` / `PASSWORD_HASHER`.
- `ITokenService` / `TOKEN_SERVICE` (+ type `TokenPayload`). KHÔNG implement JWT/không import jsonwebtoken/utils.
- `IEmailSender` / `EMAIL_SENDER`.
- `IGoogleOAuth` / `GOOGLE_OAUTH` (tối thiểu, chưa wire).

### What was intentionally NOT changed

- KHÔNG sửa/xoá `auth.controller.ts`, `auth.service.ts`, `email.service.ts`, `user-sanitizer.ts`, 4 model, validator, `AuthModule` provider, Swagger.
- KHÔNG tạo adapter infrastructure thật (Mongo repo / Bcrypt / Jwt / Smtp / Google) — để DEV1.2.
- KHÔNG đổi route, response shape, refresh-token storage (vẫn raw), login response thủ công, Google OAuth flow, SMTP behavior, reset-link behavior.
- KHÔNG sửa `.env`. KHÔNG commit tự động.

### API compatibility

- Không thêm/sửa/xoá route nào. Toàn bộ endpoint `/api/v1/auth/*` (và users/admin/dashboard) giữ nguyên. Skeleton chưa được nối vào runtime (không nằm trong DI graph nào đang chạy).

### Security compatibility

- Entity token (email-verify / reset) chỉ giữ `tokenHash`; refresh giữ `token` raw đúng hiện trạng. Events KHÔNG chứa raw token. Không file mới nào log token/password/secret. `UserEntity` không có presenter ⇒ không có rủi ro lộ `passwordHash` ở phase này.

### Shared code reuse

- KHÔNG tạo lại `JwtAuthGuard`/`Roles`/`CurrentUser`/`ApiResponse`/`AuthenticatedUser`/helper. `UserRole` domain là union mirror (không import decorator để giữ domain thuần) — source-of-truth HTTP vẫn là `roles.decorator.ts`. `src/utils/index.ts` sẽ chỉ được wrap ở adapter (DEV1.2), domain/ports KHÔNG import.

### Build result

- `npm run build` (`nest build`): ✅ PASS (0 lỗi).

### Lint result

- `npm run lint`: ✅ 0 error, **7 warning** — tất cả pre-existing, ngoài scope DEV1 (lessons presenter ×2, quiz-attempts gamification handler ×2, quiz.facade ×3). KHÔNG có warning ở file mới tạo.

### Test result

- `npm test`: ✅ 13/13 pass (`bugfix-regression.spec.ts`). Chưa có test riêng cho skeleton DEV1.

### Self-check result

- `auth/domain`: ✅ KHÔNG có import cấm. Mọi match grep `mongoose|@nestjs|.model|.schema|src/utils` đều nằm trong **comment/prose** mô tả luật, không phải import. Import thật chỉ là domain-internal (entity ↔ vo ↔ interface).
- `auth/application`: ✅ chưa có `.ts` (chỉ `.gitkeep`) ⇒ không vi phạm.

### Known issues / caveats

1. `UserProps` skeleton chỉ khai báo tập field tối thiểu cho luồng auth; model thật còn `planType`, `subscriptionExpiresAt`, `googleId`, `githubId`, `failedLoginAttempts`, `lockedUntil` — sẽ bổ sung khi viết mapper (DEV1.2).
2. Domain validation hiện ném `Error` thuần (chưa có `ErrorCode` AUTH_* trong `shared/errors`). Có thể thêm mã AUTH khi wire use-case (DEV1.3) nếu cần `code` ổn định cho FE.
3. `IGoogleOAuth` mới ở mức tối thiểu (method optional) — shape input/output chốt khi đưa flow Google ra adapter.
4. `ITokenService.TokenPayload` cần đối chiếu `JWTPayload` (`src/types`) trước khi implement `JwtTokenService` (DEV1.2).
5. Thư mục rỗng giữ bằng `.gitkeep`; sẽ thay bằng file thật ở các phase sau.

### Next recommended task

- **DEV1.2 — Auth Infrastructure Adapters** (Mongo repos + mapper + Bcrypt/Jwt/Smtp/Google adapter). → **ĐÃ XONG**, xem section dưới.

---

## DEV1.2 Auth Infrastructure Adapters

- **Date/time:** 2026-06-23
- **Branch:** `refactor/dev1-clean-architecture`

### Files created (15 file `.ts` mới) + 3 `.gitkeep` xoá

Chỉ thêm trong `src/modules/auth/infrastructure/**` (không đụng runtime). Đã xoá 3 placeholder `.gitkeep` ở `mapper/`, `persistence/`, `services/` vì đã có file thật thay thế (nằm trong scope `infrastructure/**`).

- `infrastructure/mapper/user.mapper.ts`
- `infrastructure/mapper/refresh-token.mapper.ts`
- `infrastructure/mapper/email-verification-token.mapper.ts`
- `infrastructure/mapper/password-reset-token.mapper.ts`
- `infrastructure/mapper/index.ts` (barrel)
- `infrastructure/persistence/mongo-user.repository.ts`
- `infrastructure/persistence/mongo-refresh-token.repository.ts`
- `infrastructure/persistence/mongo-email-verification-token.repository.ts`
- `infrastructure/persistence/mongo-password-reset-token.repository.ts`
- `infrastructure/persistence/index.ts` (barrel)
- `infrastructure/services/bcrypt-password-hasher.service.ts`
- `infrastructure/services/jwt-token.service.ts`
- `infrastructure/services/smtp-email-sender.service.ts`
- `infrastructure/services/google-oauth.service.ts`
- `infrastructure/services/index.ts` (barrel)

Docs: `docs/CLAUDE_PROGRESS.md` (file này), `docs/CLEAN_ARCHITECTURE_MIGRATION.md`.

### Mappers created

- `UserMapper` (doc↔`UserEntity`): `toPersistence` LOẠI BỎ field `undefined` ⇒ KHÔNG ghi đè/xoá field legacy (`googleId`, `planType`, `subscriptionExpiresAt`, `githubId`, `failedLoginAttempts`, `lockedUntil`) mà skeleton chưa quản lý; không set `_id`/timestamps. `passwordHash` map vào props (persistence), không phải presenter.
- `RefreshTokenMapper`: giữ raw `token`; `tokenHash` chỉ map khi có; `revokedAt` không persist (model dùng delete để revoke).
- `EmailVerificationTokenMapper` / `PasswordResetTokenMapper`: token `tokenHash`; preserve `userId`/`expiresAt`/`usedAt`/timestamps.

### Repositories created (đều `@Injectable`, trả Entity/null, KHÔNG trả doc thô)

- `MongoUserRepository` (`findById`/`findByEmail`/`findByGoogleId`/`create`/`update`/`updateLastLogin`).
- `MongoRefreshTokenRepository` (`findByToken`/`findByTokenHash`/`create`/`deleteByToken`/`deleteByTokenHash`/`deleteByUserId`) — giữ raw-token behavior.
- `MongoEmailVerificationTokenRepository` & `MongoPasswordResetTokenRepository` (`findByTokenHash`/`create`/`update`/`invalidateUnusedByUserId`) — `invalidateUnusedByUserId` mirror đúng `resendVerification`/`forgotPassword` (`updateMany {usedAt}` cho token chưa dùng).

### Infrastructure services created

- `BcryptPasswordHasherService` → wrap `hashPassword`/`comparePasswords` (`src/utils`), giữ bcrypt rounds 10.
- `JwtTokenService` → wrap `signAccessToken`/`signRefreshToken`/`verifyAccessToken`/`verifyRefreshToken` (`src/utils`); `TokenPayload{role:string}` map sang `JWTPayload{role:'STUDENT'|'ADMIN'}`. `generateRandomToken` = `crypto.randomBytes(32).hex` + `hashToken` = sha256 (giữ ĐÚNG semantics raw-token hiện tại; KHÔNG dùng `utils.generateRandomToken` vì format khác).
- `SmtpEmailSenderService` → **wrap `EmailService` hiện tại** (giữ mock/retry/backoff, KHÔNG log SMTP_PASS); dựng link y hệt AuthService (verify dùng `env.FRONTEND_URL`, reset dùng `process.env.PASSWORD_RESET_URL`).
- `GoogleOAuthService` → `buildAuthUrl()` (env→URL, mirror `getGoogleAuthorizationUrl`) + `verifyCallback(code)` (exchange→userinfo, trả profile thô, KHÔNG tạo/link user, KHÔNG đụng DB). Không thêm dependency mới (dùng global `fetch`).

### Shared utils reused

- `src/utils/index.ts`: `hashPassword`, `comparePasswords`, `signAccessToken`, `signRefreshToken`, `verifyAccessToken`, `verifyRefreshToken` — chỉ import ở **infrastructure adapter** (đúng layer rule). `crypto` (random/sha256) dùng tại adapter. KHÔNG tạo lại guard/decorator/ApiResponse/type.

### What was intentionally NOT changed

- KHÔNG sửa: `auth.controller.ts`, `auth.service.ts`, `email.service.ts`, `user-sanitizer.ts`, 4 model, validator, `auth.module.ts` (đã xác minh `git status`), Swagger.
- KHÔNG wire adapter vào AuthModule/runtime (adapter chỉ được tham chiếu qua barrel `infrastructure/**`, không nằm trong DI graph đang chạy).
- KHÔNG đổi route, response shape, refresh-token storage (vẫn raw), login response thủ công, Google OAuth flow runtime, SMTP behavior, reset-link behavior. KHÔNG sửa `.env`. KHÔNG commit tự động.

### API compatibility

- Không thêm/sửa/xoá route. Toàn bộ endpoint giữ nguyên. Adapter chưa nối runtime ⇒ behavior thật do AuthController/AuthService cũ quyết định, không đổi.

### Security compatibility

- Không file mới nào log token/password/secret/SMTP_PASS. `JwtTokenService.hashToken` = sha256 đúng như hiện tại; `generateRandomToken` giữ entropy `randomBytes(32)`. Repo/mapper không format response, không lộ `passwordHash`/`tokenHash`. `SmtpEmailSenderService` chỉ nhúng raw token vào link email (đúng flow hiện tại), không log token.

### Build result

- `npm run build` (`nest build`): ✅ PASS (0 lỗi).

### Lint result

- `npm run lint`: ✅ 0 error, **7 warning** — tất cả pre-existing, ngoài scope DEV1, KHÔNG có warning ở file mới.

### Test result

- `npm test`: ✅ 13/13 pass.

### Self-check result

- `auth/domain`: ✅ không có import cấm (mongoose/@nestjs/model/schema/utils) — chỉ domain-internal.
- `auth/application`: ✅ chưa có `.ts` (chỉ `.gitkeep`) ⇒ không vi phạm.
- `auth/infrastructure`: ✅ KHÔNG import guard/decorator/ApiResponse/api-handler (đúng — đó là presentation concern). Có import `@nestjs/common` (`@Injectable`) + model + `src/utils` đúng layer rule infrastructure.

### Known issues / caveats

1. **Adapter chưa wire runtime** — AuthModule chưa khai báo `{ provide: TOKEN, useExisting: MongoXRepository }`; wiring + tách use-case là DEV1.3.
2. **Clear-field qua `update`**: `UserMapper.toPersistence` bỏ field `undefined` ⇒ `unlock()` (đặt `lockedAt/lockedReason = undefined`) sẽ KHÔNG `$unset` field cũ qua `findByIdAndUpdate`. Khi wire use-case (DEV1.3) cần `$unset` rõ ràng nếu muốn xoá hẳn — hiện behavior thật vẫn do `admin.service`/`auth.service` cũ (dùng mongoose doc `.save()`), chưa đổi.
3. **RefreshToken `*ByTokenHash`**: model hiện chưa có field `tokenHash` ⇒ các query/delete theo `tokenHash` chưa khớp doc nào. Giữ để chuẩn bị migration; runtime vẫn dùng `findByToken`/`deleteByToken` (raw).
4. **`GoogleOAuthService.verifyCallback`** chỉ trả profile thô — logic tạo/link user (kiểm `googleId`, set `isVerified`, tạo `UserStats`…) vẫn ở AuthService và sẽ chuyển vào use-case DEV1.3.
5. **`update()` dùng `doc!`** (non-null assertion theo chuẩn `course`): nếu id không tồn tại sẽ ném runtime khi map — use-case nên đảm bảo entity tồn tại trước khi gọi `update`.

### Next recommended task

- **DEV1.3 — Auth Use Cases:** tách `auth.service.ts` (~563 dòng) thành 10 service 1-method (`RegisterUserService`…`GetSessionService`), inject port qua Symbol token + adapter DEV1.2; wire AuthModule provider (`useExisting`); chuyển tạo `UserStats` thành event handler (`user.registered`). **Giữ y nguyên** path + response shape (đặc biệt login response thủ công), raw refresh-token storage, reset-link behavior, SMTP behavior.
