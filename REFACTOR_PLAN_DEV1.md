# ThreadLearn BE — Refactor Plan (DEV1)

> Mục tiêu: đưa DEV1 về **low coupling · high cohesion · Clean Architecture**, không phá API đang chạy của FE.
>
> DEV1 phụ trách các nhóm chức năng:
>
> * Authentication & Account Management
> * User Profile / Avatar
> * Admin Student Management
> * Dashboard Statistics
>
> Đọc kèm:
>
> * `ARCHITECTURE_RULES.md`
> * `docs/CLAUDE_PROGRESS.md` nếu đã tồn tại
> * `docs/CLEAN_ARCHITECTURE_MIGRATION.md` nếu đã tồn tại

---

## 1. Quyết định kiến trúc đã chốt

DEV1 refactor theo Clean Architecture 4 tầng:

```txt
presentation → application → domain ← infrastructure
```

Trong đó:

```txt
presentation     = controller, validator, presenter/response
application      = use-case service, DTO, orchestration
domain           = entity, value object, business rule, repository port
infrastructure   = Mongoose repository, mapper, JWT/bcrypt/SMTP/Google/File adapter
```

Dependency rule bắt buộc:

* `domain/` không import NestJS, Mongoose, model/schema, env, utils, application, infrastructure, presentation.
* `application/` không import Mongoose/model/schema và không import `src/utils/index.ts`.
* `infrastructure/` là nơi duy nhất đụng Mongoose, bcrypt/JWT, SMTP, Google OAuth, filesystem/storage.
* `presentation/` controller mỏng: validate input → gọi đúng 1 application service → trả `ApiResponse`.

---

## 2. DEV1 Use Cases

| UC   | Tên chức năng                           | Module chính      |
| ---- | --------------------------------------- | ----------------- |
| UC01 | Register Account                        | auth              |
| UC02 | Register/Login with Google              | auth              |
| UC03 | Verify Email                            | auth              |
| UC04 | Login with Email/Password               | auth              |
| UC05 | Google OAuth Callback                   | auth              |
| UC06 | Logout                                  | auth              |
| UC07 | Forgot Password                         | auth              |
| UC08 | Reset Password                          | auth              |
| UC09 | Update Personal Profile / Upload Avatar | users             |
| UC10 | Add Student                             | admin             |
| UC11 | Lock / Unlock Student                   | admin             |
| UC12 | View Student List                       | admin             |
| UC13 | Update Student Information              | admin             |
| UC14 | View Dashboard Statistics               | admin / analytics |

---

## 3. Nguyên tắc bắt buộc cho DEV1

1. Không big-bang rewrite.
2. Làm từng phase nhỏ, ưu tiên `auth` trước.
3. Giữ nguyên API path + response shape để FE không vỡ.
4. Controller không chứa business logic.
5. Controller không decode JWT thủ công.
6. Controller không query Mongoose trực tiếp.
7. Application service không import Mongoose/model/schema.
8. Application service không import `src/utils/index.ts`.
9. Repository nhận/trả Entity, không trả Mongoose document.
10. Mapper chịu trách nhiệm chuyển `doc ↔ entity`.
11. Presenter chịu trách nhiệm chuyển `entity/result → response shape cho FE`.
12. Không expose sensitive fields.
13. Không sửa `.env`.
14. Không commit tự động nếu chưa review.
15. Sau mỗi phase phải cập nhật `docs/CLAUDE_PROGRESS.md`.

---

## 4. Shared Code bắt buộc tái sử dụng

Repo BE đã có sẵn shared code. DEV1 không được tạo lại guard/decorator/helper/type trùng chức năng.

Bắt buộc dùng lại:

```txt
src/common/guards/jwt-auth.guard.ts
src/common/decorators/roles.decorator.ts
src/common/decorators/current-user.decorator.ts
src/common/api-response.ts
src/common/api-handler.ts
src/common/custom-error.ts
src/common/pipes/
src/common/filters/
src/common/zod/
src/utils/index.ts
```

Không tạo mới:

```txt
JwtAuthGuard
Roles decorator
CurrentUser decorator
ApiResponse helper
AuthenticatedUser type
JWT helper
bcrypt helper
random token helper
pagination helper
```

Protected route phải dùng:

```ts
@UseGuards(JwtAuthGuard)
```

