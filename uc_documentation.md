# ThreadLearn Backend — Tài Liệu & Hướng Dẫn Triển Khai Use Case (49 UC)

Tài liệu này được biên soạn chi tiết dành riêng cho đội ngũ phát triển ThreadLearn Backend. Mục tiêu là giúp tất cả lập trình viên nắm bắt sâu sắc kiến trúc hiện tại, hiểu rõ cách ánh xạ từ nghiệp vụ (Use Case) sang cấu trúc mã nguồn thực tế và nắm được các bước triển khai tiếp theo đối với các phần tính năng còn thiếu hoặc chưa hoàn thiện.

---

## 🛠️ Quy Ước Thiết Kế Hệ Thống & Path Aliases

Dự án sử dụng **NestJS** làm nền tảng API. Entry point là `src/main.ts`, root module là `src/app/app.module.ts`, realtime được triển khai bằng `@WebSocketGateway()` trong `src/socket/index.ts`.

Các lập trình viên lưu ý các quy ước sau:
1. **Path Aliases**: Sử dụng `@/` để import các tài nguyên thuộc thư mục `src/` (Ví dụ: `import { User } from '@/modules/auth/models/user.model'`). Tránh sử dụng relative import sâu (`../../../../`).
2. **Khung xử lý API NestJS**: Endpoint được khai báo trong controller bằng decorator như `@Controller()`, `@Get()`, `@Post()`. Xác thực dùng `JwtAuthGuard`, phân quyền dùng `@Roles()`, validate Zod dùng `ZodValidationPipe`, lỗi được gom qua `GlobalExceptionFilter`.
3. **Chuẩn Phản Hồi (`ApiResponse`)**: Mọi dữ liệu trả về client phải tuân theo format chuẩn quy định tại [api-response.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/common/api-response.ts).

---

## 📖 Chi Tiết 49 Use Case & Chỉ Dẫn Kỹ Thuật

---

### 🔐 CHƯƠNG I: AUTHENTICATION (UC01 - UC09)

Mã nguồn cốt lõi nằm tại thư mục `src/modules/auth/`.

#### UC01: Đăng ký tài khoản (Guest)
* **Trạng thái**: ✅ **Đã hoàn thiện (Done)**
* **Mô tả kỹ thuật**: Client gửi request `POST /api/v1/auth/register` kèm body tới `AuthController.register()`. Trình tự xử lý:
  1. Zod schema [auth.validator.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/auth/validators/auth.validator.ts) xác thực tính hợp lệ của dữ liệu đầu vào.
  2. [auth.service.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/auth/services/auth.service.ts) (`register()`) kiểm tra trùng lặp email trên DB.
  3. Băm mật khẩu bằng `bcryptjs` với độ muối là 10.
  4. Khởi tạo tài khoản trên Model [user.model.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/auth/models/user.model.ts) với vai trò mặc định là `STUDENT`.
  5. Đồng thời, tự động khởi tạo bảng chỉ số cá nhân [user-stats.model.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/gamification/models/user-stats.model.ts) với `xp: 0` và `level: 1`.
  6. Sinh mã cặp Access Token & Refresh Token lưu vào [refresh-token.model.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/auth/models/refresh-token.model.ts) và trả về client.

#### UC02: Đăng ký bằng Google (Guest)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Mô tả kỹ thuật**: OAuth framework cũ đã được loại bỏ trong quá trình migrate sang NestJS. Nếu vẫn cần use case này, triển khai lại bằng `@nestjs/passport` với Google strategy, callback controller, và service tạo user khi provider trả profile hợp lệ.

#### UC03: Đăng ký bằng nhập thông tin + xác thực email (Guest, Email Verification System)
* **Trạng thái**: 🔶 **Một phần (Partial)**
* **Chi tiết kỹ thuật & Hướng dẫn bổ sung**:
  * **Hiện trạng**: Có cấu trúc lưu trữ và đăng ký tài khoản thủ công, nhưng chưa chặn đăng nhập khi chưa xác thực, và chưa gửi link xác thực.
  * **Hướng dẫn lập trình tiếp theo**:
    1. Thêm trường `isEmailVerified: { type: Boolean, default: false }` và `emailVerificationToken: { type: String }` vào [user.model.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/auth/models/user.model.ts).
    2. Viết helper gửi mail bằng `nodemailer` tại `src/utils/mailer.ts`.
    3. Khi đăng ký (UC01), sinh token ngẫu nhiên gán vào `emailVerificationToken`, gửi link xác nhận (dạng `http://localhost:3001/api/v1/auth/verify?token=...`) vào hòm thư.
    4. Viết Route GET `/api/v1/auth/verify` tìm user chứa token khớp, chuyển `isEmailVerified = true` và xóa token đó.
    5. Trong hàm `login()`, nếu `isEmailVerified === false` thì quăng ra `BadRequestError('Tài khoản chưa được kích hoạt qua email.')`.

