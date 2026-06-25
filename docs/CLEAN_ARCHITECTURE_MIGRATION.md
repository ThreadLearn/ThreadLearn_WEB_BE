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