Admin route phải dùng:

```ts
@Roles('ADMIN')
@UseGuards(JwtAuthGuard)
```

Current user phải lấy qua:

```ts
@CurrentUser()
```

Response phải dùng:

```ts
ApiResponse.success(...)
ApiResponse.error(...)
```

`src/utils/index.ts` chỉ được import trong `infrastructure/` adapter.

Ví dụ đúng:

```txt
LoginUserService
→ PasswordHasherPort
→ BcryptPasswordHasherService
→ comparePasswords() from src/utils/index.ts
```

Ví dụ đúng:

```txt
RefreshTokenService
→ TokenServicePort
→ JwtTokenService
→ signAccessToken() / signRefreshToken() from src/utils/index.ts
```

Ví dụ sai:

```ts
// application/services/login-user.service.ts
import { comparePasswords } from '@/utils';
```

---

## 5. Khung thư mục chuẩn cho DEV1

### 5.1 Auth module

```txt
src/modules/auth/
├── domain/
│   ├── entities/
│   │   ├── user.entity.ts
│   │   ├── refresh-token.entity.ts
│   │   ├── email-verification-token.entity.ts
│   │   └── password-reset-token.entity.ts
│   ├── value-objects/
│   │   ├── email.vo.ts
│   │   ├── password.vo.ts
│   │   └── user-role.vo.ts
│   ├── events/
│   │   ├── user-registered.event.ts
│   │   ├── email-verified.event.ts
│   │   └── password-reset-requested.event.ts
│   └── interfaces/
│       ├── user.repository.ts
│       ├── refresh-token.repository.ts
│       ├── email-verification-token.repository.ts
│       ├── password-reset-token.repository.ts
│       ├── password-hasher.port.ts
│       ├── token-service.port.ts
│       ├── email-sender.port.ts
│       └── google-oauth.port.ts
├── application/
│   ├── dto/
│   │   └── auth.dto.ts
│   ├── services/
│   │   ├── register-user.service.ts
│   │   ├── login-user.service.ts
│   │   ├── google-login.service.ts
│   │   ├── verify-email.service.ts
│   │   ├── resend-verification-email.service.ts
│   │   ├── forgot-password.service.ts
│   │   ├── reset-password.service.ts
│   │   ├── refresh-token.service.ts
│   │   ├── logout.service.ts
│   │   └── get-session.service.ts
│   └── events/
│       └── auth-event.handler.ts
├── infrastructure/
│   ├── persistence/
│   │   ├── mongo-user.repository.ts
│   │   ├── mongo-refresh-token.repository.ts
│   │   ├── mongo-email-verification-token.repository.ts
│   │   └── mongo-password-reset-token.repository.ts
│   ├── mapper/
│   │   ├── user.mapper.ts
│   │   ├── refresh-token.mapper.ts
│   │   ├── email-verification-token.mapper.ts
│   │   └── password-reset-token.mapper.ts
│   └── services/
│       ├── bcrypt-password-hasher.service.ts
│       ├── jwt-token.service.ts
│       ├── smtp-email-sender.service.ts
│       └── google-oauth.service.ts
└── presentation/
    ├── controller/
    │   └── auth.controller.ts
    ├── validators/
    │   └── auth.validator.ts
    └── response/
        └── auth.presenter.ts
```

### 5.2 Users module

```txt
src/modules/users/
├── domain/
│   ├── entities/
│   │   └── user-profile.entity.ts
│   └── interfaces/
│       ├── user-profile.repository.ts
│       └── avatar-storage.port.ts
├── application/
│   ├── dto/
│   │   └── user-profile.dto.ts
│   └── services/
│       ├── get-profile.service.ts
│       ├── update-profile.service.ts
│       └── upload-avatar.service.ts
├── infrastructure/
│   ├── persistence/
│   │   └── mongo-user-profile.repository.ts
│   ├── mapper/
│   │   └── user-profile.mapper.ts
│   └── services/
│       └── avatar-storage.service.ts
└── presentation/
    ├── controller/
    │   └── users.controller.ts
    └── response/
        └── user-profile.presenter.ts
```

### 5.3 Admin Student module

