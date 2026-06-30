# ThreadLearn BE — Clean Architecture Migration Guide

> Tài liệu tối thiểu cho việc migrate sang Clean Architecture. Chuẩn gốc của dự án là
> [`ARCHITECTURE_RULES.md`](../ARCHITECTURE_RULES.md) (module mẫu: `src/modules/course/`).
> File này bổ sung phần riêng cho **DEV1** (auth, users, admin, dashboard). Khi mâu thuẫn, `ARCHITECTURE_RULES.md` ưu tiên.

---

## DEV1 — Target Architecture

DEV1 (auth, users, admin students, dashboard statistics) chuyển từ:

```txt
Controller → static Service → Mongoose Model
```

sang Clean Architecture 4 tầng:

```txt
presentation → application → domain ← infrastructure
   (HTTP)        (use-case)    (lõi)     (Mongoose / bcrypt / JWT / SMTP / Google / file)
```

Mỗi module DEV1 theo layout chuẩn `course` (chi tiết khung thư mục: REFACTOR_PLAN_DEV1.md §5).

---

## Dependency Rules (bắt buộc)

- `domain/` KHÔNG import `@nestjs/*`, `mongoose`, `*.model.ts`, `*.schema.ts`, `env`, `src/utils/index.ts`, `application/`, `infrastructure/`, `presentation/`.
- `application/` chỉ chạm DB **qua port** (`@Inject(TOKEN)` + interface). KHÔNG import `mongoose`, model/schema, `infrastructure/`, **và KHÔNG import `src/utils/index.ts`**.
- `infrastructure/` là tầng **DUY NHẤT** import `mongoose` + `*.model.ts`/`*.schema.ts`, và là nơi wrap `bcrypt`, `JWT`, `SMTP`, Google OAuth, filesystem. `src/utils/index.ts` chỉ được import ở đây.
- `presentation/` (controller) MỎNG: validate input (Zod pipe) → gọi **1** application service → trả `ApiResponse`. Auth bằng `@UseGuards(JwtAuthGuard)` / `@Roles` / `@CurrentUser` — KHÔNG decode JWT thủ công, KHÔNG query DB.

Self-check (chạy từ repo root) — xem REFACTOR_PLAN_DEV1.md §10 (`npx tsc --noEmit` + grep theo tầng).

---

## DEV1.7C Note (2026-06-30)

Admin student management UC10-UC13 now has application DTO/result types, an admin safe-user presenter, active-admin/student access helper, five use-case services, and `AdminModule` DI wiring via `AuthModule` exports (`USER_REPOSITORY`, `PASSWORD_HASHER`, `USER_STATS_PROVISIONER`) plus the existing `INVITATION_EMAIL` adapter. `AdminController` was intentionally not migrated, so API routes, response shape, HTTP status, and authorization behavior remain unchanged.

## DEV1.7D Note (2026-06-30)

The five Admin student management routes now call Clean Architecture use-cases from `AdminController`: add, list, update, lock, and unlock student. Route decorators, validators, response messages, flat SafeUser/list data shapes, list meta, class-level admin authorization, and HTTP status behavior were preserved. Admin stats/dashboard/execute routes were intentionally left on their existing legacy paths for later bounded phases.

## DEV1.7E Note (2026-06-30)

AdminService cleanup was limited to audit plus method-level deprecation markers for legacy student-management rollback methods. `AdminService` itself, its provider/export, stats/dashboard/execute behavior, and legacy model imports were retained because non-migrated admin routes still need existing compatibility. No API path, response shape, validator, or authorization behavior changed.

## DEV1.8A Note (2026-06-30)

Admin dashboard/statistics UC14 was audited only. Current endpoints are `GET /api/v1/admin/stats` (controller-level direct model counts) and `GET /api/v1/admin/dashboard/statistics` (static `AnalyticsService` with summary counts and monthly chart aggregates). `AnalyticsController` has no routes. No runtime code changed; detailed baseline and proposed Clean Architecture target are documented in `docs/DEV1_ADMIN_DASHBOARD_AUDIT.md`.

## Shared Code Reuse Rule

DEV1 **bắt buộc tái sử dụng**, KHÔNG tạo bản trùng:

| Dùng lại                         | Đường dẫn                                      |
| -------------------------------- | ---------------------------------------------- |
| `JwtAuthGuard`                   | `src/common/guards/jwt-auth.guard.ts`          |
| `Roles` / `ROLES_KEY`/`UserRole` | `src/common/decorators/roles.decorator.ts`     |
| `CurrentUser`                    | `src/common/decorators/current-user.decorator.ts` |
| `ApiResponse`                    | `src/common/api-response.ts`                   |
| `AuthenticatedUser`              | `src/common/api-handler.ts` (`{ id, email, role }`) |
| Zod pipe / filters / zod setup   | `src/common/pipes/`, `src/common/filters/`, `src/common/zod/` |
| JWT/bcrypt/token/pagination helper | `src/utils/index.ts` (chỉ gọi trong `infrastructure/`) |