#### UC04: Đăng nhập (Student, Admin)
* **Trạng thái**: ✅ **Đã hoàn thiện (Done)**
* **Mô tả kỹ thuật**: `POST /api/v1/auth/login` nhận email/password tại `AuthController.login()`. [auth.service.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/auth/services/auth.service.ts) (`login()`) thực hiện truy vấn User, so khớp Hash bằng `bcrypt.compare()`, sinh JWT Token và tạo mới RefreshToken lưu xuống database để quản lý phiên làm việc lâu dài.

#### UC05: Đăng nhập bằng Google (Student, Admin, Google OAuth System)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Mô tả kỹ thuật**: Chưa có NestJS OAuth flow. Cần bổ sung Passport Google strategy, callback endpoint, và cơ chế phát hành JWT nội bộ sau khi xác thực provider thành công.

#### UC06: Đăng nhập bằng Username/Password (Student, Admin)
* **Trạng thái**: ✅ **Đã hoàn thiện (Done)**
* **Mô tả kỹ thuật**: Dữ liệu email đóng vai trò duy nhất thay thế Username. Được xác thực qua `AuthController.login()` và `AuthService.login()`, sau đó phát hành access token và refresh token bằng JWT.

#### UC07: Quên mật khẩu (Student, Admin, Email System)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình tiếp theo**:
  1. Tạo model `PasswordResetToken` lưu trữ `{ userId, token, expiresAt }`.
  2. Viết API POST `/api/v1/auth/forgot-password` nhận `{ email }`. 
  3. Nếu tìm thấy user, sinh token ngẫu nhiên, set hết hạn trong 1 giờ, lưu vào DB và gửi email chứa URL reset mật khẩu chứa token đó.

#### UC08: Đặt lại mật khẩu (Student, Admin, Authentication System)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình tiếp theo**:
  1. Viết API POST `/api/v1/auth/reset-password` nhận `{ token, newPassword }`.
  2. Tìm bản ghi token hợp lệ và chưa quá hạn.
  3. Mã hóa `newPassword` bằng `bcryptjs`, cập nhật `passwordHash` của User tương ứng, sau đó xóa bản ghi Token trong DB để vô hiệu hóa lượt dùng tiếp theo.

#### UC09: Cập nhật hồ sơ cá nhân - Upload Avatar (Student, Admin, Storage System)
* **Trạng thái**: ✅ **Đã hoàn thiện (Done)**
* **Mô tả kỹ thuật**:
  * API POST `/api/v1/users/avatar` nhận avatar dưới dạng multipart Form-Data.
  * Helper [upload.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/configs/upload.ts) (`saveUploadedFile()`) sẽ lưu file vào thư mục `/public/uploads/avatars/` và trả về đường dẫn URL dạng tĩnh `/uploads/avatars/filename.png`.
  * [users.service.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/users/services/users.service.ts) (`updateAvatar()`) cập nhật đường dẫn này vào trường `avatarUrl` trên DB của User.

---

### 👨‍💼 CHƯƠNG II: ADMIN — QUẢN LÝ NGƯỜI DÙNG (UC10 - UC13)

Mã nguồn tại thư mục `src/modules/admin/` và sử dụng [admin.service.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/admin/services/admin.service.ts).

#### UC10: Thêm Student (Admin)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình tiếp theo**:
  1. Thêm hàm `createStudent(data)` vào `AdminService`. 
  2. Băm mật khẩu ngẫu nhiên hoặc do admin chỉ định, tạo User mới với `role: 'STUDENT'`.
  3. Khởi tạo `UserStats` cho tài khoản này và gửi email chào mừng kèm thông tin đăng nhập.