```txt
src/modules/admin/
├── domain/
│   ├── entities/
│   │   └── admin-student.entity.ts
│   └── interfaces/
│       └── admin-student.repository.ts
├── application/
│   ├── dto/
│   │   └── admin-student.dto.ts
│   └── services/
│       ├── create-student.service.ts
│       ├── list-students.service.ts
│       ├── update-student.service.ts
│       ├── lock-student.service.ts
│       └── unlock-student.service.ts
├── infrastructure/
│   ├── persistence/
│   │   └── mongo-admin-student.repository.ts
│   └── mapper/
│       └── admin-student.mapper.ts
└── presentation/
    ├── controller/
    │   └── admin.controller.ts
    └── response/
        └── admin-student.presenter.ts
```

### 5.4 Dashboard Statistics

Dashboard statistics có thể nằm trong `admin` hoặc `analytics`, tùy cấu trúc hiện tại.

Cấu trúc tối thiểu:

```txt
src/modules/admin/
├── domain/
│   └── interfaces/dashboard-statistics.repository.ts
├── application/
│   └── services/view-dashboard-statistics.service.ts
├── infrastructure/
│   ├── persistence/mongo-dashboard-statistics.repository.ts
│   └── mapper/dashboard-statistics.mapper.ts
└── presentation/
    └── response/dashboard-statistics.presenter.ts
```

---

## 6. API Compatibility bắt buộc giữ nguyên

### 6.1 Auth endpoints

```txt
POST /auth/register
POST /auth/login
GET  /auth/google
GET  /auth/google/callback
POST /auth/verify-email
POST /auth/resend-verification
POST /auth/forgot-password
POST /auth/reset-password
POST /auth/refresh
POST /auth/logout
GET  /auth/session
```

Login response phải giữ:

```ts
{
  user: SafeUser,
  accessToken: string,
  refreshToken: string
}
```

SafeUser chỉ gồm field an toàn:

```ts
{
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  role: 'STUDENT' | 'ADMIN';
  isVerified: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
```

Google callback phải giữ redirect về FE kèm query:

```txt
accessToken
refreshToken
user
```

Không log access token hoặc refresh token.

### 6.2 Users endpoints

```txt
GET   /users/profile
PATCH /users/profile
POST  /users/avatar
```

### 6.3 Admin Student endpoints

```txt
GET   /admin/students
POST  /admin/students
PATCH /admin/students/:id
PATCH /admin/students/:id/lock
PATCH /admin/students/:id/unlock
```

### 6.4 Dashboard endpoint

Giữ endpoint hiện tại, ví dụ:

```txt
GET /admin/dashboard/statistics
```

Nếu route thật khác ví dụ trên, giữ route thật đang chạy trong code.

---

## 7. Security Rules cho DEV1

Bắt buộc giữ các hành vi bảo mật hiện tại:

* Password phải hash qua `PasswordHasherPort`.
* Không lưu raw password.
* Email verification token chỉ lưu hash.
* Password reset token chỉ lưu hash.
* Refresh token lưu `tokenHash`, không lưu raw token nếu code hiện đã hỗ trợ.
* Login email/password reject user chưa verify email.
* Login reject user bị lock hoặc inactive.
* Google user được đánh dấu verified theo logic hiện tại.
* Logout xoá hoặc revoke refresh token/session.
* Không expose `passwordHash`, `tokenHash`, provider id, reset token, verification token, refresh token document, secret/env.
* Không log token, password, SMTP_PASS, JWT secret, Google secret, MongoDB URL thật.

SMTP behavior phải giữ:

```txt
SMTP_PASS normalize bằng cách xoá whitespace.
Không log SMTP_PASS.
Verify link = FRONTEND_URL + "/verify-email?token=" + encodeURIComponent(token)
Reset link = FRONTEND_URL + "/reset-password?token=" + encodeURIComponent(token)
Success logs:
SMTP verification email sent to <email>
SMTP reset password email sent to <email>
```

---

## 8. Roadmap theo Phase

### Phase DEV1.0 — Baseline Audit

Deliverable:

```txt
docs/CLAUDE_PROGRESS.md
```

Nội dung cần ghi:

* Current auth routes.
* Current users routes.
* Current admin routes.
* Current dashboard/statistics routes.
* Current response shape FE đang dùng.
* File nào đang import Mongoose/model trực tiếp.
* File nào đang chứa business logic quá nhiều.
* Shared code hiện có đang được dùng ở đâu.
* Rủi ro refactor.