CẤM tạo mới: `JwtAuthGuard`, `Roles`, `CurrentUser`, `ApiResponse`, `AuthenticatedUser` (type hiện dùng được), JWT helper, bcrypt helper, random-token helper, pagination helper.

Hiện trạng (audit DEV1.0): cả 5 shared (guard/decorator/ApiResponse/type) **đã reuse đúng, không có duplicate**. `src/utils/index.ts` chưa được DEV1 dùng — khi refactor, infra adapter nên wrap thay vì reimplement bcrypt/jwt inline.

---

## Module Migration Order (DEV1)

```txt
1. auth — ports/interfaces        (domain/interfaces + Symbol token + entity thuần)
2. auth — infrastructure adapters (Mongo repos + Bcrypt/Jwt/Smtp/Google adapter)
3. auth — use cases               (10 service 1-method, tách từ auth.service.ts)
4. auth — controller wiring       (inject service; giữ path + response shape)
5. users — profile/avatar         (AvatarStoragePort đẩy Multer/file về infra)
6. admin — students               (entity lock/unlock; bỏ query DB khỏi controller)
7. dashboard — statistics         (aggregation vào infra repository; presenter giữ shape)
8. cleanup + docs
```

Nguyên tắc: không big-bang; xong 1 module → `npm run build`/`lint`/`test` xanh + cập nhật `docs/CLAUDE_PROGRESS.md` → mới sang module kế.

### Tiến độ Auth (DEV1.1 — skeleton + ports, đã xong)

Đã dựng khung 4 tầng `src/modules/auth/{domain,application,infrastructure,presentation}` (application/infra/presentation còn rỗng — `.gitkeep`).
Domain thuần đã có:

- **Entities:** `UserEntity`, `RefreshTokenEntity` (giữ raw `token`, có `tokenHash?` reserved), `EmailVerificationTokenEntity`, `PasswordResetTokenEntity` (lưu `tokenHash`). Đều `private ctor` + `fromPersistence`/`createNew`/`toProps` + business method (verify/lock/unlock/expire/use…).
- **Value-objects:** `UserRole` (mirror union trung tâm), `Email` (validate/normalize, không class-validator).
- **Events:** `UserRegisteredEvent`, `EmailVerifiedEvent`, `PasswordResetRequestedEvent` (không mang raw token).
- **Ports (interface + Symbol token):** `USER_REPOSITORY`, `REFRESH_TOKEN_REPOSITORY`, `EMAIL_VERIFICATION_TOKEN_REPOSITORY`, `PASSWORD_RESET_TOKEN_REPOSITORY`, `PASSWORD_HASHER`, `TOKEN_SERVICE`, `EMAIL_SENDER`, `GOOGLE_OAUTH`.

Skeleton CHƯA wire vào runtime — route/response/behavior auth giữ nguyên. Adapter hiện thực port nằm ở DEV1.2. Chi tiết: `docs/CLAUDE_PROGRESS.md` section "DEV1.1 Auth Skeleton + Ports".

### Tiến độ Auth (DEV1.2 — infrastructure adapters, đã xong)

Đã hiện thực toàn bộ port DEV1.1 trong `src/modules/auth/infrastructure/**` (CHƯA wire runtime):

- **Mapper (doc↔entity):** `UserMapper` (strip `undefined` để preserve field legacy `googleId`/`planType`…), `RefreshTokenMapper` (raw `token`), `EmailVerificationTokenMapper`, `PasswordResetTokenMapper`.
- **Mongo repositories (`@Injectable`, trả Entity):** `MongoUserRepository`, `MongoRefreshTokenRepository`, `MongoEmailVerificationTokenRepository`, `MongoPasswordResetTokenRepository` — nơi DUY NHẤT import 4 model auth.
- **Service adapters:** `BcryptPasswordHasherService` & `JwtTokenService` (wrap `src/utils`), `SmtpEmailSenderService` (wrap `EmailService` — giữ SMTP behavior + link format), `GoogleOAuthService` (build URL + exchange→profile, không đụng DB).

Layer compliance: infrastructure import được `@nestjs/common`/Mongoose/model/`src/utils`/`crypto`; KHÔNG đụng guard/decorator/ApiResponse (presentation concern). Wiring vào AuthModule + tách use-case là DEV1.3. Chi tiết: `docs/CLAUDE_PROGRESS.md` section "DEV1.2 Auth Infrastructure Adapters".

### Tiến độ Auth (DEV1.3A — application use-cases Register/Login, đã xong)

Đã tạo 2 use-case đầu trong `src/modules/auth/application/**` (CHƯA wire runtime):