#### UC11: Khóa/Mở khóa Student (Admin)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình tiếp theo**:
  1. Thêm trường `isLocked: { type: Boolean, default: false }` vào [user.model.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/auth/models/user.model.ts).
  2. Thêm hàm `toggleUserLock(userId)` vào `AdminService` để lật giá trị `isLocked`.
  3. Cập nhật `JwtAuthGuard` để kiểm tra trạng thái khóa tài khoản — nếu user đang có `isLocked === true` thì chặn ngay lập tức và quăng lỗi `UnauthorizedError('Tài khoản của bạn đã bị khóa bởi Admin.')`.

#### UC12: Xem danh sách Student (Admin)
* **Trạng thái**: 🔶 **Một phần (Partial)**
* **Chi tiết kỹ thuật & Hướng dẫn bổ sung**:
  * **Hiện trạng**: Đã viết hàm nghiệp vụ phân trang `AdminService.listUsers(page, limit)` lấy toàn bộ user sắp xếp theo ngày đăng ký mới nhất.
  * **Hướng dẫn lập trình tiếp theo**: Cần thêm method `GET /api/v1/admin/users` trong `AdminController`, dùng `@UseGuards(JwtAuthGuard)` và `@Roles('ADMIN')` để gọi tới `AdminService.listUsers`.

#### UC13: Cập nhật thông tin Student (Admin)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình tiếp theo**: Viết hàm `updateUserByAdmin(userId, updateData)` trong `AdminService` cho phép Admin điều chỉnh họ tên, phân cấp vai trò (`STUDENT` <-> `ADMIN`), và đổi trạng thái kích hoạt tài khoản.

---

### 📊 CHƯƠNG III: DASHBOARD & THỐNG KÊ (UC14)

Mã nguồn tại `src/modules/analytics/`.

#### UC14: Xem biểu đồ thống kê (Admin, Analytics System)
* **Trạng thái**: 🔶 **Một phần (Partial)**
* **Chi tiết kỹ thuật & Hướng dẫn bổ sung**:
  * **Hiện trạng**: [analytics.service.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/analytics/services/analytics.service.ts) (`getPlatformStats()`) đã có khả năng tính toán tổng thể: Tổng số lượng học viên, Số khóa học, Số lượt ghi danh (Enrollment), Tổng số lượt làm Quiz, Tỷ lệ hoàn thành khóa học và Tỷ lệ pass Quiz.
  * **Hướng dẫn lập trình tiếp theo**:
    1. Để phục vụ việc vẽ biểu đồ, cần viết thêm các MongoDB aggregation pipelines để nhóm dữ liệu (Ví dụ: đếm số lượt đăng ký học viên mới nhóm theo tuần/tháng).
    2. Mở rộng trường Doanh thu: Khi có UC31, lập bảng `Payment` và tính tổng số tiền giao dịch thành công.
    3. Dùng hoặc mở rộng `AdminController.getStats()` tại `GET /api/v1/admin/stats` để expose dữ liệu này ra bên ngoài.

---

### 📚 CHƯƠNG IV: QUẢN LÝ KHÓA HỌC (UC15 - UC18)

Mã nguồn tại `src/modules/courses/`.

#### UC15: Thêm khóa học mới + Gắn tag, level, language + Upload thumbnail (Admin)
* **Trạng thái**: 🔶 **Một phần (Partial)**
* **Chi tiết kỹ thuật & Hướng dẫn bổ sung**:
  * **Hiện trạng**: Đã viết hàm `CoursesService.createCourse()` lưu trữ tiêu đề, mô tả và ảnh bìa khóa học.
  * **Hướng dẫn lập trình tiếp theo**:
    1. Sửa đổi [course.model.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/courses/models/course.model.ts), bổ sung các trường:
       ```typescript
       tags: [{ type: String, index: true }],
       level: { type: String, enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'], default: 'BEGINNER', index: true },
       language: { type: String, default: 'JavaScript', index: true },
       ```
    2. Viết API Endpoint `/api/v1/courses/thumbnail` cho phép admin tải file ảnh bìa lên thư mục `/public/uploads/courses/`.

#### UC16: Chỉnh sửa thông tin khóa học (Admin)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình tiếp theo**: Bổ sung hàm `updateCourse(courseId, data)` vào `CoursesService` và xuất route `PUT /api/v1/courses/[id]`.

