# ThreadLearn BE DEV1 Clean Architecture Progress

## Last Updated

- Date/time: 2026-06-25
- Branch: `refactor/dev1-clean-architecture`
- Module: DEV1 / `auth`
- Task: **DEV1.4A AuthModule Provider Wiring Only** (đăng ký 4 repo adapter + 4 service adapter + 8 port token mapping + 10 use-case provider trong `auth.module.ts`; CHƯA chuyển controller; KHÔNG đổi runtime). Xem section cuối file. (Trước đó: DEV1.1 Skeleton, DEV1.2 Adapters, DEV1.3A Register/Login, DEV1.3B Verify/Resend/Forgot/Reset, DEV1.3C Refresh/Logout/Session, DEV1.3D Google Login.)

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

- **DEV1.3 — Auth Use Cases:** tách `auth.service.ts` (~563 dòng) thành 10 service 1-method (`RegisterUserService`…`GetSessionService`), inject port qua Symbol token + adapter DEV1.2; wire AuthModule provider (`useExisting`); chuyển tạo `UserStats` thành event handler (`user.registered`). **Giữ y nguyên** path + response shape (đặc biệt login response thủ công), raw refresh-token storage, reset-link behavior, SMTP behavior. → **Bắt đầu bằng DEV1.3A (Register/Login), xem dưới.**

---

## DEV1.3A Auth Application Use Cases — Register/Login

- **Date/time:** 2026-06-23
- **Branch:** `refactor/dev1-clean-architecture`

### Files created (5 file `.ts`) + 2 `.gitkeep` xoá

Chỉ trong `src/modules/auth/application/**` (không đụng runtime). Xoá placeholder `.gitkeep` ở `dto/` và `services/` (đã có file thật); `application/events/` vẫn giữ `.gitkeep`.

- `application/dto/auth-use-case.dto.ts`
- `application/dto/index.ts` (barrel)
- `application/services/register-user.service.ts`
- `application/services/login-user.service.ts`
- `application/services/index.ts` (barrel)

Docs: `docs/CLAUDE_PROGRESS.md` (file này), `docs/CLEAN_ARCHITECTURE_MIGRATION.md`.

### DTO/result types created

- `SafeAuthUser` (mirror `SafeUser` của `user-sanitizer` — whitelist field an toàn, không passwordHash/tokenHash/googleId).
- `RegisterUserInput {email,password,firstName,lastName}` (firstName/lastName **required** theo `registerSchema`).
- `RegisterUserResult {user: SafeAuthUser, verificationRequired: true, message}` — **không token** (cần verify email trước).
- `LoginUserInput {email,password,userAgent?,ipAddress?}` (userAgent/ipAddress chưa dùng, chuẩn bị audit session sau).
- `LoginManualUser {id,email,firstName,lastName,role}` — giữ ĐÚNG shape thủ công của login (KHÔNG avatarUrl/isVerified/isActive).
- `LoginUserResult {user: LoginManualUser, accessToken, refreshToken}`.

### Use cases created

- `RegisterUserService.execute(RegisterUserInput): RegisterUserResult` — `@Injectable`, 1 method.
- `LoginUserService.execute(LoginUserInput): LoginUserResult` — `@Injectable`, 1 method.

### Ports used (inject qua Symbol token)

- Register: `USER_REPOSITORY`, `PASSWORD_HASHER`, `TOKEN_SERVICE`, `EMAIL_VERIFICATION_TOKEN_REPOSITORY`, `EMAIL_SENDER`.
- Login: `USER_REPOSITORY`, `PASSWORD_HASHER`, `TOKEN_SERVICE`, `REFRESH_TOKEN_REPOSITORY`.
- Lỗi nghiệp vụ dùng `BadRequestError`/`ForbiddenError` (`src/common/custom-error`) để giữ ĐÚNG status+message hiện tại.

### Current behavior mirrored

- **Register:** check trùng email (`findByEmail`) → `BadRequestError('Email address is already in use.')`; hash password (bcrypt 10 qua port); tạo user `isVerified:false`/`isActive:true`; sinh raw token + lưu **hash** (TTL 24h); gửi verification email qua port; trả `{ user: sanitizeUser-equivalent, verificationRequired:true, message:'Please verify your email before logging in.' }`.
- **Login:** `findByEmail`; nếu không có user/passwordHash → chạy **dummy bcrypt compare** (chống enumeration) rồi `BadRequestError('Invalid email or password credentials.')`; sai password → cùng lỗi; chặn inactive (`'User account is inactive.'`)/locked (`'User account is locked.'`); chặn chưa verify (`ForbiddenError('Please verify your email before logging in.')`); ký access+refresh `{id,email,role}`; lưu refresh token **raw** (TTL 7 ngày); `updateLastLogin`; trả response thủ công `{ user:{id,email,firstName,lastName,role}, accessToken, refreshToken }`.

### What was intentionally NOT changed

- KHÔNG sửa controller/`auth.service.ts`/`email.service.ts`/model/validator/`auth.module.ts`/infrastructure/domain.
- KHÔNG wire vào runtime (AuthModule chưa khai báo provider mới; use-case chỉ tham chiếu qua barrel `application/**`).
- KHÔNG đổi route/response shape/refresh-token raw storage/login response thủ công. KHÔNG sửa `.env`. KHÔNG commit tự động.

### API compatibility

- Không thêm/sửa/xoá route. Result type được thiết kế để khớp 1-1 response hiện tại khi wire controller (DEV1.3). Behavior thật vẫn do AuthController/AuthService cũ.

### Security compatibility

- Không log password/raw token/secret. Không lộ `passwordHash`/`tokenHash` (register trả `SafeAuthUser`; verification token chỉ lưu hash). Dummy-compare giữ anti-enumeration. Refresh token raw đúng hiện trạng. `DUMMY_PASSWORD_HASH` là hằng số bcrypt cố ý không hợp lệ (không phải secret).

### UserStats caveat

- `RegisterUserService` **KHÔNG** tạo `UserStats` (gamification) trực tiếp — khác luồng register legacy hiện đang tạo `UserStats {xp:0,level:1}` ngay sau khi tạo user. **Khi wire runtime (DEV1.3)** phải khôi phục parity bằng **event handler** (vd nghe `user.registered`) hoặc port gamification, nếu FE/analytics phụ thuộc bản ghi `UserStats`. Cho tới khi wire, runtime vẫn do AuthService cũ xử lý nên parity chưa bị ảnh hưởng.

### Build result

- `npm run build` (`nest build`): ✅ PASS (0 lỗi).

### Lint result

- `npm run lint`: ✅ 0 error, **7 warning** — tất cả pre-existing, ngoài scope; 0 warning ở file mới (`eslint src/modules/auth/application` sạch).

### Test result

- `npm test`: ✅ 13/13 pass.

### Self-check result

- `auth/domain`: ✅ không import cấm.
- `auth/application`: ✅ KHÔNG import mongoose/model/schema/`src/utils`/infrastructure/`auth.service`/`email.service`.
- ✅ KHÔNG có chuỗi `AuthService`/`EmailService`/`UserStats`/`gamification` ở bất kỳ đâu trong `application` (kể cả comment).

### Known issues / caveats