- **DTO:** `auth-use-case.dto.ts` — `RegisterUserInput/Result`, `LoginUserInput/Result`, `SafeAuthUser`, `LoginManualUser` (giữ login response thủ công hiện tại).
- **`RegisterUserService`** (inject `USER_REPOSITORY`/`PASSWORD_HASHER`/`TOKEN_SERVICE`/`EMAIL_VERIFICATION_TOKEN_REPOSITORY`/`EMAIL_SENDER`) — mirror register: check trùng email → hash → tạo user chưa verify → lưu verification token (hash, TTL 24h) → gửi email → trả safe user + cờ verify (không token).
- **`LoginUserService`** (inject `USER_REPOSITORY`/`PASSWORD_HASHER`/`TOKEN_SERVICE`/`REFRESH_TOKEN_REPOSITORY`) — mirror login: dummy-compare chống enumeration → chặn inactive/locked/chưa-verify → ký access+refresh `{id,email,role}` → lưu refresh **raw** (7 ngày) → `updateLastLogin` → response thủ công.

Layer compliance: application chỉ gọi DB/token/email/password **qua port**; lỗi dùng `common/custom-error`; KHÔNG import mongoose/model/`src/utils`/infrastructure/`auth.service`/`email.service`. Caveat parity: **lockout counter** & **UserStats** chưa mirror — khôi phục khi wire (DEV1.3). Chi tiết: `docs/CLAUDE_PROGRESS.md` section "DEV1.3A".

### Tiến độ Auth (DEV1.3B — Verify/Resend/Forgot/Reset, đã xong)

Thêm 4 use-case trong `application/services/` (CHƯA wire runtime), DTO mở rộng trong `auth-use-case.dto.ts`:

- **`VerifyEmailService`** (`USER_REPOSITORY`/`EMAIL_VERIFICATION_TOKEN_REPOSITORY`/`TOKEN_SERVICE`) — mirror verify (invalid/used/expired + nhánh "đã verify" đánh dấu token used rồi báo lỗi), trả `{ user }`.
- **`ResendVerificationEmailService`** (+`EMAIL_SENDER`) — invalidate token cũ → sinh + gửi token mới (24h).
- **`ForgotPasswordService`** (`PASSWORD_RESET_TOKEN_REPOSITORY`/`TOKEN_SERVICE`/`EMAIL_SENDER`) — generic anti-enumeration, token reset 1h.
- **`ResetPasswordService`** (+`PASSWORD_HASHER` +`REFRESH_TOKEN_REPOSITORY`) — đổi passwordHash + **revoke toàn bộ refresh token** (đúng behavior cũ).

**Domain change tối thiểu:** thêm `UserEntity.changePasswordHash(newHash)` (thuần, không import ngoài) phục vụ reset. Token verify/reset chỉ lưu hash; không log raw token. Chi tiết: `docs/CLAUDE_PROGRESS.md` section "DEV1.3B".

### Tiến độ Auth (DEV1.3C — Refresh/Logout/Session, đã xong)

Thêm 3 use-case trong `application/services/` (CHƯA wire runtime), DTO mở rộng trong `auth-use-case.dto.ts`:

- **`RefreshTokenService`** (`USER_REPOSITORY`/`REFRESH_TOKEN_REPOSITORY`/`TOKEN_SERVICE`) — mirror `AuthService.refresh`: reuse-detection (`deleteByUserId` revoke-all khi token verify được nhưng không có trong store) + rotation (xoá raw cũ → tạo raw mới, TTL 7 ngày) + 3 message lỗi phân biệt; trả `{ accessToken, refreshToken }` (KHÔNG user). Refresh token vẫn **raw**.
- **`LogoutService`** (`REFRESH_TOKEN_REPOSITORY`) — `deleteByToken` idempotent, KHÔNG verify/check user (đúng legacy).
- **`GetSessionService`** (`USER_REPOSITORY`) — `findById(userId)` từ guard, chặn inactive/locked, trả `SafeAuthUser`. KHÔNG tự decode JWT.

**KHÔNG đổi domain/infrastructure** (port đã đủ method). Khác biệt duy nhất với legacy: bỏ dòng `logger.warn` reuse-detection (observability-only) để giữ application thuần — hành vi revoke-all giữ nguyên. Chi tiết: `docs/CLAUDE_PROGRESS.md` section "DEV1.3C".

### Tiến độ Auth (DEV1.3D — Google Login, đã xong)

Thêm 1 use-case `GoogleLoginService` (CHƯA wire runtime), DTO mở rộng trong `auth-use-case.dto.ts`:

- **`GoogleLoginService`** (`USER_REPOSITORY`/`TOKEN_SERVICE`/`REFRESH_TOKEN_REPOSITORY`; KHÔNG inject `GOOGLE_OAUTH` vì profile đã được adapter/strategy xác thực trước) — mirror `AuthService.loginWithGoogleCode` + `createGoogleUser` + `createAuthResponse`: validate profile (email/sub/`email_verified`) → tra **bằng email** → link googleId/verify/avatar/lastLogin cho user cũ, hoặc tạo user Google mới (`isVerified=true`, role STUDENT, fallback name, KHÔNG passwordHash giả) → ký token → lưu refresh **raw** 7 ngày → trả `{ user: SafeAuthUser, accessToken, refreshToken }`.