Không sửa code ở phase này.

---

### Phase DEV1.1 — Auth Skeleton + Ports

Tạo skeleton 4 tầng cho `auth`.

Deliverable:

```txt
domain/entities
domain/interfaces
application/services
infrastructure/persistence
infrastructure/services
presentation/controller
presentation/response
```

Tạo các port chính:

```txt
UserRepositoryPort
RefreshTokenRepositoryPort
EmailVerificationTokenRepositoryPort
PasswordResetTokenRepositoryPort
PasswordHasherPort
TokenServicePort
EmailSenderPort
GoogleOAuthPort
```

Checkpoint:

* Build xanh.
* Chưa đổi route.
* Chưa xoá service cũ nếu route chưa chuyển xong.

---

### Phase DEV1.2 — Auth Infrastructure Adapters

Tạo adapters:

```txt
MongoUserRepository
MongoRefreshTokenRepository
MongoEmailVerificationTokenRepository
MongoPasswordResetTokenRepository
BcryptPasswordHasherService
JwtTokenService
SmtpEmailSenderService
GoogleOAuthService
```

Yêu cầu:

* Mongoose chỉ nằm trong repository infrastructure.
* `src/utils/index.ts` chỉ được import trong adapter.
* SMTP behavior giữ nguyên.
* Refresh token hashing giữ nguyên.

Checkpoint:

```txt
npm run build
npm run lint
self-check không thấy application import Mongoose/model/schema/utils
```

---

### Phase DEV1.3 — Auth Use Cases

Tách từng use-case:

```txt
RegisterUserService
LoginUserService
GoogleLoginService
VerifyEmailService
ResendVerificationEmailService
ForgotPasswordService
ResetPasswordService
RefreshTokenService
LogoutService
GetSessionService
```

Mỗi service:

* 1 file = 1 use-case.
* 1 method `execute()`.
* Inject port qua Symbol token.
* Không import model/schema.
* Không import utils.
* Không chứa response formatting.

Controller:

* Chỉ gọi use-case.
* Trả qua presenter + `ApiResponse`.

Manual test sau phase:

```txt
Register → receive verify email → verify → login
Forgot password → receive reset email → reset → login new password
Login → refresh token → logout
Google login → callback → FE dashboard
```

---

### Phase DEV1.4 — Users Profile / Avatar

Refactor users module theo 4 tầng.

Use-case services:

```txt
GetProfileService
UpdateProfileService
UploadAvatarService
```

Port / adapter:

```txt
UserProfileRepositoryPort
AvatarStoragePort
MongoUserProfileRepository
AvatarStorageService
UserProfilePresenter
```

Rule:

* Domain không biết `Express.Multer.File`.
* File storage nằm ở infrastructure.
* Không expose local absolute path.
* Giữ response profile hiện tại cho FE.

Manual test:

```txt
GET /users/profile
PATCH /users/profile
POST /users/avatar
```

---

### Phase DEV1.5 — Admin Student Management

Refactor admin student theo 4 tầng.

Use-case services:

```txt
CreateStudentService
ListStudentsService
UpdateStudentService
LockStudentService
UnlockStudentService
```

Rule:

* Admin route dùng `JwtAuthGuard` + `@Roles('ADMIN')`.
* Không decode JWT thủ công.
* Không check role thủ công trong controller.
* Create student hash password qua `PasswordHasherPort`.
* Lock/unlock business rule nằm trong entity hoặc domain method.
* Không expose sensitive fields.

Manual test:

```txt
GET /admin/students
POST /admin/students
PATCH /admin/students/:id
PATCH /admin/students/:id/lock
PATCH /admin/students/:id/unlock
```

---

### Phase DEV1.6 — Dashboard Statistics

Refactor dashboard statistics.

Use-case:

```txt
ViewDashboardStatisticsService
```

Rule:

* Controller không query DB.
* Application gọi statistics repository port.
* Infrastructure aggregate DB.
* Presenter normalize chart/stat data cho FE.
* Admin route dùng `JwtAuthGuard` + `@Roles('ADMIN')`.

Manual test:

```txt
GET /admin/dashboard/statistics
```

---

### Phase DEV1.7 — Cleanup + Docs