#### UC17: Ẩn/Hiện khóa học (Admin)
* **Trạng thái**: ✅ **Đã hoàn thiện (Done)**
* **Mô tả kỹ thuật**: Khi khóa học ở chế độ ẩn, khách hoặc học viên không thể tìm thấy. Triển khai tại `AdminService.toggleCoursePublish()`, thay đổi trạng thái của trường `isPublished` giữa `true` và `false`.

#### UC18: Xóa khóa học (Admin)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình tiếp theo**: Thêm trường `isDeleted: { type: Boolean, default: false }` vào `CourseSchema`. Triển khai Soft Delete bằng cách chuyển cờ này lên `true` thay vì xóa vật lý, đồng thời cập nhật tất cả câu lệnh tìm kiếm khóa học để lọc ra các bản ghi có `isDeleted: false`.

---

### 📖 CHƯƠNG V: QUẢN LÝ BÀI HỌC (UC19 - UC25)

Mã nguồn tại `src/modules/lessons/`.

#### UC19: Thêm bài học + Nhập thời lượng + Markdown + Đính kèm + Video URL
* **Trạng thái**: 🔶 **Một phần (Partial)**
* **Chi tiết kỹ thuật & Hướng dẫn bổ sung**:
  * **Hiện trạng**: [lesson.model.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/lessons/models/lesson.model.ts) có trường lưu Markdown (`content`), File đính kèm (`attachmentUrl`), và số thứ tự bài học (`order`).
  * **Hướng dẫn lập trình tiếp theo**:
    1. Bổ sung trường `duration: { type: Number, required: true, default: 0 }` (thời lượng tính theo phút) và `videoUrl: { type: String }` vào `LessonSchema`.
    2. Mở rộng `LessonsController` để khai báo luồng `POST` tạo bài học liên kết với `LessonsService.createLesson()`.

#### UC20: Chỉnh sửa/Nâng cấp bài học (Admin)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình tiếp theo**: Viết hàm `updateLesson(lessonId, data)` trong `LessonsService` để cập nhật tiêu đề, markdown content, duration và video URL.

#### UC21: Khóa/Mở khóa bài học (Admin)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình tiếp theo**: Thêm trường `isLocked: { type: Boolean, default: false }` vào `LessonSchema`. Nếu bài học ở trạng thái khóa, chặn học viên không được đọc trừ khi đã mở khóa thông qua việc hoàn thành các bài học trước đó.

#### UC22: Xóa bài học (Admin)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình tiếp theo**: Viết API `DELETE /api/v1/lessons/[id]` liên kết hàm `deleteLesson(id)` trong `LessonsService`.

#### UC23: Xem khóa học (Admin, Student, Guest)
* **Trạng thái**: ✅ **Đã hoàn thiện (Done)**
* **Mô tả kỹ thuật**: API `GET /api/v1/courses` tại `CoursesController.getCourses()` cho phép xem toàn bộ danh sách khóa học ở chế độ public, hỗ trợ phân trang (`page`, `limit`) và tìm kiếm văn bản đầy đủ.

#### UC24: Tìm kiếm/Lọc khóa học - Vector MongoDB (Student, Guest, Admin)
* **Trạng thái**: 🔶 **Một phần (Partial)**
* **Chi tiết kỹ thuật & Hướng dẫn bổ sung**:
  * **Hiện trạng**: Đang tìm kiếm cơ bản dựa trên Text Index của MongoDB thông qua toán tử `$text` tìm trên trường `title` khóa học.
  * **Hướng dẫn lập trình tiếp theo**: Để nâng cấp lên **Vector Search (Semantic Search)** trong MongoDB:
    1. Cần sử dụng thư viện embeddings (như OpenAI API hoặc HuggingFace) để chuyển tiêu đề + mô tả thành vector số thực.
    2. Lưu vector này vào trường `vectorEmbedding: [Number]` trong `CourseSchema`.
    3. Tạo chỉ mục Atlas Vector Search trên MongoDB Atlas.
    4. Thay câu lệnh truy vấn thông thường bằng stage `$vectorSearch` trong MongoDB Aggregation pipeline.

#### UC25: Xem bài học (Admin, Student)
* **Trạng thái**: ✅ **Đã hoàn thiện (Done)**
* **Mô tả kỹ thuật**: API `GET /api/v1/lessons/:id` tại `LessonsController.getLessonById()` cho phép lấy đầy đủ thông tin bài học theo ID bao gồm nội dung Markdown và URL file đính kèm.