**Domain change tối thiểu:** `UserProps` thêm `googleId?`; thêm method thuần `linkGoogleAccount`/`setAvatarUrl`/`recordLogin`. **Infra hệ quả:** `UserMapper` reflect `googleId` 2 chiều (strip-undefined giữ field legacy). **UserStats caveat:** use-case KHÔNG tạo `UserStats` — khôi phục bằng event handler khi wire. Chi tiết: `docs/CLAUDE_PROGRESS.md` section "DEV1.3D".

### Tiến độ Auth (DEV1.4A — AuthModule provider wiring, đã xong)

Đăng ký provider Clean Architecture mới trong `auth.module.ts` (CHỈ DI wiring, CHƯA chuyển controller):

- **Repo adapter (concrete):** `MongoUserRepository`, `MongoRefreshTokenRepository`, `MongoEmailVerificationTokenRepository`, `MongoPasswordResetTokenRepository`.
- **Service adapter (concrete):** `BcryptPasswordHasherService`, `JwtTokenService`, `SmtpEmailSenderService`, `GoogleOAuthService`.
- **Port token mapping (`useExisting`):** `USER_REPOSITORY`/`REFRESH_TOKEN_REPOSITORY`/`EMAIL_VERIFICATION_TOKEN_REPOSITORY`/`PASSWORD_RESET_TOKEN_REPOSITORY`/`PASSWORD_HASHER`/`TOKEN_SERVICE`/`EMAIL_SENDER`/`GOOGLE_OAUTH`.
- **Use-case (10):** Register/Login/Verify/Resend/Forgot/Reset/Refresh/Logout/GetSession/GoogleLogin.

Legacy `AuthService`/`EmailService` giữ nguyên (vẫn export; runtime auth vẫn qua legacy). Build/lint/test xanh. **Caveat boot:** `start:dev` bị chặn bởi nợ kernel **pre-existing** `Symbol(LEARNING_ACCESS_DATA)` (EnrollmentsModule, ngoài scope DEV1) — đã xác minh tái hiện trên HEAD, KHÔNG do wiring Auth. Chi tiết: `docs/CLAUDE_PROGRESS.md` section "DEV1.4A".

---

## Cách thêm một DEV1 use case mới

1. **Domain trước:** thêm business rule vào entity (`domain/entities/*.entity.ts`) qua factory/method; nếu cần I/O, khai báo method trên port (`domain/interfaces/*.repository.ts` hoặc `*.port.ts`) + Symbol token.
2. **Application:** tạo `application/services/<verb>-<noun>.service.ts` — `@Injectable`, đúng **1** `execute()`, inject port qua `@Inject(TOKEN)`. Không import model/schema/utils, không format response.
3. **Infrastructure:** implement port ở `infrastructure/persistence/mongo-*.repository.ts` (import model tại đây) + `infrastructure/mapper/*.mapper.ts` (doc ↔ entity). Adapter ngoài (bcrypt/jwt/smtp/google/file) ở `infrastructure/services/`.
4. **Presentation:** controller gọi service → `presentation/response/*.presenter.ts` → `ApiResponse.success(...)`. Validate bằng `ZodValidationPipe` + schema ở `presentation/validators/`.
5. **Module:** đăng ký provider + `{ provide: TOKEN, useExisting: MongoXRepository }`; `exports` PORT (không export service lẻ).
6. Chạy self-check §6 (ARCHITECTURE_RULES) / §10 (REFACTOR_PLAN_DEV1) — mọi grep tầng phải rỗng.

---

## Cách giữ API response shape hiện tại

- **Path không đổi:** giữ `@Controller('v1/...')`; nhớ global prefix `api` ⇒ path thật `/api/v1/...`.
- **Bọc `ApiResponse.success({ message, data, meta? })`** đúng như hiện tại. Lưu ý `statusCode` trong tham số **không** vào body — HTTP status đặt bằng `@HttpCode`.
- **Presenter là nơi DUY NHẤT dựng shape FE** — gom field (kể cả legacy) một chỗ. Field nhạy cảm (`passwordHash`, `tokenHash`, `googleId`, token doc, secret) KHÔNG bao giờ lộ.
- **Bảo toàn các shape đặc thù DEV1 (đã audit):**
  - `login` → `data: { user: { id, email, firstName, lastName, role }, accessToken, refreshToken }` (object user **thủ công**, KHÔNG phải `SafeUser` đầy đủ — giữ đúng, đừng "chuẩn hoá").
  - `register` → `data: { user: SafeUser, verificationRequired: true, message }`.
  - `google/callback` → 302 redirect, query `accessToken` / `refreshToken` / `user=JSON.stringify(SafeUser)`.
  - `session` / `verify-email` → `data: { user: SafeUser }`.
  - `users/profile` GET → `data: { user: SafeUser, stats }` (stats mặc định `{xp:0,level:1,currentStreak:0,highestStreak:0}` khi null).
  - admin student → `data: SafeUser` (list kèm `meta: { page, limit, total, totalPages }`).
  - dashboard → `data: { summary{...}, charts{ *ByMonth: [{month:'YYYY-MM', count}] } }`; `/stats` → `{ totalUsers, totalCourses, totalEnrollments, totalQuizAttempts }`.
  - `SafeUser` = `{ id, email, firstName, lastName, avatarUrl?, role, isVerified?, isActive?, lastLoginAt?, createdAt?, updatedAt? }`.