Chỉ cleanup khi các phase trước đã pass.

Được phép:

* Đánh dấu legacy service là `@deprecated`.
* Xoá wrapper cũ nếu không route nào dùng.
* Cập nhật Swagger/docs.
* Cập nhật `uc_audit.md`.
* Cập nhật `docs/CLEAN_ARCHITECTURE_MIGRATION.md`.

Không được:

* Đổi API path.
* Đổi response shape làm FE vỡ.
* Xoá legacy fields khi FE còn dùng.
* Xoá Mongoose model khi repository còn dùng.
* Xoá service cũ nếu chưa chắc không còn import.

---

## 9. Thứ tự thực thi & Checkpoint

```txt
1. Phase DEV1.0 — Audit baseline
2. Phase DEV1.1 — Auth skeleton + ports
3. Phase DEV1.2 — Auth infrastructure adapters
4. Phase DEV1.3 — Auth use cases
5. Phase DEV1.4 — Users profile/avatar
6. Phase DEV1.5 — Admin student management
7. Phase DEV1.6 — Dashboard statistics
8. Phase DEV1.7 — Cleanup + docs
```

Sau mỗi phase:

```bash
npm run build
npm run lint
npm test
```

Nếu test fail vì unrelated legacy issue, ghi rõ vào `docs/CLAUDE_PROGRESS.md`.

---

## 10. Self-check bắt buộc

### Linux/Git Bash

```bash
npx tsc --noEmit

grep -rEl "from 'mongoose'|from \"mongoose\"|\.model'|\.model\"|\.schema'|\.schema\"|@nestjs|presentation/" src/modules/auth/domain && echo "❌ AUTH DOMAIN BẨN" || echo "✅ AUTH DOMAIN CLEAN"

grep -rEl "from 'mongoose'|from \"mongoose\"|\.model'|\.model\"|\.schema'|\.schema\"|src/utils|@/utils" src/modules/auth/application && echo "❌ AUTH APP CHẠM DB/UTILS" || echo "✅ AUTH APP CLEAN"

grep -rEl "from 'mongoose'|from \"mongoose\"|\.model'|\.model\"|\.schema'|\.schema\"" src/modules/auth/presentation && echo "❌ AUTH CONTROLLER CHẠM DB" || echo "✅ AUTH PRESENTATION CLEAN"
```

### Windows PowerShell

```powershell
Select-String -Path "src/modules/auth/domain/**/*.ts" -Pattern "mongoose|@nestjs|\.model|\.schema|presentation|infrastructure|application" -CaseSensitive:$false

Select-String -Path "src/modules/auth/application/**/*.ts" -Pattern "mongoose|\.model|\.schema|src/utils|@/utils" -CaseSensitive:$false

Select-String -Path "src/modules/auth/presentation/**/*.ts" -Pattern "mongoose|\.model|\.schema" -CaseSensitive:$false

Select-String -Path "src/modules/users/domain/**/*.ts" -Pattern "mongoose|@nestjs|\.model|\.schema|presentation|infrastructure|application" -CaseSensitive:$false

Select-String -Path "src/modules/admin/domain/**/*.ts" -Pattern "mongoose|@nestjs|\.model|\.schema|presentation|infrastructure|application" -CaseSensitive:$false

Select-String -Path "src/**/*.ts" -Pattern "class .*AuthGuard|class .*RoleGuard|SetMetadata\(.*roles|interface AuthenticatedUser|class ApiResponse" -CaseSensitive:$false
```

Nếu có output ở file mới tạo, phải review xem có duplicate shared code hay vi phạm layer không.

---

## 11. Ma trận tác động FE

| Phase  | Đụng API path? |   Đụng response shape? | Rủi ro FE    |
| ------ | -------------: | ---------------------: | ------------ |
| DEV1.0 |          Không |                  Không | Thấp         |
| DEV1.1 |          Không |                  Không | Thấp         |
| DEV1.2 |          Không |                  Không | Trung bình   |
| DEV1.3 |          Không |                  Không | Trung bình   |
| DEV1.4 |          Không |                  Không | Trung bình   |
| DEV1.5 |          Không |                  Không | Thấp         |
| DEV1.6 |          Không |                  Không | Thấp         |
| DEV1.7 |          Không | Chỉ khi cleanup legacy | Có kiểm soát |