---

### 📝 CHƯƠNG VI: QUẢN LÝ BÀI KIỂM TRA (UC26 - UC29)

Mã nguồn tại `src/modules/quiz/`.

#### UC26: Tạo Quiz (Admin)
* **Trạng thái**: ✅ **Đã hoàn thiện (Done)**
* **Mô tả kỹ thuật**: Hàm `QuizService.createQuiz()` lưu một bài Quiz thuộc về một bài học (`lessonId`), định nghĩa điểm thưởng XP khi pass (`xpReward`) và chứa danh sách các câu hỏi dạng trắc nghiệm có sẵn các lựa chọn và đáp án đúng.

#### UC27: Thêm câu hỏi (Admin)
* **Trạng thái**: 🔶 **Một phần (Partial)**
* **Chi tiết kỹ thuật & Hướng dẫn bổ sung**:
  * **Hiện trạng**: Đang đẩy câu hỏi trực tiếp khi tạo mới nguyên bài Quiz.
  * **Hướng dẫn lập trình tiếp theo**: Bổ sung hàm `addQuestionToQuiz(quizId, questionData)` trong `QuizService` sử dụng toán tử `$push` của Mongoose để đẩy một object câu hỏi mới vào mảng `questions` trong [quiz.model.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/quiz/models/quiz.model.ts).

#### UC28: Chỉnh sửa câu hỏi (Admin)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình tiếp theo**: Viết API cho phép cập nhật lại nội dung, các options hoặc vị trí đáp án đúng của một câu hỏi cụ thể dựa vào `questionId` (sử dụng toán tử cập nhật định vị phần tử mảng của MongoDB `$set: { "questions.$[elem]": ... }`).

#### UC29: Xóa câu hỏi (Admin)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình tiếp theo**: Viết API xóa một câu hỏi ra khỏi mảng `questions` (sử dụng toán tử `$pull` dựa trên `_id` của câu hỏi).

---

### 💎 CHƯƠNG VII: HỆ THỐNG GÓI DỊCH VỤ (UC30)

#### UC30: Phân cấp gói dịch vụ - Subscription/Plan Management (Admin)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình tiếp theo**:
  1. Tạo thư mục mới `src/modules/subscriptions/`.
  2. Định nghĩa [subscription.model.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/auth/models/user.model.ts) (hoặc ghép trực tiếp vào User model) các thuộc tính:
     ```typescript
     planType: { type: String, enum: ['FREE', 'PREMIUM'], default: 'FREE' },
     subscriptionExpiresAt: { type: Date }
     ```
  3. Viết middleware phân cấp `requirePremium` để chặn các route nâng cao (như Vector Search, xuất file AI report) nếu học viên chưa mua gói.

---

### 💎 CHƯƠNG VIII: STUDENT — GÓI & THÔNG BÁO (UC31 - UC32)

#### UC31: Mua gói tính năng (Student, Payment Gateway)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình tiếp theo**:
  1. Viết API POST `/api/v1/payments/create-checkout` kết nối cổng thanh toán (Stripe/VNPAY/Momo).
  2. Tạo cổng xử lý Webhook nhận thông báo thanh toán thành công từ phía nhà mạng. Khi nhận được tín hiệu thành công, chuyển đổi `planType` của học viên sang `PREMIUM` và gia hạn thêm 30 ngày.

#### UC32: Xem thông báo (Student, Admin, Notification System)
* **Trạng thái**: ✅ **Đã hoàn thiện (Done)**
* **Mô tả kỹ thuật**:
  * Các hàm nghiệp vụ nằm tại [notifications.service.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/notifications/services/notifications.service.ts).
  * Hỗ trợ lưu trữ database trên [notification.model.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/notifications/models/notification.model.ts) kết hợp đẩy tin nhắn thời gian thực qua **Socket.IO** bằng lệnh `io.to('user:id').emit('notification', ...)` khi học viên đạt thành tựu, thăng cấp hoặc xếp hạng thay đổi.

---

### 📈 CHƯƠNG IX: TIẾN ĐỘ HỌC TẬP (UC33)