- **Field legacy/đổi shape chỉ động ở Phase cleanup (DEV1.7)**, sau khi FE đã migrate.

---

## Tiến độ DEV1.4B (2026-06-25) — Auth parity fix (lockout + UserStats)

Chuẩn bị parity cho use-case Auth **trước** khi migrate controller (controller chưa đổi):

- **Lockout parity:** `UserEntity` thêm `recordFailedLogin`/`recordSuccessfulLogin`/`isTemporarilyLocked`; port `IUserRepository.updateLoginSecurityState` (repo dùng `$unset lockedUntil` khi login thành công); `LoginUserService` mirror đúng thứ tự + message + ngưỡng 5 lần/15 phút của legacy.
- **UserStats parity:** thêm port `IUserStatsProvisioner` (token `USER_STATS_PROVISIONER`) + adapter `MongoUserStatsProvisionerService` (upsert idempotent `xp:0, level:1`) — nơi DUY NHẤT scope auth chạm model UserStats. Side-effect đi qua `UserRegisteredHandler` (application/events); `RegisterUserService`/`GoogleLoginService` gọi handler thay vì import model. Caveat: chưa có event bus → gọi handler trực tiếp như side-effect service (sẽ đổi sang subscribe event ở cleanup).
- AuthModule wire thêm 2 provider + 1 token (`useExisting`). Build/lint/test xanh; runtime/route/response **không đổi**. Chi tiết: `docs/CLAUDE_PROGRESS.md` §DEV1.4B.

## Tiến độ DEV1.4C-1 (2026-06-25) — AuthController migrate Session/Logout/Refresh

`AuthController` thêm constructor inject `RefreshTokenService`/`LogoutService`/`GetSessionService`; 3 route `POST /refresh`, `POST /logout`, `GET /session` (JwtAuthGuard + @CurrentUser) đổi sang `this.<service>.execute(...)`. Giữ nguyên path/HTTP code/guard/message/data shape (refresh `{ accessToken, refreshToken }`, logout chỉ message, session `{ user: SafeUser }`). Các route còn lại (register/login/google/verify/resend/forgot/reset) **vẫn gọi `AuthService` tĩnh** — chưa migrate. Build/lint/test xanh; boot vẫn fail ở nợ kernel `LEARNING_ACCESS_DATA` (pre-existing, KHÔNG do Auth). Chi tiết: `docs/CLAUDE_PROGRESS.md` §DEV1.4C-1.

## Tiến độ DEV1.4C-2 (2026-06-25) — AuthController migrate Verify/Resend/Forgot/Reset

Inject thêm `VerifyEmailService`/`ResendVerificationEmailService`/`ForgotPasswordService`/`ResetPasswordService`; 4 route `POST /verify-email|/resend-verification|/forgot-password|/reset-password` đổi sang `this.<service>.execute(...)`. Giữ nguyên path/method/HTTP 200/validator/message/data (verify `{ user: SafeUser }`, 3 route còn lại chỉ message). Anti-enumeration (forgot) + revoke-all refresh token (reset) giữ nguyên. Còn lại register/login/google **vẫn legacy**. Build/lint/test xanh; boot vẫn fail ở nợ kernel `LEARNING_ACCESS_DATA` (pre-existing). Chi tiết: `docs/CLAUDE_PROGRESS.md` §DEV1.4C-2.

## Tiến độ DEV1.4C-3 (2026-06-26) — AuthController migrate Register/Login

Inject thêm `RegisterUserService`/`LoginUserService`; 2 route `POST /register` (201) và `POST /login` (200) đổi sang `this.<service>.execute(body)`. Giữ nguyên path/method/status/validator/message. **Register** giữ `data: { user, verificationRequired, message }` (không token); **Login** giữ **response thủ công** `{ user:{id,email,firstName,lastName,role}, accessToken, refreshToken }` (chỉ 5 field user). Lockout + UserStats parity (DEV1.4B) áp dụng qua use-case. Chỉ còn 2 route Google dùng `AuthService` tĩnh. Build/lint/test xanh; boot vẫn fail ở nợ kernel `LEARNING_ACCESS_DATA` (pre-existing). Chi tiết: `docs/CLAUDE_PROGRESS.md` §DEV1.4C-3.

## Tiến độ DEV1.4C-4 (2026-06-29) — AuthController migrate Google OAuth