1. **Lockout counter chưa mirror:** login legacy có `failedLoginAttempts`/`lockedUntil` (khoá 15' sau 5 lần sai) — `UserEntity`/`UserProps` & `IUserRepository` chưa mô hình hoá field/counter này, nên use-case mới CHƯA tăng/khoá đếm. Cần mở rộng entity + port khi wire (DEV1.3); hiện runtime vẫn do AuthService cũ giữ đầy đủ lockout.
2. **`id` ObjectId vs string:** login legacy trả `id = user._id` (ObjectId); use-case trả `id: string`. Qua JSON là tương đương; giữ caveat để khi wire không "vô tình" đổi kiểu trong body.
3. **Refresh expiry tính bằng ms** (`+7*24h`) thay vì `setDate(+7)` calendar — lệch tối đa ~1h khi qua mốc DST, không ảnh hưởng thực tế.
4. **UserStats parity** — xem mục UserStats caveat ở trên.
5. **Presenter cuối** (entity→safe user) hiện làm trong service; khi wire controller có thể chuyển sang `presentation/response` presenter cho đúng tầng.

### Next recommended task

- **DEV1.3B — Auth Use Cases (Verify/Resend/Forgot/Reset):** → **ĐÃ XONG**, xem section dưới.

---

## DEV1.3B Auth Application Use Cases — Verify/Resend/Forgot/Reset

- **Date/time:** 2026-06-23
- **Branch:** `refactor/dev1-clean-architecture`

### Files created (4 file `.ts`)

Trong `src/modules/auth/application/services/`:
- `verify-email.service.ts`
- `resend-verification-email.service.ts`
- `forgot-password.service.ts`
- `reset-password.service.ts`

### Files changed

- `application/dto/auth-use-case.dto.ts` — thêm input/result types (không xoá type cũ).
- `application/services/index.ts` — export 4 service mới.
- `domain/entities/user.entity.ts` — **thêm 1 method domain nhỏ** `changePasswordHash(newHash)` (xem "Domain changes").
- Docs: `docs/CLAUDE_PROGRESS.md` (file này), `docs/CLEAN_ARCHITECTURE_MIGRATION.md`.

### DTO/result types added

- `VerifyEmailInput {token}` → `VerifyEmailResult {user: SafeAuthUser}` (mirror `{ user: sanitizeUser }`).
- `ResendVerificationEmailInput {email}` → `ResendVerificationEmailResult {success: true}` (service legacy trả `true`; controller set message).
- `ForgotPasswordInput {email}` → `ForgotPasswordResult {success: true}` (luôn generic).
- `ResetPasswordInput {token, newPassword}` → `ResetPasswordResult {success: true}`.

### Use cases created

- `VerifyEmailService.execute()` — `@Injectable`, 1 method.
- `ResendVerificationEmailService.execute()` — `@Injectable`, 1 method.
- `ForgotPasswordService.execute()` — `@Injectable`, 1 method.
- `ResetPasswordService.execute()` — `@Injectable`, 1 method.

### Ports used (inject qua Symbol token)

- Verify: `USER_REPOSITORY`, `EMAIL_VERIFICATION_TOKEN_REPOSITORY`, `TOKEN_SERVICE`.
- Resend: `USER_REPOSITORY`, `EMAIL_VERIFICATION_TOKEN_REPOSITORY`, `TOKEN_SERVICE`, `EMAIL_SENDER`.
- Forgot: `USER_REPOSITORY`, `PASSWORD_RESET_TOKEN_REPOSITORY`, `TOKEN_SERVICE`, `EMAIL_SENDER`.
- Reset: `USER_REPOSITORY`, `PASSWORD_RESET_TOKEN_REPOSITORY`, `TOKEN_SERVICE`, `PASSWORD_HASHER`, **+ `REFRESH_TOKEN_REPOSITORY`** (để revoke — xem dưới).
- Lỗi nghiệp vụ dùng `BadRequestError`/`NotFoundError` (`src/common/custom-error`) — giữ ĐÚNG status+message hiện tại.

### Current behavior mirrored

- **Verify email:** hash token → tra `findByTokenHash` → `BadRequestError` cho invalid/`'...already been used.'`/`'...has expired.'` → `findById` user → `NotFoundError('User for verification token was not found.')` → **nếu user đã verify: đánh dấu token used rồi `BadRequestError('Email address is already verified.')`** → `markEmailVerified` + `markUsed` (cùng `now`) → update cả hai → trả `{ user }`.
- **Resend:** `findByEmail` → `NotFoundError('User not found.')` → `BadRequestError('Email address is already verified.')` → `invalidateUnusedByUserId` → sinh raw token + lưu hash (24h) → gửi verify email.
- **Forgot:** `findByEmail` → nếu không có user **hoặc** `isActive === false` → trả `{success:true}` im lặng (anti-enumeration) → `invalidateUnusedByUserId` → sinh raw token + lưu hash (1h) → gửi reset email.
- **Reset:** hash token → tra `findByTokenHash` → `BadRequestError` cho invalid/used/expired → `findById` user → `NotFoundError('User for password reset token was not found.')` → hash mật khẩu mới → `changePasswordHash` → `markUsed` → update user + token → **`deleteByUserId` revoke toàn bộ refresh token** (mirror `RefreshToken.deleteMany`, đăng xuất mọi nơi).

### Domain changes if any

- **CÓ** — thêm `UserEntity.changePasswordHash(newHash: string)`: set `props.passwordHash`, ném `Error` nếu rỗng. KHÔNG import NestJS/Mongoose/utils. Lý do: ResetPassword cần đổi hash type-safe (entity vốn không có setter). Đây là thay đổi domain tối thiểu, được phép theo brief phase này.

### What was intentionally NOT changed

- KHÔNG sửa controller/`auth.service.ts`/`email.service.ts`/model/validator/`auth.module.ts`/infrastructure.
- KHÔNG wire runtime (AuthModule chưa khai báo provider mới; use-case chỉ tham chiếu qua barrel `application/**`).
- KHÔNG đổi route/response shape/refresh-token raw storage/login response thủ công/SMTP/Google flow. KHÔNG sửa `.env`. KHÔNG commit tự động.

### API compatibility

- Không thêm/sửa/xoá route. `VerifyEmailResult` giữ `data: { user }`; resend/forgot/reset controller chỉ trả message (use-case trả `{success:true}`, không đổi wire shape). Behavior thật vẫn do AuthController/AuthService cũ.

### Security compatibility

- Không log raw verification/reset token, password, secret. Token verify/reset chỉ lưu **hash** (sha256 qua `TOKEN_SERVICE.hashToken`). `ResetPassword` revoke toàn bộ refresh token đúng như hiện tại. Verify trả `SafeAuthUser` (không `passwordHash`/`tokenHash`).

### Build result

- `npm run build`: ✅ PASS (0 lỗi).

### Lint result

- `npm run lint`: ✅ 0 error, **7 warning** — pre-existing, ngoài scope; 0 warning file mới.

### Test result

- `npm test`: ✅ 13/13 pass.

### Self-check result

- `auth/domain`: ✅ không import cấm (sau khi thêm `changePasswordHash` vẫn thuần).
- `auth/application`: ✅ KHÔNG import mongoose/model/schema/`src/utils`/infrastructure/`auth.service`/`email.service`.
- Scan `AuthService|EmailService|UserStats|gamification`: chỉ khớp **comment-only** (dto mô tả behavior mirror) và **tên class của chính mình** (`VerifyEmailService`/`ResendVerificationEmailService` chứa chuỗi con "EmailService"). KHÔNG có import/logic legacy. KHÔNG tạo `UserStats`.

### Known issues / caveats

1. **Resend/Forgot account-existence:** `Resend` ném `NotFoundError('User not found.')` (legacy leak account existence) — **mirror nguyên trạng**; `Forgot` thì generic (không leak). Đây là khác biệt sẵn có của hệ thống, không phải lỗi mới.
2. **Reset revoke refresh token:** dùng `REFRESH_TOKEN_REPOSITORY.deleteByUserId` (ngoài danh sách port tối thiểu của brief) để **giữ đúng** behavior `RefreshToken.deleteMany({userId})` hiện tại — brief chỉ cấm revoke khi legacy KHÔNG revoke; legacy có revoke nên thêm port này là đúng parity.
3. **TTL tính bằng ms** (verify 24h, reset 1h) khớp hằng số legacy (`EMAIL_VERIFICATION_TOKEN_TTL_MS`/`PASSWORD_RESET_TOKEN_TTL_MS`).
4. **Presenter `toSafeUser`** lặp lại ở `VerifyEmailService` (giống `RegisterUserService`) — sẽ gom về presenter `presentation/response` khi wire controller.
5. **`update()` ở repo dùng `doc!`** — use-case đã `findById`/`findByTokenHash` trước nên entity tồn tại; vẫn nên rà khi wire.

### Next recommended task

- **DEV1.3C — Auth Use Cases còn lại:** `RefreshTokenService` (reuse-detection + rotation, raw storage), `LogoutService`, `GetSessionService`, `GoogleLoginService` (dùng `GOOGLE_OAUTH` + tạo/link user). Sau đó **DEV1.3-wire:** đăng ký provider AuthModule (`useExisting` cho 8 port + service), chuyển controller sang use-case, khôi phục parity **lockout counter** (mở rộng `UserEntity`+`IUserRepository`) & **UserStats** (event handler `user.registered`), giữ nguyên path/shape/login response thủ công.

---

## DEV1.3C Auth Application Use Cases — Refresh/Logout/Session

- **Date/time:** 2026-06-25
- **Branch:** `refactor/dev1-clean-architecture`

### Files created (3 file `.ts`)

Trong `src/modules/auth/application/services/`:
- `refresh-token.service.ts`
- `logout.service.ts`
- `get-session.service.ts`

### Files changed

- `application/dto/auth-use-case.dto.ts` — thêm input/result types (không xoá/đổi type cũ).
- `application/services/index.ts` — export 3 service mới.
- Docs: `docs/CLAUDE_PROGRESS.md` (file này), `docs/CLEAN_ARCHITECTURE_MIGRATION.md`.

### DTO/result types added

- `RefreshTokenInput { refreshToken }` → `RefreshTokenResult { accessToken, refreshToken }` — mirror `AuthService.refresh` trả `return tokens` (CHỈ token, KHÔNG user/message).
- `LogoutInput { refreshToken }` → `LogoutResult { success: true }` — mirror `AuthService.logout(token)` (chỉ raw refresh token; KHÔNG logout-all theo userId vì legacy không làm).
- `GetSessionInput { userId }` → `GetSessionResult { user: SafeAuthUser }` — mirror `AuthService.getSessionUser(userId)` (`{ user: sanitizeUser }`).

### Use cases created

- `RefreshTokenService.execute()` — `@Injectable`, 1 method.
- `LogoutService.execute()` — `@Injectable`, 1 method.
- `GetSessionService.execute()` — `@Injectable`, 1 method.

### Ports used (inject qua Symbol token)

- Refresh: `USER_REPOSITORY`, `REFRESH_TOKEN_REPOSITORY`, `TOKEN_SERVICE`.
- Logout: `REFRESH_TOKEN_REPOSITORY`.
- Session: `USER_REPOSITORY` (KHÔNG cần `TOKEN_SERVICE` — guard đã decode JWT ở presentation).
- Lỗi nghiệp vụ dùng `UnauthorizedError`/`ForbiddenError` (`src/common/custom-error`) — giữ ĐÚNG status+message hiện tại.

### Current behavior mirrored

- **Refresh:** `findByToken(raw)` → (không có store) reuse-detection → (expired store) xoá + reject → verify chữ ký → tìm user → chặn inactive/locked → rotation → trả `{ accessToken, refreshToken }`. Mirror đúng 3 message lỗi phân biệt của legacy:
  - `'Refresh token is invalid or has expired.'` (không có trong store **hoặc** store quá hạn).
  - `'Refresh token verification failed.'` (có trong store, chưa hết hạn, nhưng verify chữ ký fail).
  - `'Refresh token user no longer exists.'` (verify ok nhưng user không tồn tại).
- **Logout:** `deleteByToken(refreshToken)` — idempotent, KHÔNG verify, KHÔNG check user (đúng legacy `RefreshToken.deleteOne({token})` rồi trả `true`).
- **Session:** `findById(userId)` → `UnauthorizedError('Authenticated user no longer exists.')` nếu null → chặn inactive/locked → trả `SafeAuthUser` (whitelist, KHÔNG passwordHash/tokenHash).

### Refresh rotation behavior

- Xoá raw token cũ (`deleteByToken`) **trước**, tạo refresh token mới **raw** (`create`) **sau** — đúng thứ tự `deleteOne` → `create` của legacy.
- Token payload ký lại từ `{ id, email, role }` của token đã verify (giữ nguyên payload). TTL refresh 7 ngày (tính bằng ms, đồng bộ với `LoginUserService` của DEV1.3A — lệch ≤ ~1h ở mốc DST so với `setDate(+7)` calendar của legacy, không ảnh hưởng thực tế).
- Refresh token vẫn lưu **raw** (KHÔNG hash) — đúng raw-token storage hiện tại.

### Reuse-detection behavior

- Token verify chữ ký hợp lệ nhưng KHÔNG có trong store ⇒ `deleteByUserId(decoded.id)` (mirror `RefreshToken.deleteMany({userId})`) revoke toàn bộ session, rồi reject. Chữ ký sai ⇒ chỉ reject (không revoke).
- **Khác biệt duy nhất so với legacy:** legacy có `logger.warn(...)` (chỉ ghi `userId`, KHÔNG ghi token) khi phát hiện reuse — use-case **bỏ dòng log này** để giữ application layer thuần (không import `src/configs/logger`) và tuân thủ quy tắc không log token. Đây là observability-only; **hành vi bảo mật (revoke-all) được giữ nguyên**.

### Domain changes if any

- **KHÔNG.** Port `IRefreshTokenRepository` đã có sẵn đủ method (`findByToken`/`deleteByToken`/`deleteByUserId`/`create`); `RefreshTokenEntity.isExpired()` đã có. Không thêm/đổi entity/port/props.

### Infrastructure changes if any

- **KHÔNG.** Không sửa adapter/mapper/repository nào (port không đổi nên không cần implement thêm).

### What was intentionally NOT changed

- KHÔNG sửa controller/`auth.service.ts`/`email.service.ts`/model/validator/`auth.module.ts`/infrastructure/domain.
- KHÔNG wire runtime (AuthModule chưa khai báo provider mới; use-case chỉ tham chiếu qua barrel `application/**`).
- KHÔNG làm `GoogleLoginService` ở phase này.
- KHÔNG đổi route/response shape/refresh-token raw storage/login response thủ công/SMTP/Google flow. KHÔNG sửa `.env`. KHÔNG commit tự động.

### API compatibility

- Không thêm/sửa/xoá route. Result types khớp 1-1 response hiện tại khi wire (`refresh` → `data:{accessToken,refreshToken}`; `logout` → chỉ `message`; `session` → `data:{user}`). Behavior thật vẫn do AuthController/AuthService cũ.

### Security compatibility

- KHÔNG log raw/access/refresh token, password, secret. Refresh giữ reuse-detection (revoke-all) + rotation. Logout idempotent (không lộ token validity). Session trả `SafeAuthUser` (không lộ field nhạy cảm). Refresh token vẫn raw đúng hiện trạng.

### Build result

- `npm run build`: ✅ PASS (0 lỗi).

### Lint result

- `npm run lint`: ✅ 0 error, **7 warning** — pre-existing, ngoài scope; 0 warning ở file mới.

### Test result

- `npm test`: ✅ 13/13 pass.

### Self-check result

- `auth/application`: ✅ KHÔNG import mongoose/model/schema/`src/utils`/infrastructure/`auth.service`/`email.service`. Mọi match grep `AuthService|EmailService` chỉ là **comment-only** (doc mô tả mirror) và **class-name only** (`VerifyEmailService`/`ResendVerificationEmailService` chứa chuỗi con "EmailService"). KHÔNG tạo `UserStats`/`gamification`. KHÔNG có `console.log`/`logger.`. Các chuỗi `refreshToken`/`accessToken` đều là **field/type/variable name hợp lệ**, KHÔNG phải log token.
- `auth/domain`: ✅ không đổi (không sửa file domain nào).

### Known issues / caveats

1. **Reuse-detection log bị lược bỏ** — xem mục Reuse-detection behavior. Behavior bảo mật giữ nguyên; chỉ thiếu dòng `logger.warn` observability. Nếu cần khôi phục log khi wire, đặt ở presentation/handler hoặc qua một port logging, KHÔNG đưa `src/configs/logger` vào application.
2. **Lockout counter chưa mirror** (caveat chung từ DEV1.3A) — refresh/session chỉ chặn inactive/locked qua `assertCanAuthenticate`, không liên quan đếm login. Runtime vẫn do AuthService cũ giữ.
3. **TTL refresh tính bằng ms** (đồng bộ DEV1.3A) thay vì `setDate(+7)` calendar — lệch tối đa ~1h ở mốc DST.
4. **`GoogleLoginService` chưa làm** — cần `GOOGLE_OAUTH` + tạo/link user; để task sau.
5. **Presenter `toSafeUser`** lặp ở `GetSessionService`/`VerifyEmailService`/`RegisterUserService` — sẽ gom về `presentation/response` khi wire controller.

### Next recommended task

- **DEV1.3D — `GoogleLoginService`** (dùng `GOOGLE_OAUTH` adapter + tạo/link user, set `isVerified`, mirror chặn `email_verified===false` & `googleId` linking, trả `{ user: SafeAuthUser, accessToken, refreshToken }` cho redirect). Sau đó **DEV1.3-wire:** đăng ký provider AuthModule (`useExisting` cho 8 port + 10 service), chuyển controller sang use-case, khôi phục parity **lockout counter** & **UserStats** (event handler), giữ nguyên path/shape/login response thủ công. → **ĐÃ XONG**, xem section dưới.

---

## DEV1.3D Auth Application Use Case — Google Login

- **Date/time:** 2026-06-25
- **Branch:** `refactor/dev1-clean-architecture`

### Files created (1 file `.ts`)

- `src/modules/auth/application/services/google-login.service.ts`

### Files changed

- `application/dto/auth-use-case.dto.ts` — thêm `GoogleProfileInput`/`GoogleLoginInput`/`GoogleLoginResult` (không xoá/đổi type cũ).
- `application/services/index.ts` — export `GoogleLoginService`.
- `domain/entities/user.entity.ts` — **domain change tối thiểu** (xem dưới).
- `infrastructure/mapper/user.mapper.ts` — reflect field `googleId` (xem dưới).
- Docs: `docs/CLAUDE_PROGRESS.md` (file này), `docs/CLEAN_ARCHITECTURE_MIGRATION.md`.

> `application/dto/index.ts` đã dùng `export * from './auth-use-case.dto'` (wildcard) ⇒ tự pick type mới, không cần sửa.

### DTO/result types added

- `GoogleProfileInput { googleId, email, emailVerified?, firstName?, lastName?, name?, avatarUrl?, picture? }` — profile **đã xác thực** (exchange code→userinfo) ở strategy/adapter trước khi vào use-case. Map từ Google userinfo: `sub→googleId`, `email_verified→emailVerified`, `given_name→firstName`, `family_name→lastName`, `name`, `picture`. KHÔNG mang Google access token.
- `GoogleLoginInput { profile, userAgent?, ipAddress? }` (userAgent/ipAddress chưa dùng).
- `GoogleLoginResult { user: SafeAuthUser, accessToken, refreshToken }` — mirror `createAuthResponse` (`sanitizeUser` đầy đủ, KHÁC login email/password thủ công).

### Use case created

- `GoogleLoginService.execute(GoogleLoginInput): GoogleLoginResult` — `@Injectable`, 1 method.

### Ports used (inject qua Symbol token)

- `USER_REPOSITORY`, `TOKEN_SERVICE`, `REFRESH_TOKEN_REPOSITORY`.
- **KHÔNG inject `GOOGLE_OAUTH`** — theo thiết kế, profile đã được strategy/adapter (`GOOGLE_OAUTH.verifyCallback`) xác thực TRƯỚC; use-case chỉ nhận profile qua input (đúng gợi ý brief Nhiệm vụ 3).
- Lỗi nghiệp vụ dùng `BadRequestError`/`ForbiddenError` (`src/common/custom-error`) — giữ ĐÚNG status+message hiện tại.

### Current Google behavior mirrored

- **Validate profile:** email thiếu → `BadRequestError('Google profile email is missing.')`; googleId(`sub`) thiếu → `'Google profile subject is missing.'`; `emailVerified === false` → `'Google profile email is not verified.'`.
- **Tra cứu user bằng EMAIL** (`findByEmail`) — đúng legacy (legacy KHÔNG tra theo googleId trong Google flow; googleId chỉ để phát hiện mismatch).
- **User tồn tại:** `assertUserCanAuthenticate` (inactive/locked) → nếu `googleId` đã set & khác `sub` → `BadRequestError('Email address is linked to a different Google account.')` → link `googleId` nếu chưa có → `markEmailVerified(verifiedAt)` → set avatar **chỉ khi** chưa có & profile có `picture` → `recordLogin(verifiedAt)` → `update`.
- **User chưa tồn tại:** tạo từ profile với fallback name (`given_name || name[0] || 'Google'` / `family_name || name[1..] || 'User'`), `role='STUDENT'`, `isVerified=true` + `emailVerifiedAt`, link `googleId`, `lastLoginAt` → `create`. **KHÔNG tạo passwordHash giả** (đúng legacy — Google user không có mật khẩu; model cho phép `passwordHash` optional).
- **Token:** ký access+refresh payload `{ id, email, role }` → lưu refresh **raw** (TTL 7 ngày, ms-based đồng bộ DEV1.3A) → trả `{ user: SafeAuthUser, accessToken, refreshToken }`.

### Domain changes if any

- **CÓ (tối thiểu):**
  - `UserProps` thêm field `googleId?: string` (model thật đã có `googleId` sparse-unique).
  - 3 method thuần (không import ngoài): `linkGoogleAccount(googleId)`, `setAvatarUrl(url)`, `recordLogin(at?)`. Lý do: mirror các mutation của legacy (`createGoogleUser` + nhánh existing-user link). `markEmailVerified` đã có từ trước (tái dùng).
  - KHÔNG import NestJS/Mongoose/utils trong domain (đã self-check).

### Port changes if any

- **KHÔNG.** `IUserRepository` đã đủ (`findByEmail`/`create`/`update`). KHÔNG dùng `findByGoogleId` (legacy Google flow không tra theo googleId).

### Infrastructure changes if any

- **CÓ (hệ quả của domain change):** `UserMapper` thêm `googleId` cả 2 chiều (`toEntity`: `doc.googleId`; `toPersistence`: `p.googleId`, vẫn strip-undefined nên KHÔNG clobber field legacy khi update). Cần để `googleId` round-trip đúng khi use-case được wire. KHÔNG sửa repository/adapter khác. KHÔNG wire runtime.

### What was intentionally NOT changed

- KHÔNG sửa controller/`auth.service.ts`/`email.service.ts`/model/validator/`auth.module.ts`.
- KHÔNG sửa `GoogleOAuthService` adapter / `IGoogleOAuth` port.
- KHÔNG wire runtime (AuthModule chưa khai báo provider mới; use-case chỉ tham chiếu qua barrel `application/**`).
- KHÔNG đổi route/response shape/Google OAuth runtime flow/refresh-token raw storage/login response thủ công/SMTP. KHÔNG sửa `.env`. KHÔNG commit tự động.

### API compatibility

- Không thêm/sửa/xoá route. `GoogleLoginResult` khớp response Google hiện tại (`{ user, accessToken, refreshToken }`) để controller giữ nguyên redirect query `accessToken`/`refreshToken`/`user=JSON.stringify(user)` khi wire. Behavior thật vẫn do AuthController/AuthService cũ.

### Security compatibility

- KHÔNG log Google profile/token, access/refresh token, secret. Reject `emailVerified===false` + chặn googleId mismatch giữ nguyên. Google user `isVerified=true` (đúng legacy). KHÔNG passwordHash giả. Trả `SafeAuthUser` (không lộ `passwordHash`/`googleId`/`tokenHash`). Refresh token raw đúng hiện trạng.

### UserStats caveat

- `GoogleLoginService` **KHÔNG** tạo `UserStats` (gamification) trực tiếp — khác `createGoogleUser` legacy (tạo `UserStats {xp:0,level:1}` cho user Google mới). **Khi wire runtime** phải khôi phục parity bằng **event handler** (vd `user.registered`/`user.google-created`) hoặc port gamification, nếu FE/analytics phụ thuộc bản ghi `UserStats`. Tới khi wire, runtime vẫn do AuthService cũ xử lý nên parity chưa bị ảnh hưởng. (Cùng caveat với DEV1.3A register.)

### Build result

- `npm run build`: ✅ PASS (0 lỗi).

### Lint result

- `npm run lint`: ✅ 0 error, **7 warning** — pre-existing, ngoài scope; 0 warning ở file mới.

### Test result

- `npm test`: ✅ 13/13 pass.

### Self-check result

- `auth/domain`: ✅ KHÔNG import cấm (sau khi thêm `googleId` + 3 method vẫn thuần). Mọi match grep `mongoose|@nestjs|infrastructure|src/utils` đều là **comment/prose-only**.
- `auth/application`: ✅ KHÔNG import mongoose/model/schema/`src/utils`/infrastructure/`auth.service`/`email.service`. Match grep `Mongoose/infrastructure/utils` là **comment-only**; `UserStats`/`Google ...token` là **comment-only** (caveat/security note). KHÔNG `console.log`/`logger.`. `accessToken`/`refreshToken`/`GoogleLoginService` là **field/type/class-name hợp lệ**, không log token.

### Known issues / caveats

1. **UserStats parity** — xem mục UserStats caveat.
2. **Mapper đụng infrastructure**: thêm `googleId` vào `UserMapper` là hệ quả bắt buộc của domain field mới (để round-trip). Đây là thay đổi infra duy nhất, an toàn (strip-undefined giữ nguyên field legacy), KHÔNG wire runtime.
3. **Lookup theo email, không theo googleId**: mirror đúng legacy. Nếu sau này muốn cho phép cùng googleId trên email khác, cần đổi cả legacy (ngoài scope).
4. **TTL refresh ms-based** (đồng bộ DEV1.3A/C) thay vì `setDate(+7)` calendar — lệch ≤ ~1h ở mốc DST.
5. **Presenter `toSafeUser`** lặp ở 4 service (Register/Verify/Session/Google) — sẽ gom về `presentation/response` khi wire controller.
6. **Validate profile (email/sub/email_verified) đặt trong use-case**: adapter `verifyCallback` hiện chỉ trả profile thô (không check `email_verified`); để giữ parity khi wire, các guard này nằm ở use-case.

### Next recommended task

- **DEV1.3-wire (Auth controller wiring):** đăng ký provider trong `AuthModule` (`{ provide: TOKEN, useExisting: Mongo*Repository }` cho 8 port + Bcrypt/Jwt/Smtp/Google adapter + 10 use-case service), chuyển `AuthController` sang inject use-case (giữ path + response shape, đặc biệt login response thủ công + Google redirect query), khôi phục parity **lockout counter** (mở rộng `UserEntity`+`IUserRepository`) & **UserStats** (event handler `user.registered`/Google-created). Smoke-test: register→verify→login; forgot→reset→login; login→refresh→logout; Google callback→FE. → **DI wiring ĐÃ XONG ở DEV1.4A** (xem dưới); controller migration là phase kế.

---

## DEV1.4A AuthModule Provider Wiring Only

- **Date/time:** 2026-06-25
- **Branch:** `refactor/dev1-clean-architecture`

### Files changed

- `src/modules/auth/auth.module.ts` — thêm provider Clean Architecture mới (giữ nguyên `controllers`, `exports`, legacy provider).
- Docs: `docs/CLAUDE_PROGRESS.md` (file này), `docs/CLEAN_ARCHITECTURE_MIGRATION.md`.

> KHÔNG sửa file nào khác (không cần thiết để build/wire). `EmailService` legacy đã là provider sẵn — `SmtpEmailSenderService` gọi `EmailService` **tĩnh** nên KHÔNG cần inject.

### Repository providers registered (concrete)

- `MongoUserRepository`, `MongoRefreshTokenRepository`, `MongoEmailVerificationTokenRepository`, `MongoPasswordResetTokenRepository`.

### Port token mappings (`useExisting` — tránh tạo instance trùng)

- `USER_REPOSITORY → MongoUserRepository`
- `REFRESH_TOKEN_REPOSITORY → MongoRefreshTokenRepository`
- `EMAIL_VERIFICATION_TOKEN_REPOSITORY → MongoEmailVerificationTokenRepository`
- `PASSWORD_RESET_TOKEN_REPOSITORY → MongoPasswordResetTokenRepository`
- `PASSWORD_HASHER → BcryptPasswordHasherService`
- `TOKEN_SERVICE → JwtTokenService`
- `EMAIL_SENDER → SmtpEmailSenderService`
- `GOOGLE_OAUTH → GoogleOAuthService`

### Infrastructure providers registered (concrete)

- `BcryptPasswordHasherService`, `JwtTokenService`, `SmtpEmailSenderService`, `GoogleOAuthService`.

### Application use-case providers registered

- `RegisterUserService`, `LoginUserService`, `VerifyEmailService`, `ResendVerificationEmailService`, `ForgotPasswordService`, `ResetPasswordService`, `RefreshTokenService`, `LogoutService`, `GetSessionService`, `GoogleLoginService` (10).

### What was intentionally NOT changed

- `AuthController` (constructor/method/Swagger/route giữ nguyên — CHƯA inject use-case mới).
- `AuthService`/`EmailService` legacy (vẫn là provider + export; runtime auth vẫn chạy qua legacy).
- Model/validator/`.env`/route path/response shape/Google OAuth flow/SMTP behavior/refresh-token raw storage/login response thủ công.
- `controllers` & `exports` của module không đổi (chỉ thêm vào `providers`).

### Runtime compatibility

- Mọi endpoint vẫn đi qua legacy `AuthController → AuthService` (tĩnh). Provider mới chỉ nằm trong DI graph để khởi tạo được, KHÔNG tham gia request flow nào.

### API compatibility

- Không thêm/sửa/xoá route. Path + response shape không đổi.

### Security compatibility

- Không log token/secret/password trong module. Wiring thuần DI; không thêm logic xử lý token.

### Build result

- `npm run build` (`nest build`): ✅ PASS (0 lỗi).

### Lint result

- `npm run lint`: ✅ 0 error, **7 warning** — pre-existing, ngoài scope; 0 warning ở `auth.module.ts`.

### Test result

- `npm test`: ✅ 13/13 pass.

### Self-check result

- domain: ✅ không import cấm. application: ✅ không import cấm (mongoose/model/utils/infra/AuthService/EmailService). infrastructure: ✅ không dùng guard/decorator/ApiResponse. controller: ✅ CHƯA inject use-case mới (grep rỗng).

### App boot / smoke result

- ⚠️ **`npm run start:dev` hiện KHÔNG boot tới cùng** do lỗi DI **pre-existing, KHÔNG liên quan DEV1**: `EnrollInCourseService` (EnrollmentsModule) không resolve được `Symbol(LEARNING_ACCESS_DATA)` — đúng nợ kernel/`LearningAccessService` mô tả ở ARCHITECTURE_RULES §1.3 (scope DEV2/DEV3/kernel).
- **Đã xác minh là pre-existing:** revert `auth.module.ts` về HEAD → boot lại → lỗi `LEARNING_ACCESS_DATA` **tái hiện y hệt** ⇒ KHÔNG do wiring DEV1.4A. MongoDB kết nối OK; NestFactory abort ở dependency đầu tiên (Enrollments) trước khi tới AuthModule, nên **KHÔNG có lỗi DI nào của Auth**. Sau đó đã restore `auth.module.ts` về bản wired.
- Build TypeScript xanh xác nhận token/class/barrel wiring hợp lệ. DI Auth sẽ kiểm chứng đầy đủ khi nợ kernel Enrollments được sửa (ngoài scope phase này) — KHÔNG sửa runtime legacy unrelated theo brief.

### Known issues / caveats

1. **Boot bị chặn bởi nợ kernel Enrollments (`LEARNING_ACCESS_DATA`)** — pre-existing, ngoài scope DEV1. Cần kernel/DEV2/DEV3 sửa (`LearningAccessService` bỏ static/`mongoose`, wire `LEARNING_ACCESS_DATA`). Không thể smoke Auth routes tới khi việc này xong.
2. **Use-case mới chưa vào request flow** — chỉ ở DI graph. Parity **lockout counter** & **UserStats** vẫn chưa khôi phục (sẽ làm ở controller-migration phase).
3. `EmailService` là static class; được giữ làm provider để không đổi cấu trúc module, dù `SmtpEmailSenderService` gọi tĩnh (không thực sự inject).

### Next recommended task

- **DEV1.4B — Auth controller migration (từng route một, có cờ rollback):** chuyển `AuthController` sang inject use-case mới (bắt đầu route rủi ro thấp như `session`/`logout`/`refresh`), giữ path + response shape (đặc biệt login response thủ công + Google redirect query), khôi phục parity **lockout counter** (mở rộng `UserEntity`+`IUserRepository`) & **UserStats** (event handler). Lưu ý: cần kernel sửa nợ `LEARNING_ACCESS_DATA` để app boot smoke-test được end-to-end.

---

## DEV1.4B Auth Parity Fix — Lockout + UserStats

- **Date/time:** 2026-06-25
- **Branch:** `refactor/dev1-clean-architecture`
- **Task:** Khôi phục parity cho 2 điểm lệch của use-case Auth Clean Architecture so với legacy **TRƯỚC** khi migrate controller: (1) login lockout counter, (2) UserStats cho user mới. **KHÔNG** chuyển controller, **KHÔNG** đổi route/response/runtime.

### Files changed

Modified (10):
- `src/modules/auth/domain/entities/user.entity.ts` — thêm lockout fields + method domain.
- `src/modules/auth/domain/interfaces/user.repository.ts` — thêm `updateLoginSecurityState`.
- `src/modules/auth/domain/interfaces/index.ts` — export port UserStats provisioner.
- `src/modules/auth/infrastructure/mapper/user.mapper.ts` — round-trip `failedLoginAttempts`/`lockedUntil`.
- `src/modules/auth/infrastructure/persistence/mongo-user.repository.ts` — `updateLoginSecurityState` (explicit `$unset lockedUntil`).
- `src/modules/auth/infrastructure/services/index.ts` — export provisioner adapter.
- `src/modules/auth/application/services/login-user.service.ts` — **mirror lockout** (temp-lock check + record failed/success).
- `src/modules/auth/application/services/register-user.service.ts` — gọi side-effect handler (UserStats parity).
- `src/modules/auth/application/services/google-login.service.ts` — gọi side-effect handler cho Google user MỚI.
- `src/modules/auth/auth.module.ts` — đăng ký provider provisioner + handler + token `USER_STATS_PROVISIONER`.

New (4):
- `src/modules/auth/domain/interfaces/user-stats-provisioner.port.ts` — port `IUserStatsProvisioner` + token.
- `src/modules/auth/infrastructure/services/mongo-user-stats-provisioner.service.ts` — adapter (nơi DUY NHẤT scope auth chạm model `UserStats`).
- `src/modules/auth/application/events/user-registered.handler.ts` — side-effect handler.
- `src/modules/auth/application/events/index.ts` — barrel.

### Lockout legacy behavior found (audit `AuthService.login` + `user.model`)

- **Fields:** `failedLoginAttempts` (Number, default 0, min 0) + `lockedUntil` (Date). (`lockedAt`/`lockedReason` là admin-lock RIÊNG, không đụng.)
- **Constants:** `MAX_LOGIN_ATTEMPTS = 5`; `LOGIN_LOCKOUT_MS = 15 * 60 * 1000` (15 phút).
- **Thứ tự (quan trọng):**
  1. `findOne({ email })`.
  2. `!user || !user.passwordHash` → **dummy bcrypt compare** → `BadRequestError('Invalid email or password credentials.')`.
  3. **Temp-lock check TRƯỚC compare:** `lockedUntil && lockedUntil > now` → `ForbiddenError('Account temporarily locked due to repeated failed login attempts. Try again in ${minutes} minute(s).')` (minutes = `ceil((lockedUntil - now)/60000)`).
  4. `bcrypt.compare`. Sai → `attempts = (failedLoginAttempts ?? 0) + 1`; nếu `attempts >= 5` → `lockedUntil = now + 15ph`, **reset `failedLoginAttempts = 0`**, `save`, `logger.warn`, `ForbiddenError('Account locked for 15 minutes after too many failed attempts.')`; nếu chưa đạt → `save`, `BadRequestError('Invalid email or password credentials.')`.
  5. Đúng password → `assertUserCanAuthenticate` (inactive→`'User account is inactive.'`, lockedAt→`'User account is locked.'`) → `!isVerified`→`ForbiddenError('Please verify your email before logging in.')` → **reset `failedLoginAttempts=0` + clear `lockedUntil` + set `lastLoginAt`** → sign tokens → lưu refresh raw → response thủ công.
- **Increment counter:** CHỈ khi sai password (bước 4). User không tồn tại = dummy compare, KHÔNG increment. Inactive/locked/unverified check SAU khi password đúng ⇒ KHÔNG increment.
- **Logger:** legacy có `logger.warn('Account locked: <email> ...')`. **Bỏ logger ở application** để giữ layer sạch (application không import `configs/logger`). → caveat. Không log dữ liệu nhạy cảm.

### Domain changes (`user.entity.ts`)

- `UserProps` có `failedLoginAttempts?`/`lockedUntil?` (đúng tên field model).
- Thêm method (nhận `maxAttempts`/`lockDurationMs` từ use-case, KHÔNG hardcode trong domain):
  - `isTemporarilyLocked(now?)` + getter `lockedUntil`.
  - `recordFailedLogin({maxAttempts, lockDurationMs, now?})` → tăng counter; chạm ngưỡng thì set `lockedUntil` + reset counter; trả `true` nếu vừa bị khoá.
  - `recordSuccessfulLogin(now?)` → reset counter + clear `lockedUntil` + set `lastLoginAt`.
- KHÔNG đổi `lock()/unlock()` (admin lock) hiện có.

### Port changes (`user.repository.ts`)

- Thêm `updateLoginSecurityState(entity): Promise<UserEntity>` — persist trạng thái lockout, nhận/trả Entity, KHÔNG dùng FilterQuery/UpdateQuery.

### Infrastructure changes

- `UserMapper`: round-trip đầy đủ `failedLoginAttempts`/`lockedUntil` (vẫn strip-undefined để không clobber field legacy).
- `MongoUserRepository.updateLoginSecurityState`: `$set failedLoginAttempts` (mặc định 0) + `$set lastLoginAt` (khi có); `lockedUntil` → `$set` khi còn hạn, `$unset` khi đã clear (login thành công) ⇒ tránh "khoá dính" do mapper strip-undefined.
- `MongoUserStatsProvisionerService`: adapter port UserStats — **upsert idempotent** `$setOnInsert {userId, xp:0, level:1}` (an toàn khi retry, KHÔNG ghi đè stats hiện có). Nơi DUY NHẤT scope auth import model `UserStats`.

### Application changes

- `LoginUserService`: chèn temp-lock check (đúng thứ tự, trước compare); sai password → `recordFailedLogin` + `updateLoginSecurityState`, ném đúng error (Forbidden khi vừa khoá, BadRequest khi chưa); thành công → `recordSuccessfulLogin` + `updateLoginSecurityState` (thay cho `updateLastLogin`, để reset counter như legacy). `LoginUserResult` shape KHÔNG đổi.
- `RegisterUserService` & `GoogleLoginService`: gọi `UserRegisteredHandler.onUserRegistered(userId)` (Google chỉ khi tạo user MỚI) thay vì import model UserStats.

### UserStats legacy behavior found

- Model: `src/modules/gamification/models/user-stats.model.ts` → re-export `infrastructure/persistence/schemas/user-stats.schema.ts`.
- Legacy tạo ở `AuthService.register` (L70) và `AuthService.createGoogleUser` (L532): `UserStats.create({ userId, xp:0, level:1 })`. Field khác (`currentStreak`/`highestStreak`/`quizzesCompleted`/`coursesCompleted`/`totalLessonsCompleted`=0, `level`=1, `lastActiveDate`=now) lấy default schema. (Cũng có ở `AdminService.createStudent` — ngoài scope phase này.)

### UserStats parity design

- **Port** `IUserStatsProvisioner` (token `USER_STATS_PROVISIONER`) ở `domain/interfaces`: `ensureForUser(userId)`.
- **Adapter** `MongoUserStatsProvisionerService` (infrastructure): upsert idempotent mirror default legacy.
- **Handler** `UserRegisteredHandler` (application/events): `onUserRegistered(userId)` (gọi trực tiếp từ use-case) + `handle(UserRegisteredEvent)` (sẵn cho event bus sau).
- Use-case → handler → port → adapter. Application KHÔNG import model UserStats.

### AuthModule provider changes

- Thêm `MongoUserStatsProvisionerService` (adapter), `UserRegisteredHandler` (handler), mapping `{ provide: USER_STATS_PROVISIONER, useExisting: MongoUserStatsProvisionerService }`. Giữ nguyên provider cũ, controller, exports.

### What was intentionally NOT changed

- AuthController, AuthService legacy, EmailService legacy, models, validators, Swagger, route path, response shape, login response thủ công, refresh-token raw storage, Google OAuth runtime, SMTP behavior, `.env`. KHÔNG commit. KHÔNG sửa lỗi kernel `LEARNING_ACCESS_DATA`.

### Runtime compatibility

- Request thật vẫn chạy 100% qua legacy `AuthController` → `AuthService`. Use-case mới ở DI graph nhưng CHƯA vào request flow ⇒ không đổi hành vi runtime.

### API compatibility

- Không thêm/sửa/xoá route. Response shape giữ nguyên.

### Security compatibility

- Không log token/password/secret/SMTP_PASS/Google token. Provisioner không log dữ liệu user. `DUMMY_PASSWORD_HASH` là hằng cố ý không hợp lệ (không phải secret). Lockout mirror đúng anti-bruteforce legacy. Refresh token vẫn raw.

### Build result

- `npm run build` (`nest build`): ✅ PASS (0 lỗi).

### Lint result

- `npm run lint`: ✅ 0 error, **7 warning** pre-existing ngoài scope DEV1 (lessons presenter ×2, quiz-attempts handler ×2, quiz.facade ×3). `eslint src/modules/auth` sạch (0 warning ở file mới/sửa).

### Test result

- `npm test`: ✅ 13/13 pass (`bugfix-regression.spec.ts`). Chưa có test riêng DEV1.

### Self-check result

- `auth/domain`: ✅ chỉ match trong comment/prose, KHÔNG có import cấm.
- `auth/application`: ✅ KHÔNG import mongoose/model/schema/utils/infrastructure. Mọi `AuthService`/`EmailService` là comment hoặc tên class (`VerifyEmailService`…). `UserStats`/`gamification` chỉ là tên **port**/comment — KHÔNG import model thật.
- `auth/infrastructure`: ✅ KHÔNG dùng guard/decorator/ApiResponse/api-handler.
- `auth/controllers`: ✅ KHÔNG inject/use use-case mới (controller chưa migrate).

### App boot/smoke

- Không chạy `start:dev` ở lượt này (pre-existing kernel `LEARNING_ACCESS_DATA` ở EnrollmentsModule chặn boot — xác minh KHÔNG do AuthModule, không sửa trong phase này). DI AuthModule compile sạch qua `nest build`; provider mới (provisioner/handler/token) đã wire đầy đủ ⇒ không phát sinh lỗi DI mới liên quan AuthModule.

### Known issues / caveats

1. **Không có event bus** (`@nestjs/event-emitter` chưa cài) ⇒ use-case gọi `UserRegisteredHandler` **trực tiếp** như application side-effect service. Khi có event bus ở cleanup, đổi sang subscribe `UserRegisteredEvent` (interface giữ nguyên). `UserRegisteredEvent` hiện CHƯA được publish (handler có sẵn `handle(event)`).
2. **Logger lock bị bỏ ở application** (legacy `logger.warn` khi khoá) để giữ layer sạch — chấp nhận mất 1 dòng log cảnh báo; không ảnh hưởng hành vi/bảo mật.
3. **Provisioner idempotent (upsert)** khác legacy (`create` ném khi trùng `userId`). An toàn hơn khi retry; default value giữ nguyên parity.
4. **Lỗi provisioning hiện KHÔNG được nuốt** trong use-case (await thẳng) — nếu UserStats lỗi sẽ làm fail register/google. (Legacy cũng await thẳng nên parity tương đương.) Khi wire controller cân nhắc try/catch nếu muốn không chặn luồng auth.
5. Parity chỉ áp cho **use-case mới**; runtime thật vẫn legacy cho tới khi controller migrate.

### Next recommended task

- **DEV1.4C — Auth controller migration (từng route, có rollback):** chuyển `AuthController` sang inject use-case mới, bắt đầu route rủi ro thấp (`session`/`logout`/`refresh`) rồi `login`/`register`/`google`. Giữ path + response shape (login thủ công + Google redirect query). Cần kernel sửa nợ `LEARNING_ACCESS_DATA` để smoke-test end-to-end.

---

## DEV1.4C-1 AuthController Migration — Session/Logout/Refresh

- **Date/time:** 2026-06-25
- **Branch:** `refactor/dev1-clean-architecture`

### Files changed

- `src/modules/auth/controllers/auth.controller.ts` — inject 3 use-case + migrate 3 route (refresh/logout/session).
- `docs/CLAUDE_PROGRESS.md`, `docs/CLEAN_ARCHITECTURE_MIGRATION.md` (note ngắn).

### Routes migrated

- `POST /api/v1/auth/refresh` → `RefreshTokenService.execute({ refreshToken })`.
- `POST /api/v1/auth/logout` → `LogoutService.execute({ refreshToken })`.
- `GET  /api/v1/auth/session` → `GetSessionService.execute({ userId })` (guard `JwtAuthGuard` + `@CurrentUser`).

### Routes intentionally NOT migrated (vẫn gọi `AuthService` tĩnh)

- `register`, `login`, `google`, `google/callback`, `verify-email`, `resend-verification`, `forgot-password`, `reset-password`.

### Legacy behavior found (3 route)

- **Refresh:** `POST /refresh`, `@HttpCode(200)`, body `{ refreshToken }` (validate `refreshTokenSchema`). Gọi `AuthService.refresh(body.refreshToken)` → trả `{ accessToken, refreshToken }`. Bọc `ApiResponse.success({ message: 'Tokens refreshed successfully.', data: result })`. Error: `UnauthorizedError` (reuse-detection revoke-all, expired, verify fail, user gone). → use-case đã mirror đủ.
- **Logout:** `POST /logout`, `@HttpCode(200)`, body `{ refreshToken }` (cùng `refreshTokenSchema`). KHÔNG guard. Gọi `AuthService.logout(token)` (`deleteOne({ token })`, **idempotent**, không verify, không lộ token hợp lệ hay không). Response chỉ `message: 'Logged out successfully.'` (KHÔNG `data`). → use-case `deleteByToken`, idempotent.
- **Session:** `GET /session`, `@UseGuards(JwtAuthGuard)` + `@ApiBearerAuth('BearerAuth')` + `@CurrentUser() user?`. Guard `if (!user) BadRequestError('User context missing from request.')`. Gọi `AuthService.getSessionUser(user.id)` → `sanitizeUser` (SafeUser). Response `{ message: 'User context retrieved successfully.', data: { user: SafeUser } }`. → use-case trả `{ user: SafeAuthUser }` (whitelist trùng `sanitizeUser`).

### Controller changes

- Thêm `constructor` inject `RefreshTokenService`/`LogoutService`/`GetSessionService` (từ barrel `../application/services`). **KHÔNG** inject `AuthService` (legacy gọi tĩnh nên các route chưa migrate vẫn dùng `AuthService.<static>` như cũ).
- 3 route đổi thân hàm sang `this.<service>.execute(...)`. Giữ nguyên decorator/route/`@HttpCode`/guard/`@CurrentUser`/message/data wrapper. Session vẫn giữ guard `if (!user)`.

### Use cases used

- `RefreshTokenService`, `LogoutService`, `GetSessionService` (đã đăng ký provider từ DEV1.4A; lockout/UserStats parity từ DEV1.4B không ảnh hưởng 3 route này).

### Response shape compatibility

- Refresh: `data: { accessToken, refreshToken }` — giữ nguyên. Logout: chỉ `message` — giữ nguyên. Session: `data: { user: SafeUser }` — whitelist giống `sanitizeUser` (id/email/firstName/lastName/avatarUrl?/role/isVerified/isActive/lastLoginAt/createdAt/updatedAt). KHÔNG lộ passwordHash/tokenHash/googleId.

### API path compatibility

- Không đổi path/method/HTTP code/guard nào.

### Security compatibility

- Không log access/refresh token. Logout giữ idempotent + không verify (mirror legacy). Refresh giữ raw-token storage + reuse-detection. Session không decode JWT thủ công (qua guard) + không query DB ở controller.

### What was intentionally NOT changed

- `auth.service.ts`, `email.service.ts`, models, validators, `auth.module.ts`, infrastructure, domain, các route còn lại, `.env`. KHÔNG commit. KHÔNG sửa kernel `LEARNING_ACCESS_DATA`.

### Build / Lint / Test

- `npm run build`: ✅ PASS. `npm run lint`: ✅ 0 error, 7 warning pre-existing ngoài scope. `npm test`: ✅ 13/13.

### Self-check result

- controller: ✅ KHÔNG import mongoose/model/schema/utils. ✅ KHÔNG inject register/login/google/verify/resend/forgot/reset use-case. ✅ CÓ inject `RefreshTokenService`/`LogoutService`/`GetSessionService`. domain/application: ✅ không import cấm (match grep chỉ là comment/class-name).

### App boot/smoke result

- `node dist/main.js`: boot fail **đúng** lỗi pre-existing `Symbol(LEARNING_ACCESS_DATA)` ở `EnrollInCourseService`/`EnrollmentsModule` — NestFactory abort TRƯỚC khi tới AuthModule ⇒ **KHÔNG có lỗi DI mới** của AuthController/use-case. Không sửa kernel (ngoài scope). Chưa smoke được route HTTP do app chưa boot.

### Known issues / caveats

1. Không thể smoke 3 route qua HTTP cho tới khi kernel `LEARNING_ACCESS_DATA` được sửa (pre-existing, ngoài scope DEV1). Build + DI-graph (qua `nest build`) xác nhận wiring AuthController hợp lệ.
2. Các route chưa migrate vẫn gọi `AuthService` tĩnh — mixed-mode tạm thời (có chủ đích, sẽ dọn ở các bước DEV1.4C kế).

### Next recommended task

- **DEV1.4C-2 — Migrate `verify-email`/`resend-verification`/`forgot-password`/`reset-password`** (nhóm token, vẫn rủi ro vừa, response shape đơn giản), rồi `register`/`login` và cuối cùng `google`/`google/callback` (giữ login response thủ công + Google redirect query). Sau khi route cuối migrate mới cân nhắc gỡ `AuthService` legacy ở Phase cleanup.

---

## DEV1.4C-2 AuthController Migration — Verify/Resend/Forgot/Reset

- **Date/time:** 2026-06-25
- **Branch:** `refactor/dev1-clean-architecture`

### Files changed

- `src/modules/auth/controllers/auth.controller.ts` — inject thêm 4 use-case + migrate 4 route.
- `docs/CLAUDE_PROGRESS.md`, `docs/CLEAN_ARCHITECTURE_MIGRATION.md` (note ngắn).

### Routes migrated

- `POST /api/v1/auth/verify-email` → `VerifyEmailService.execute({ token })`.
- `POST /api/v1/auth/resend-verification` → `ResendVerificationEmailService.execute({ email })`.
- `POST /api/v1/auth/forgot-password` → `ForgotPasswordService.execute({ email })`.
- `POST /api/v1/auth/reset-password` → `ResetPasswordService.execute({ token, newPassword })`.

### Routes intentionally NOT migrated (vẫn gọi `AuthService` tĩnh)

- `register`, `login`, `google`, `google/callback`.

### Legacy behavior found (4 route)

- **Verify Email:** `POST /verify-email`, `@HttpCode(200)`, body `{ token }` (`verifyEmailSchema`, min 1). `AuthService.verifyEmail(token)` → `{ user: SafeUser }`. Response `{ message: 'Email verified successfully.', data: { user } }`. Errors: `BadRequestError` (invalid/used/expired/đã verified), `NotFoundError` (user của token không còn). → use-case mirror đủ (kèm markUsed khi đã verified).
- **Resend Verification:** `POST /resend-verification`, `@HttpCode(200)`, body `{ email }` (`resendVerificationSchema`). `AuthService.resendVerification(email)` → `true` (ignore). Response chỉ `message: 'Verification email sent successfully.'`. Behavior: user không tồn tại → `NotFoundError('User not found.')`; đã verified → `BadRequestError('Email address is already verified.')` (KHÔNG generic — mirror đúng legacy, không "ẩn"). → use-case mirror đủ.
- **Forgot Password:** `POST /forgot-password`, `@HttpCode(200)`, body `{ email }` (`forgotPasswordSchema`). `AuthService.forgotPassword(email)` → `true` (ignore). Response `message: 'If the email exists, a password reset link has been sent.'`. **Anti-enumeration:** user không tồn tại / `isActive===false` → trả generic im lặng (không lỗi). → use-case luôn `{ success: true }`, mirror đủ.
- **Reset Password:** `POST /reset-password`, `@HttpCode(200)`, body `{ token, newPassword }` (`resetPasswordSchema`, newPassword min 6). `AuthService.resetPassword(token, newPassword)` → `true` (ignore). Response `message: 'Password reset successfully.'`. **Revoke all refresh token** của user sau khi đổi (đăng xuất mọi nơi). Errors: `BadRequestError` (invalid/used/expired), `NotFoundError` (user). → use-case mirror đủ (`deleteByUserId`).

### Controller changes

- Constructor inject thêm `VerifyEmailService`/`ResendVerificationEmailService`/`ForgotPasswordService`/`ResetPasswordService` (giữ 3 service DEV1.4C-1). 4 route đổi thân hàm sang `this.<service>.execute(...)`. Giữ nguyên decorator/route/method/`@HttpCode(200)`/`@ApiOperation`/validator/body extraction/message/data wrapper. **Không** inject `AuthService` (legacy gọi tĩnh; register/login/google vẫn dùng `AuthService.<static>`).

### Use cases used

- `VerifyEmailService`, `ResendVerificationEmailService`, `ForgotPasswordService`, `ResetPasswordService` (provider từ DEV1.4A, parity từ DEV1.3B).

### Response shape compatibility

- verify-email: `data: { user: SafeUser }` (whitelist trùng `sanitizeUser`, không lộ passwordHash/tokenHash). resend/forgot/reset: chỉ `message` (không `data`) — giữ nguyên. Tất cả message/status giữ y nguyên.

### API path compatibility

- Không đổi path/method/HTTP code/validator.

### Security compatibility

- Không log raw verification/reset token, không log password. Forgot giữ anti-enumeration. Reset giữ revoke-all refresh token. Controller không hash token, không gửi email trực tiếp, không query DB (đều qua use-case → port).

### What was intentionally NOT changed

- `auth.service.ts`, `email.service.ts`, models, validators, `auth.module.ts`, infrastructure, domain, route register/login/google/google-callback, `.env`. KHÔNG commit. KHÔNG sửa kernel `LEARNING_ACCESS_DATA`.

### Build / Lint / Test

- `npm run build`: ✅ PASS. `npm run lint`: ✅ 0 error, 7 warning pre-existing ngoài scope. `npm test`: ✅ 13/13.

### Self-check result

- controller: ✅ KHÔNG import mongoose/model/schema/utils. ✅ KHÔNG inject Register/Login/Google use-case. ✅ CÓ inject 4 service verify/resend/forgot/reset (+ 3 service DEV1.4C-1). domain/application: ✅ không import cấm.

### App boot/smoke result

- `node dist/main.js`: boot fail **đúng** lỗi pre-existing `Symbol(LEARNING_ACCESS_DATA)` ở `EnrollInCourseService`/`EnrollmentsModule` (abort trước AuthModule) ⇒ **KHÔNG có lỗi DI mới** của AuthController/use-case. Chưa smoke route HTTP được do app chưa boot. Không sửa kernel (ngoài scope).

### Known issues / caveats

1. Không smoke 4 route qua HTTP cho tới khi kernel `LEARNING_ACCESS_DATA` được sửa (pre-existing). Build + DI graph (`nest build`) xác nhận wiring hợp lệ.
2. Mixed-mode tạm thời: register/login/google vẫn gọi `AuthService` tĩnh; verify/resend/forgot/reset/session/logout/refresh đã dùng use-case.

### Next recommended task

- **DEV1.4C-3 — Migrate `register` + `login`** (giữ register response `{ user, verificationRequired, message }` 201; **giữ login response thủ công** `{ user:{id,email,firstName,lastName,role}, accessToken, refreshToken }`), rồi **DEV1.4C-4** `google`/`google/callback` (giữ redirect query `accessToken`/`refreshToken`/`user`). Gỡ `AuthService` legacy chỉ ở Phase cleanup sau khi route cuối migrate.