#### UC33: Hoàn thành bài học & cập nhật tiến độ học tập (Student)
* **Trạng thái**: ✅ **Đã hoàn thiện (Done)**
* **Mô tả kỹ thuật**:
  * Xử lý tại [enrollments.service.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/enrollments/services/enrollments.service.ts) (`updateLessonProgress()`).
  * Hệ thống tự động đếm tổng số bài học của khóa đó, tính toán phần trăm hoàn thành, cập nhật vào bảng [enrollment.model.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/enrollments/models/enrollment.model.ts).
  * Nếu đạt `100%`, khóa học chuyển sang trạng thái đã hoàn tất (`completed = true`), và tự động thưởng **500 XP** cho học viên đồng thời ghi nhận vào [user-stats.model.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/gamification/models/user-stats.model.ts).

---

### 💬 CHƯƠNG X: COMMENT SYSTEM (UC34 - UC37)

#### UC34: Thêm comment trong lesson (Student)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình tiếp theo**:
  1. Tạo thư mục `src/modules/comments/`.
  2. Tạo model `CommentSchema` lưu trữ: `{ lessonId, userId, content, parentId, likes: [Schema.Types.ObjectId] }`.
  3. Viết `CommentsController` với API `POST /api/v1/comments`, dùng `JwtAuthGuard` kiểm tra bắt buộc đăng nhập, cho phép lưu nội dung thảo luận.

#### UC35: Trả lời comment (Student, Admin)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình tiếp theo**: Khi học viên reply một comment, gửi request kèm theo trường `parentId` chứa ID của comment gốc để thiết lập cây bình luận dạng lồng nhau.

#### UC36: Chỉnh sửa comment (Student, Admin)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình tiếp theo**: Viết API PUT `/api/v1/comments/[id]`. Cần kiểm tra quyền sở hữu: chỉ có chính chủ sở hữu bình luận đó mới được phép chỉnh sửa nội dung.

#### UC37: Xóa comment (Student, Admin)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình tiếp theo**: Viết API DELETE `/api/v1/comments/[id]`. Cần phân quyền: Cho phép Admin hoặc chính chủ sở hữu bình luận đó xóa bình luận.

---

### 🔖 CHƯƠNG XI: BOOKMARK & NOTE (UC38 - UC40)

#### UC38: Xem Bookmark bài học (Student)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình tiếp theo**: Tạo model `Bookmark` lưu `{ userId, lessonId, createdAt }` và API GET `/api/v1/bookmarks` lấy danh sách bài học đã đánh dấu của user hiện tại.

#### UC39: Lưu Bookmark bài học (Student)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình tiếp theo**: Viết API POST `/api/v1/bookmarks` cho phép lưu hoặc hủy (toggle) đánh dấu bài học.

#### UC40: Ghi chú (Note) trong lesson (Student)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình tiếp theo**:
  1. Tạo model `Note` lưu trữ: `{ userId, lessonId, noteText, codeSnippet, updatedAt }`.
  2. Viết các API CRUD `/api/v1/notes` giúp học viên ghi lại nội dung cốt lõi của bài học đó trực tiếp trên giao diện để xem lại bất cứ lúc nào.

---

### 🏆 CHƯƠNG XII: QUIZ & XP SYSTEM (UC41 - UC46)

#### UC41: Làm bài kiểm tra + tính thời gian làm bài (Student)
* **Trạng thái**: 🔶 **Một phần (Partial)**
* **Chi tiết kỹ thuật & Hướng dẫn bổ sung**:
  * **Hiện trạng**: Đã có luồng nộp bài và chấm điểm tự động.
  * **Hướng dẫn lập trình tiếp theo**:
    1. Bổ sung thuộc tính `timeLimit: { type: Number, default: 600 }` (giới hạn thời gian làm bài, đơn vị là giây) vào [quiz.model.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/quiz/models/quiz.model.ts).
    2. Khi bắt đầu làm bài, ghi nhận thời gian bắt đầu. Lúc nộp bài tại [quiz-attempts.service.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/quiz-attempts/services/quiz-attempts.service.ts), tính toán khoảng cách giây giữa lúc nộp và lúc bắt đầu. Nếu vượt quá `timeLimit` + thời gian bù sai số, tự động đánh trượt bài làm đó.

#### UC42: Chấm điểm Quiz (System)
* **Trạng thái**: ✅ **Đã hoàn thiện (Done)**
* **Mô tả kỹ thuật**: Hàm `QuizAttemptsService.submitAttempt()` tự động so khớp từng câu trả lời gửi lên với đáp án chuẩn lưu trong DB, tính toán phần trăm chính xác (Score) và lưu lại trạng thái Đạt hay Trượt vào [quiz-attempt.model.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/quiz-attempts/models/quiz-attempt.model.ts).