Inject thêm `GetGoogleAuthUrlService`/`HandleGoogleCallbackService`; 2 route `GET /google` và `GET /google/callback` đổi sang use-case (`GOOGLE_OAUTH` port + `GoogleLoginService`). Giữ nguyên `@Res()` redirect, success redirect query `accessToken`/`refreshToken`/`user=JSON.stringify(SafeUser)` (base `FRONTEND_AUTH_SUCCESS_REDIRECT_URL`), failure redirect `error=<message>` (base `FRONTEND_AUTH_FAILURE_REDIRECT_URL`), thứ tự kiểm tra `error`→`!code`→exchange. **Bỏ import/usage `AuthService` khỏi controller** ⇒ toàn bộ request flow không còn gọi legacy. Port refine (`buildAuthUrl`/`verifyCallback` typed) + adapter `assertConfigured`→`BadRequestError` (mirror 400) là 2 sửa tối thiểu. `AuthService`/`EmailService` vẫn là provider/export (chưa cleanup). Build/lint/test xanh; boot vẫn fail ở nợ kernel `LEARNING_ACCESS_DATA` (pre-existing). Chi tiết: `docs/CLAUDE_PROGRESS.md` §DEV1.4C-4.

## Tiến độ DEV1.5A (2026-06-29) — Auth post-migration cleanup audit + deprecation

Audit toàn repo: `AuthService` chỉ còn import thật ở `auth.module.ts` (provider/export), không module nào khác dùng, không còn static call ⇒ **dead runtime code** → thêm JSDoc `@deprecated`. `EmailService` vẫn **active**: là implementation thật sau port `EMAIL_SENDER` (`SmtpEmailSenderService` wrap) + `AdminService` gọi trực tiếp `sendStudentInvitationEmail` → chỉ thêm JSDoc legacy-status, **KHÔNG** deprecated-for-removal. Sửa comment lỗi thời trong `auth.module.ts`. **GIỮ NGUYÊN** mọi provider/export — cleanup deletion để DEV1.5B+ (sau khi sửa kernel `LEARNING_ACCESS_DATA` + smoke đủ route). Zero runtime change; build/lint/test xanh. Chi tiết: `docs/CLAUDE_PROGRESS.md` §DEV1.5A.

## Tiến độ DEV1.6C (2026-06-29) — Profile / Avatar application use-cases + DI wiring (KHÔNG đổi controller)

Tạo application layer UC09 + wire provider, KHÔNG migrate controller / KHÔNG đổi runtime. **Use-cases (`users/application/services`):** `GetMyProfileService` (`USER_REPOSITORY`+`USER_STATS_READER`, trả `{user: sanitizeUser, stats||fallback}`), `UpdateMyProfileService` (`USER_REPOSITORY`, `UserEntity.updateProfile`→`update`), `UploadAvatarService` (`USER_REPOSITORY`+`AVATAR_STORAGE`, `saveAvatar`→`setAvatarUrl`→`update`) — mirror **đúng** message/shape/thứ tự legacy. **DTO** `profile-use-case.dto.ts` (`ProfileSafeUser`/`ProfileStats` + In/Result; result khớp 1-1 `data` legacy: GET `{user,stats}`, PATCH/POST safe user phẳng). **Presenter** `ProfileUserPresenter` (entity→safe user, mirror `sanitizeUser`, pure). **DI:** `UsersModule` `imports:[AuthModule]` + đăng ký 3 use-case + 2 adapter (DEV1.6B) + 2 token mapping `useExisting`; `AuthModule` thêm `USER_REPOSITORY` vào `exports` (sửa tối thiểu — User aggregate thuộc auth). KHÔNG circular (AuthModule không import UsersModule); isolated `NestFactory.create(UsersModule)` resolve OK. `UsersController`/`UsersService` legacy **giữ nguyên** runtime. Build/lint/test xanh; full boot vẫn fail nợ kernel `LEARNING_ACCESS_DATA` (pre-existing). Chi tiết: `docs/CLAUDE_PROGRESS.md` §DEV1.6C.

## Tiến độ DEV1.6B (2026-06-29) — Profile / Avatar domain + ports + infrastructure adapter (KHÔNG đổi controller)

Chuẩn bị foundation Clean Architecture cho UC09, KHÔNG migrate controller / KHÔNG đổi runtime. **Domain:** thêm `UserEntity.updateProfile({firstName?,lastName?,avatarUrl?})` (mirror `UsersService.updateProfile`: undefined⇒giữ, string⇒trim; reuse `setAvatarUrl` cho upload — không thêm method trùng). **Ports (users/domain/interfaces):** `IAvatarStorage`/`AVATAR_STORAGE` (`saveAvatar(AvatarUploadFile)→AvatarStorageResult`, type thuần — KHÔNG `Express.Multer`) + `IUserStatsReader`/`USER_STATS_READER` (`getStatsByUserId→UserProfileStats|null`, mirror stats shape + index signature parity, KHÔNG type Mongoose). **Adapters (users/infrastructure/services):** `LocalAvatarStorageService` wrap `saveUploadedFile(file,'avatars')` (giữ URL `/uploads/avatars/...`, size limit, KHÔNG mime/KHÔNG xoá avatar cũ/KHÔNG lộ absolute path) + `MongoUserStatsReaderService` (`UserStats.findOne().lean()`, nơi DUY NHẤT scope users chạm model gamification). **Provider:** CHƯA wire `UsersModule` (controller chưa migrate, không consumer) — để DEV1.6C. `USER_REPOSITORY` (auth) đã đủ `findById`/`update` ⇒ KHÔNG sửa port. Build/lint/test xanh; boot vẫn fail nợ kernel `LEARNING_ACCESS_DATA` (pre-existing). Chi tiết: `docs/CLAUDE_PROGRESS.md` §DEV1.6B.

