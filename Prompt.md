# prompt_DEV1_CLEAN_ARCHITECTURE.txt

Bạn đang làm BE dự án ThreadLearn.

Repository:

```txt
ThreadLearn_WEB_BE
```

Backend:

```txt
NestJS + TypeScript + MongoDB/Mongoose
```

Branch làm việc:

```txt
Tạo branch mới từ develop.
Ví dụ: refactor/dev1-clean-architecture
```

Bạn là DEV1.

DEV1 scope hiện tại:

```txt
UC01 Register Account
UC02 Register/Login with Google
UC03 Verify Email
UC04 Login with Email/Password
UC05 Google OAuth Callback
UC06 Logout
UC07 Forgot Password
UC08 Reset Password
UC09 Update Personal Profile / Upload Avatar
UC10 Add Student
UC11 Lock / Unlock Student
UC12 View Student List
UC13 Update Student Information
UC14 View Dashboard Statistics
```

---

## 1. LUẬT BẮT BUỘC

Trước khi sửa code:

```txt
1. Đọc ThreadLearn_WEB_BE/ARCHITECTURE_RULES.md.
2. Đọc mục DEV1 ADDENDUM — Auth / User / Admin / Dashboard.
3. Đọc docs/CLAUDE_PROGRESS.md nếu file đã tồn tại.
4. Nếu docs/CLAUDE_PROGRESS.md chưa tồn tại, tạo file này.
5. Không sửa .env.
6. Không commit tự động.
7. Không ghi secret/token/password vào code, log, docs, progress file.
8. Không big-bang rewrite.
9. Giữ nguyên API path + response shape để FE không vỡ.
10. Dùng lại shared code có sẵn của repo, không tạo duplicate.
```

Mục tiêu:

```txt
Refactor DEV1 backend từ:
Controller → Service → Mongoose Model

sang:
Presentation → Application Use Case → Domain
Application Port ← Infrastructure Adapter
```

Không đổi hành vi nghiệp vụ hiện có.

---

## 2. EXISTING SHARED CODE RULE — BẮT BUỘC

Trước khi tạo file guard, decorator, api response helper, error helper, jwt helper, bcrypt helper, random token helper hoặc pagination helper mới, phải kiểm tra và dùng lại shared code hiện có.

Repo đã có sẵn:

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

Không được tạo lại:

```txt
JwtAuthGuard mới
Roles decorator mới
CurrentUser decorator mới
ApiResponse helper mới
AuthenticatedUser type mới nếu type hiện có dùng được
bcrypt helper mới
JWT helper mới
random token helper mới
pagination helper mới
```

Controller protected route phải dùng:

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

Authenticated user type ưu tiên dùng:

```ts
AuthenticatedUser
```

từ:

```txt
src/common/api-handler.ts
```

Không decode JWT thủ công trong controller.

Không check role thủ công trong controller nếu `JwtAuthGuard` + `@Roles()` đã xử lý.

---

## 3. Clean Architecture rule cho src/utils/index.ts

`src/utils/index.ts` được xem là helper hạ tầng vì nó có thể import JWT, bcrypt, env.

Do đó:

```txt
domain/ không được import src/utils/index.ts
application/ không được import src/utils/index.ts
presentation/ không nên import trực tiếp JWT/password utils
infrastructure/ được phép import src/utils/index.ts để wrap thành adapter
```

Ví dụ đúng:

```txt
Application service
→ PasswordHasherPort
→ BcryptPasswordHasherService
→ hashPassword / comparePasswords from src/utils/index.ts
```

Ví dụ đúng:

```txt
Application service
→ TokenServicePort
→ JwtTokenService
→ signAccessToken / signRefreshToken / verifyAccessToken / verifyRefreshToken from src/utils/index.ts
```

Ví dụ sai:

```ts
// application/services/login-user.service.ts
import { comparePasswords } from '@/utils';
```

Ví dụ đúng:

```ts
// infrastructure/services/bcrypt-password-hasher.service.ts
import { hashPassword, comparePasswords } from '@/utils';
```

---

## 4. Kiến trúc bắt buộc