---

## 12. Definition of Done cho DEV1

DEV1 chỉ được báo xong khi đủ:

* [ ] Auth module đã tách use-case chính vào `application/services`.
* [ ] Auth use-case không import Mongoose/model/schema.
* [ ] Auth use-case không import `src/utils/index.ts`.
* [ ] Mongoose chỉ nằm trong `infrastructure/persistence`.
* [ ] JWT/bcrypt/SMTP/Google OAuth được wrap bằng infrastructure adapter.
* [ ] Controller dùng `JwtAuthGuard`, `Roles`, `CurrentUser`, `ApiResponse` có sẵn.
* [ ] Không tạo duplicate guard/decorator/helper/type.
* [ ] User response không expose sensitive fields.
* [ ] Register → verify email → login chạy được.
* [ ] Forgot password → reset password → login chạy được.
* [ ] Google login chạy được.
* [ ] Refresh token rotation chạy được.
* [ ] Logout chạy được.
* [ ] Profile/avatar chạy được.
* [ ] Admin student create/list/update/lock/unlock chạy được.
* [ ] Dashboard statistics chạy được.
* [ ] Swagger không mất endpoint.
* [ ] API path + response shape không làm vỡ FE.
* [ ] `npm run build` pass.
* [ ] `npm run lint` pass hoặc warning đã document.
* [ ] `npm test` pass hoặc lỗi unrelated đã document.
* [ ] `docs/CLAUDE_PROGRESS.md` đã cập nhật.

---

## 13. Progress Log bắt buộc

Vì Claude Code CLI không lưu lịch sử chat, mỗi task DEV1 phải cập nhật:

```txt
docs/CLAUDE_PROGRESS.md
```

Template:

```md
# ThreadLearn BE DEV1 Clean Architecture Progress

## Last Updated
- Date/time:
- Branch:
- Module:
- Task:

## Current Status
- Summary:

## Current DEV1 Baseline
- Auth:
- Users:
- Admin:
- Dashboard:
- Existing shared code:
- Current routes:
- Current response shapes:

## Completed Changes
- Auth:
- Users:
- Admin:
- Dashboard:
- Shared code reuse:
- Docs:

## Changed Files
- path:
  - changed:
  - reason:

## Architecture Compliance
- Domain:
- Application:
- Infrastructure:
- Presentation:
- Cross-module:
- Shared code reuse:
- API compatibility:

## Preserved Endpoints
- List endpoints preserved.

## Test Results
- npm run build:
- npm run lint:
- npm test:
- self-check grep / Select-String:

## Manual Test Checklist
- Register → verify email → login:
- Forgot password → reset password → login:
- Google login:
- Refresh token:
- Logout:
- Profile/avatar:
- Admin students:
- Dashboard statistics:

## Known Issues / Caveats
- List skipped or risky items.

## Next Recommended Tasks
- Next smallest safe task.
```

Không ghi vào file này:

```txt
accessToken
refreshToken
SMTP_PASS
JWT secret
Google client secret
MongoDB URL thật
password thật
.env content thật
```

---

## 14. Nguyên tắc migrate an toàn

* Không big-bang.
* Làm từng module, bắt đầu từ `auth`.
* Giữ Mongoose model hiện tại làm persistence detail sau repository.
* Không xoá service cũ khi route chưa chuyển xong.
* Có thể giữ wrapper tạm thời, nhưng wrapper không chứa business logic mới.
* Mọi field legacy được che qua mapper/presenter.
* Mọi response vẫn đi qua `ApiResponse`.
* Mỗi phase phải build/lint/test trước khi sang phase sau.

---

## 15. Tóm tắt 10 giây

DEV1 refactor theo thứ tự:

```txt
Auth
→ Users Profile/Avatar
→ Admin Students
→ Dashboard Statistics
```

Controller phải mỏng và dùng shared `JwtAuthGuard`, `Roles`, `CurrentUser`, `ApiResponse`.

Application service chỉ gọi port, không import model/schema/utils.

Infrastructure wrap Mongoose, JWT, bcrypt, SMTP, Google OAuth và file storage.

API path + response shape giữ nguyên cho FE.

Sau mỗi phase chạy build/lint/test và cập nhật `docs/CLAUDE_PROGRESS.md`.