## Tiến độ DEV1.6E (2026-06-30) — UsersService cleanup audit + deprecation (KHÔNG xoá)

Audit toàn repo sau DEV1.6D: `UsersService` chỉ còn import/usage **thật** ở `users.module.ts` (provider/export); mọi match khác là comment/JSDoc/self-reference; `UsersController` KHÔNG còn import `UsersService`/`saveUploadedFile`/model (chỉ comment). `saveUploadedFile` đã qua `LocalAvatarStorageService` (infrastructure); model `UserStats` chỉ chạm ở infra adapter; application/controller không import model. Cleanup nhẹ: thêm JSDoc `@deprecated` trên class `UsersService` + sửa comment sai lệch trong `users.module.ts` (controller đã migrate, use-cases đã inject). **GIỮ NGUYÊN** file + provider + export `UsersService` cho rollback (chưa smoke HTTP do nợ kernel `LEARNING_ACCESS_DATA`). Zero runtime/API/upload change. Build/lint/test xanh; boot vẫn fail nợ kernel `LEARNING_ACCESS_DATA` (pre-existing). Deletion để phase cleanup cuối. Chi tiết: `docs/CLAUDE_PROGRESS.md` §DEV1.6E.

## Tiến độ DEV1.7A (2026-06-30) — Admin Student Management baseline audit (UC10–UC13, audit-only)

Audit-only, KHÔNG sửa `src/**`. UC10–13 nằm ở **`AdminController`** (`/api/v1/admin`, class-level `JwtAuthGuard` + `@Roles('ADMIN')` + `@ApiBearerAuth`): `POST /students` (Add, 201, dup-email check, hash bcrypt trực tiếp, role=STUDENT + active + verified, `UserStats.create` trực tiếp, invitation email **chỉ khi** generate password), `GET /students` (List, 200, filter hardcode `role:STUDENT`, search regex email/first/last, `meta{page,limit,total,totalPages}`), `PATCH /students/:id` (Update, 200, chỉ `firstName/lastName/avatarUrl/isVerified`), `PATCH /students/:id/lock` (lock = `isActive=false`+`lockedAt`+`lockedReason?`), `PATCH /students/:id/unlock` (clear `lockedAt`/`lockedReason`, `isActive=true`). Admin-lock (`lockedAt`/`lockedReason`) **tách biệt** temporary login lock (`lockedUntil`/`failedLoginAttempts`). Mọi route gọi `AdminService.*` **static** + re-check `ensureActiveAdmin` (authz lặp ngoài guard). Coupling: `AdminService` static import thẳng model `User`(auth)+`UserStats`(gamification)+`Course`(courses); email/stats trực tiếp không qua port; dead methods `listUsers`/`updateUserRole`/`toggleCoursePublish`/`deleteUser`. Sanitizer dùng chung `sanitizeUser` (không duplicate). Reuse được: `USER_REPOSITORY`(thiếu list/count students), `PASSWORD_HASHER`, `USER_STATS_PROVISIONER`, `UserEntity.lock/unlock` (đã đúng), shared guard/decorator/`ApiResponse`/`ZodValidationPipe`. Target đề xuất: thêm `UserEntity.createVerifiedStudent`/`updateStudentInfo`/`canBeManagedByAdmin`, mở rộng repo `listStudents`/`countStudents`, port `INVITATION_EMAIL`, 5 use-case (Add/Lock/Unlock/List/Update), migrate `AdminController` giữ path/status/response. Build/lint/test xanh; boot vẫn fail nợ kernel `LEARNING_ACCESS_DATA` (pre-existing). Chi tiết: `docs/CLAUDE_PROGRESS.md` §DEV1.7A.

## Tiến độ DEV1.7B (2026-06-30) — Admin Student Management domain + ports + infrastructure (KHÔNG đổi controller)