`domain/`:

```txt
Không import NestJS.
Không import Mongoose.
Không import model/schema.
Không import env.
Không import infrastructure.
Không import presentation.
Không import application.
Không import src/utils/index.ts.
```

`application/`:

```txt
Không import Mongoose/model/schema.
Không import infrastructure.
Không import src/utils/index.ts.
DB chỉ đi qua port/interface.
Mỗi service = 1 use-case.
Mỗi service có đúng 1 method execute().
```

`infrastructure/`:

```txt
Là nơi duy nhất import Mongoose/model/schema.
Là nơi wrap bcrypt/JWT/SMTP/Google OAuth/filesystem.
Repository implements port.
Repository nhận/trả Entity.
Mapper chuyển doc ↔ entity.
```

`presentation/`:

```txt
Controller mỏng.
Validate input.
Gọi đúng 1 application service.
Trả ApiResponse hoặc presenter.
Dùng JwtAuthGuard / Roles / CurrentUser có sẵn.
Không query DB.
Không decode JWT thủ công.
```

---

## 5. PHASE 1 — Analysis only

Không sửa code ngay.

Đọc các module:

```txt
src/modules/auth
src/modules/users
src/modules/admin
src/modules/analytics
src/modules/dashboard
```

Nếu `analytics` hoặc `dashboard` không tồn tại, xác định dashboard statistics đang nằm ở đâu.

Liệt kê:

```txt
Current files
Current controllers
Current routes
Current service methods
Current model imports
Current response shape
Current FE-sensitive fields
Existing shared files being used
Duplicate helper/guard/decorator nếu có
```

Ghi vào:

```txt
docs/CLAUDE_PROGRESS.md
```

mục:

```txt
Current DEV1 Baseline
```

Sau phase này mới bắt đầu refactor.

---

## 6. PHASE 2 — Auth Clean Architecture skeleton

Tạo/tách cấu trúc mục tiêu cho auth:

```txt
src/modules/auth/
  domain/
    entities/
    value-objects/
    events/
    interfaces/
  application/
    dto/
    services/
    events/
  infrastructure/
    persistence/
    mapper/
    services/
  presentation/
    controller/
    validators/
    response/
```

Không xoá file cũ nếu route chưa chạy ổn.

Có thể giữ wrapper tạm thời, nhưng wrapper không được chứa business logic mới.

---

## 7. PHASE 3 — Auth ports and infrastructure adapters

Tạo ports:

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

```txt
BcryptPasswordHasherService được phép dùng hashPassword / comparePasswords từ src/utils/index.ts.
JwtTokenService được phép dùng signAccessToken / signRefreshToken / verifyAccessToken / verifyRefreshToken từ src/utils/index.ts.
Application service chỉ gọi PasswordHasherPort và TokenServicePort.
```

Bảo mật:

```txt
Password hash qua PasswordHasherPort.
Verification token lưu hash.
Reset token lưu hash.
Refresh token lưu tokenHash.
Không expose sensitive fields.
```

---

## 8. PHASE 4 — Auth use-cases

Tách từng use-case thành application service riêng:

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

Giữ endpoint:

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

Giữ response login:

```ts
{
  user,
  accessToken,
  refreshToken
}
```

Giữ user safe response:

```ts
{
  id,
  email,
  firstName,
  lastName,
  avatarUrl,
  role,
  isVerified,
  isActive,
  createdAt,
  updatedAt
}
```

Không expose:

```txt
passwordHash
tokenHash
refresh token document
reset token document
verification token document
provider id
secret
env
```

SMTP behavior phải giữ:

```txt
Normalize SMTP_PASS bằng cách xoá whitespace.
Không log SMTP_PASS.
Verify link: FRONTEND_URL + "/verify-email?token=" + encodeURIComponent(token)
Reset link: FRONTEND_URL + "/reset-password?token=" + encodeURIComponent(token)
Success logs:
SMTP verification email sent to <email>
SMTP reset password email sent to <email>
```

Google OAuth:

```txt
GET /auth/google giữ nguyên.
GET /auth/google/callback giữ nguyên.
Callback redirect về FE route hiện tại.
Query params giữ accessToken, refreshToken, user nếu FE đang dùng.
Không log accessToken hoặc refreshToken.
```

---

## 9. PHASE 5 — Users profile/avatar

Refactor users module theo 4 tầng.

Giữ endpoint:

```txt
GET   /users/profile
PATCH /users/profile
POST  /users/avatar
```

Target structure:

```txt
src/modules/users/
  domain/
    entities/user-profile.entity.ts
    interfaces/user-profile.repository.ts
    interfaces/avatar-storage.port.ts
  application/
    dto/user-profile.dto.ts
    services/get-profile.service.ts
    services/update-profile.service.ts
    services/upload-avatar.service.ts
  infrastructure/
    persistence/mongo-user-profile.repository.ts
    mapper/user-profile.mapper.ts
    services/avatar-storage.service.ts
  presentation/
    controller/users.controller.ts
    response/user-profile.presenter.ts
```

Yêu cầu:

```txt
Domain không biết Express.Multer.File.
Upload file đi qua AvatarStoragePort.
Infrastructure xử lý filesystem/storage.
Không expose absolute path.
Profile response giữ shape FE đang dùng.
```

Controller phải dùng:

```ts
@UseGuards(JwtAuthGuard)
@CurrentUser()
ApiResponse.success(...)
```

Không tạo guard/decorator mới.

---

## 10. PHASE 6 — Admin Student Management

Refactor admin student theo 4 tầng.

Giữ endpoint:

```txt
GET   /admin/students
POST  /admin/students
PATCH /admin/students/:id
PATCH /admin/students/:id/lock
PATCH /admin/students/:id/unlock
```

Target structure:

```txt
src/modules/admin/
  domain/
    entities/admin-student.entity.ts
    interfaces/admin-student.repository.ts
  application/
    dto/admin-student.dto.ts
    services/create-student.service.ts
    services/list-students.service.ts
    services/update-student.service.ts
    services/lock-student.service.ts
    services/unlock-student.service.ts
  infrastructure/
    persistence/mongo-admin-student.repository.ts
    mapper/admin-student.mapper.ts
  presentation/
    controller/admin.controller.ts
    response/admin-student.presenter.ts
```

Yêu cầu:

```txt
Controller dùng JwtAuthGuard + Roles ADMIN.
Không decode JWT thủ công.
Không check role thủ công trong controller.
Create student hash password qua PasswordHasherPort.
Không expose passwordHash/token.
Lock/unlock rule nằm ở entity hoặc domain method nếu là business rule.
```

---

## 11. PHASE 7 — Dashboard Statistics

Refactor dashboard statistics theo 4 tầng hoặc tối thiểu:

```txt
presentation
application
domain port
infrastructure repository
presenter
```

Giữ endpoint hiện tại, ví dụ:

```txt
GET /admin/dashboard/statistics
```

Yêu cầu:

```txt
Controller không query DB.
Application gọi statistics repository port.
Infrastructure aggregate DB.
Presenter normalize chart/stat data cho FE.
Admin route dùng JwtAuthGuard + Roles ADMIN.
```

---

## 12. PHASE 8 — Cleanup

Chỉ cleanup sau khi build/test pass.

Không được:

```txt
Xoá legacy field khỏi response khi FE còn dùng.
Đổi API path.
Đổi DTO làm FE vỡ.
Xoá service cũ nếu route còn dùng.
Xoá model cũ nếu repository còn dùng.
```

Được phép:

```txt
Đánh dấu @deprecated.
Giữ wrapper tạm thời.
Gỡ static service cũ sau khi mọi route đã chuyển qua use-case.
Cập nhật docs migration.
```

---

## 13. Quality gates bắt buộc

Chạy:

```bash
npm run build
npm run lint
npm test
```

Chạy self-check từ `ARCHITECTURE_RULES.md`.

Nếu đang ở Windows PowerShell, chạy thêm:

```powershell
Select-String -Path "src/modules/auth/domain/**/*.ts" -Pattern "mongoose|@nestjs|\.model|\.schema|presentation|infrastructure|application" -CaseSensitive:$false

Select-String -Path "src/modules/auth/application/**/*.ts" -Pattern "mongoose|\.model|\.schema|src/utils|@/utils" -CaseSensitive:$false

Select-String -Path "src/modules/auth/presentation/**/*.ts" -Pattern "mongoose|\.model|\.schema" -CaseSensitive:$false

Select-String -Path "src/modules/users/domain/**/*.ts" -Pattern "mongoose|@nestjs|\.model|\.schema|presentation|infrastructure|application" -CaseSensitive:$false

Select-String -Path "src/modules/admin/domain/**/*.ts" -Pattern "mongoose|@nestjs|\.model|\.schema|presentation|infrastructure|application" -CaseSensitive:$false

Select-String -Path "src/**/*.ts" -Pattern "class .*AuthGuard|class .*RoleGuard|SetMetadata\(.*roles|interface AuthenticatedUser|class ApiResponse" -CaseSensitive:$false
```

Nếu các lệnh trên có output ở file mới tạo, phải review:

```txt
Có đang tạo lại guard/decorator/type/helper không?
Có đang import jsonwebtoken hoặc bcryptjs ngoài infrastructure/utils không?
Có đang duplicate AuthenticatedUser hoặc ApiResponse không?
```

Nếu duplicate có chủ đích, phải ghi lý do vào `docs/CLAUDE_PROGRESS.md`.

---

## 14. Bắt buộc cập nhật docs/CLAUDE_PROGRESS.md

Sau khi làm xong, cập nhật:

```txt
docs/CLAUDE_PROGRESS.md
```

Nội dung bắt buộc:

```md
# ThreadLearn BE DEV1 Clean Architecture Progress

## Last Updated
- Date/time:
- Branch:
- Module:
- Task:

## Current Status
Tóm tắt hiện tại đã làm được gì, module nào còn legacy.

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
Liệt kê endpoint đã kiểm tra còn giữ nguyên.

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
Ghi rõ phần chưa làm, phần risky, hoặc lỗi unrelated.

## Next Recommended Tasks
Đề xuất task nhỏ tiếp theo.
```

Không được ghi:

```txt
accessToken
refreshToken
SMTP_PASS
JWT secret
Google client secret
MongoDB URL thật
password thật
nội dung .env thật
```

---

## 15. Docs cần tạo/cập nhật

Nếu chưa có, tạo:

```txt
docs/CLEAN_ARCHITECTURE_MIGRATION.md
```

Nội dung tối thiểu:

```txt
Target architecture
Dependency rules
Folder structure
DEV1 migration phases
How to add a new use-case
How to add a new repository adapter
How to use existing shared guards/decorators/utils
How to keep controllers thin
How to preserve API response shape
```

---

## 16. Không được báo xong nếu còn các lỗi này

Không được báo xong nếu:

```txt
Domain import @nestjs/mongoose/model/schema.
Application import Mongoose/model/schema.
Application import src/utils/index.ts.
Controller query DB.
Controller decode JWT thủ công.
Controller check role thủ công.
Tạo JwtAuthGuard mới.
Tạo Roles decorator mới.
Tạo CurrentUser decorator mới.
Tạo ApiResponse helper mới.
Tạo AuthenticatedUser type mới khi type cũ dùng được.
Tạo bcrypt/JWT helper mới thay vì wrap src/utils/index.ts ở infrastructure.
Đổi route path.
Đổi response shape làm FE vỡ.
Không cập nhật docs/CLAUDE_PROGRESS.md.
Không chạy build/lint/test.
```

---

## 17. Final response format

Sau khi hoàn thành, trả về đúng format:

```txt
1. Changed files
2. Module đã refactor tới đâu
3. Shared code đã reuse
4. Endpoint nào đã giữ nguyên
5. Build/lint/test/self-check result
6. docs/CLAUDE_PROGRESS.md đã cập nhật gì
7. Known issues còn lại
8. Next recommended task
```

Không commit tự động.
Không sửa `.env`.
Không log token/password/secret.