#### UC43: Xem kết quả Quiz (Student)
* **Trạng thái**: ✅ **Đã hoàn thiện (Done)**
* **Mô tả kỹ thuật**: Kết quả chấm điểm lập tức được đóng gói và gửi về client ngay trong payload phản hồi của API POST `/api/v1/quiz/submit`.

#### UC44: Tích lũy điểm kinh nghiệm - XP Engine (XP System)
* **Trạng thái**: ✅ **Đã hoàn thiện (Done)**
* **Mô tả kỹ thuật**:
  * Chạy tự động thông qua [gamification.service.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/gamification/services/gamification.service.ts) (`awardXP()`).
  * Điểm XP được tự động trao tặng khi pass Quiz (thưởng theo `xpReward` của Quiz) hoặc khi hoàn thành 100% khóa học (thưởng cố định **500 XP**).

#### UC45: Xem cấp độ người dùng + tự động thăng cấp khi đủ XP + gửi thông báo thăng cấp (Student)
* **Trạng thái**: ✅ **Đã hoàn thiện (Done)**
* **Mô tả kỹ thuật**:
  * Khi nhận được XP mới, hệ thống tính toán cấp độ động theo công thức bám sát thực tế: `level = Math.floor(xp / 1000) + 1`.
  * Trạng thái streak hoạt động hàng ngày cũng được cập nhật liên tục dựa vào chu kỳ 24 giờ kể từ hoạt động gần nhất.
  * Tự động lưu trữ thông báo và đẩy thời gian thực (realtime) qua Socket.IO để chúc mừng học viên thăng cấp.

#### UC46: Xem bảng xếp hạng - Leaderboard (Student, Admin)
* **Trạng thái**: ✅ **Đã hoàn thiện (Done)**
* **Mô tả kỹ thuật**:
  * Triển khai tối ưu hóa hiệu năng cao tại [leaderboard.service.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/leaderboard/services/leaderboard.service.ts).
  * Sử dụng cấu trúc dữ liệu **Redis Sorted Set** (`leaderboard:xp`) để xếp hạng tự động học viên theo XP.
  * Hỗ trợ đồng bộ hóa từ Database lên Redis qua hàm `syncLeaderboardToRedis()` và có cơ chế DB Aggregation fallback phòng ngừa trường hợp Redis bị ngắt kết nối.

---

### 🤖 CHƯƠNG XIII: AI FEATURES (UC47 - UC48)

Mã nguồn tại `src/modules/ai/`.

#### UC47: Gửi bài và yêu cầu AI Recommend (Student, AI System)
* **Trạng thái**: ✅ **Đã hoàn thiện (Done)**
* **Mô tả kỹ thuật**: API `POST /api/v1/ai/recommendation` tại `AIController.requestRecommendation()` nhận `courseId`. [ai.service.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/ai/services/ai.service.ts) (`requestRecommendation()`) tự động lập chu trình lộ trình cá nhân hóa dựa trên học lực hiện tại của học viên và lưu lại đầy đủ dữ liệu trao đổi vào [ai-history.model.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/ai/models/ai-history.model.ts).

#### UC48: Xem lịch sử Chat AI (Student, AI System)
* **Trạng thái**: ✅ **Đã hoàn thiện (Done)**
* **Mô tả kỹ thuật**: API GET trả về đầy đủ lịch sử tư vấn, gợi ý roadmap của học viên để họ có thể xem lại hoặc tiếp tục lộ trình học trước đó.

---

### ⏳ CHƯƠNG XIV: QUIZ HISTORY (UC49)

Mã nguồn tại `src/modules/quiz-attempts/`.

#### UC49: Xem lịch sử làm Quiz - Attempt History (Student)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình tiếp theo**:
  1. Thêm API Route `GET /api/v1/quiz/attempts` (hoặc `/api/v1/quiz/attempts/me`).
  2. Gọi tới hàm truy vấn lấy danh sách từ `QuizAttempt.find({ userId })` sắp xếp theo ngày nộp mới nhất `createdAt: -1` và trả về danh sách lịch sử điểm số, đáp án đã khoanh để học viên tự ôn tập.