Tạo Clean Architecture foundation cho UC10–13, KHÔNG tạo use-cases / KHÔNG migrate `AdminController` / KHÔNG đổi runtime. **Domain (`UserEntity`):** `static createVerifiedStudent` (reuse `createNew`+`markEmailVerified` ⇒ STUDENT+active+verified+`emailVerifiedAt`), `updateStudentInfo({firstName?,lastName?,avatarUrl?,isVerified?})` (mirror `AdminService.updateStudent`: trim, `isVerified` toggle ↔ `emailVerifiedAt`, không đụng email/role/isActive), `lockByAdmin`/`unlockByAdmin` (wrapper delegate `lock`/`unlock` — không trùng logic, không đụng `lockedUntil`/`failedLoginAttempts`), `canBeManagedAsStudent():boolean` (role STUDENT). **Port `USER_REPOSITORY`:** thêm `StudentListQuery`/`StudentListResult` (domain thuần) + `listStudents(query)` + `updateStudentManagementState(entity)`; method cũ đủ cho Add Student (`create`) — không thêm trùng, `update` giữ nguyên. **Infra `MongoUserRepository`:** `listStudents` mirror legacy (filter `role:STUDENT`+isActive/isVerified, search regex escape `$or[email,first,last]`, sort `createdAt:-1`, skip/limit, totalPages) trả `UserEntity[]`; `updateStudentManagementState` dùng `$set`/`$unset` rõ ràng để clear `lockedAt`/`lockedReason`/`emailVerifiedAt` (mapper strip-undefined không tự `$unset`), không đụng lockout/passwordHash/planType; helper local `escapeRegex`. `UserMapper` không đổi. **Invitation:** port `INVITATION_EMAIL` + `IInvitationEmail.sendStudentInvitation` (admin/domain, không import NestJS/EmailService) + adapter `StudentInvitationEmailService` (admin/infrastructure, wrap `EmailService.sendStudentInvitationEmail`, mirror SMTP/mock/retry/swallow, không log password). **Wiring:** `AdminModule` đăng ký adapter + `{provide: INVITATION_EMAIL, useExisting}` (chưa consumer); `AuthModule` export thêm `PASSWORD_HASHER`+`USER_STATS_PROVISIONER` (prep DEV1.7C, AdminModule chưa `imports:[AuthModule]`). `AdminService`/`EmailService`/`AdminController` giữ nguyên. Build/lint/test xanh; self-check layer sạch (match chỉ JSDoc); boot vẫn fail nợ kernel `LEARNING_ACCESS_DATA` (pre-existing, không lỗi DI mới). Chi tiết: `docs/CLAUDE_PROGRESS.md` §DEV1.7B.

## Tiến độ DEV1.6D (2026-06-30) — UsersController migrate UC09 sang use-cases

`UsersController` thêm constructor inject `GetMyProfileService`/`UpdateMyProfileService`/`UploadAvatarService`; 3 route `GET /profile`, `PATCH /profile`, `POST /avatar` đổi sang `this.<service>.execute(...)` (`data: result`). Giữ nguyên path/method/status (200/200/201), guard class-level + `@ApiBearerAuth`, `ZodValidationPipe(updateProfileSchema)`, `FileInterceptor('avatar')` memory, message + response shape (GET `{user,stats}`, PATCH/POST safe user phẳng), URL `/uploads/avatars/<timestamp>-<name>`, no-mime/no-delete-old. POST giữ `try/catch` wrapper legacy (error-conversion). **Bỏ import/usage `UsersService` (static) + `saveUploadedFile`** khỏi controller ⇒ request flow UC09 không còn chạm legacy/storage trực tiếp. `UsersService` file/provider/export **giữ nguyên** (deprecation để DEV1.6E). `UsersModule` không đổi. Build/lint/test xanh; boot vẫn fail nợ kernel `LEARNING_ACCESS_DATA` (pre-existing, abort trước UsersModule). Chi tiết: `docs/CLAUDE_PROGRESS.md` §DEV1.6D.

## Tiến độ DEV1.6A (2026-06-29) — Profile / Avatar baseline audit (UC09, audit-only)

Audit-only, KHÔNG sửa `src/**`. UC09 nằm ở **`UsersController`** (`/api/v1/users`, class-level `JwtAuthGuard`): `GET /profile` (`{user:sanitizeUser, stats}`, 200), `PATCH /profile` (update `firstName/lastName/avatarUrl`, zod-trim, `assertUserCanAuthenticate`, 200), `POST /avatar` (field `avatar`, `FileInterceptor` memory → `saveUploadedFile` **local disk** `/uploads/avatars/...`, **không** validate mime, size ≤ `MAX_FILE_SIZE_MB` 10MB check sau buffer, 201). Storage chỉ local static (KHÔNG Cloudinary/S3). Coupling: `UsersService` legacy **static** import thẳng model `User`(auth)+`UserStats`(gamification); logic upload nằm trong controller; `SafeUser` legacy song song `SafeAuthUser`. Reuse được: `USER_REPOSITORY`(đủ `findById`/`update`), `UserEntity.setAvatarUrl` (thiếu `updateProfile`), shared guard/decorator/`ApiResponse`/`ZodValidationPipe`. Target đề xuất: thêm `UserEntity.updateProfile`, port `AVATAR_STORAGE` (wrap `saveUploadedFile`) + optional `USER_STATS_READER`, adapter `LocalAvatarStorageService`, migrate `UsersController` sang use-cases (giữ path/response/field/status). Caveat: User aggregate đang ở auth module ⇒ cross-module wiring. Chi tiết: `docs/CLAUDE_PROGRESS.md` §DEV1.6A.
