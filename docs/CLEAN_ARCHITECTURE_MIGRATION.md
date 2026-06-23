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
