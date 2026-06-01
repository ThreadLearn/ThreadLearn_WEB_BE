# ThreadLearn Backend — Tài Liệu & Hướng Dẫn Triển Khai Use Case Final (53 UC)

Tài liệu này được biên soạn chi tiết dành riêng cho đội ngũ phát triển ThreadLearn Backend, phân chia cụ thể cho **4 Developer** phụ trách các cấu phần cốt lõi của hệ thống. Tài liệu giúp từng lập trình viên nắm bắt sâu sắc kiến trúc, hiểu rõ cách ánh xạ từ nghiệp vụ (Use Case) sang cấu trúc mã nguồn thực tế và nắm được các bước triển khai tiếp theo đối với các phần tính năng còn thiếu hoặc chưa hoàn thiện.

---

## 🛠️ Quy Ước Thiết Kế Hệ Thống & Path Aliases

Dự án sử dụng **NestJS** làm nền tảng API. Entry point là `src/main.ts`, root module là `src/app/app.module.ts`, realtime được triển khai bằng `@WebSocketGateway()` trong `src/socket/index.ts`.

Các lập trình viên lưu ý các quy ước sau:
1. **Path Aliases**: Sử dụng `@/` để import các tài nguyên thuộc thư mục `src/` (Ví dụ: `import { User } from '@/modules/auth/models/user.model'`). Tránh sử dụng relative import sâu (`../../../../`).
2. **Khung xử lý API NestJS**: Endpoint được khai báo trong controller bằng decorator như `@Controller()`, `@Get()`, `@Post()`. Xác thực dùng `JwtAuthGuard`, phân quyền dùng `@Roles()`, validate Zod dùng `ZodValidationPipe`, lỗi được gom qua `GlobalExceptionFilter`.
3. **Chuẩn Phản Hồi (`ApiResponse`)**: Mọi dữ liệu trả về client phải tuân theo format chuẩn quy định tại [api-response.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/common/api-response.ts).

---

## 👥 CHI TIẾT PHÂN CÔNG & CHỈ DẪN KỸ THUẬT TỪNG DEV

---

### 🔐 CHƯƠNG I: DEV 1 — Authentication, User Management, Dashboard, Payment & Notification (UC01 - UC14)

DEV 1 phụ trách phần lõi hệ thống, bao gồm xác thực, phân quyền (RBAC), quản lý tài khoản người dùng, thống kê quản trị, tích hợp hệ thống thanh toán và cấu trúc thông báo nền tảng.
*Thư mục làm việc chính: `src/modules/auth/`, `src/modules/users/`, `src/modules/admin/`, `src/modules/analytics/`*

#### UC01: Register Account (Guest)
* **Trạng thái**: ✅ **Đã hoàn thiện (Done)**
* **Mô tả kỹ thuật**: API `POST /api/v1/auth/register` nhận dữ liệu đăng ký. Trình tự:
  1. Zod schema [auth.validator.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/auth/validators/auth.validator.ts) xác thực dữ liệu đầu vào.
  2. [auth.service.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/auth/services/auth.service.ts) kiểm tra email trùng lặp trên DB.
  3. Băm mật khẩu bằng `bcryptjs` với độ muối là 10.
  4. Khởi tạo tài khoản trên Model [user.model.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/auth/models/user.model.ts) với vai trò mặc định là `STUDENT`.
  5. Khởi tạo bảng chỉ số cá nhân [user-stats.model.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/gamification/models/user-stats.model.ts) với `xp: 0` và `level: 1`.
  6. Sinh Access Token & Refresh Token, lưu Refresh Token vào [refresh-token.model.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/auth/models/refresh-token.model.ts) và trả về client.

#### UC02: Register with Google (Guest, Google OAuth System)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Mô tả kỹ thuật**: OAuth framework cũ đã được loại bỏ. DEV 1 cần triển khai lại bằng `@nestjs/passport` và `passport-google-oauth20`.
* **Hướng dẫn lập trình**:
  1. Tạo `GoogleStrategy` kế thừa `PassportStrategy` cấu hình Google Client ID & Secret.
  2. Viết Route GET `/api/v1/auth/google` kích hoạt login screen của Google.
  3. Viết Route GET `/api/v1/auth/google/callback` nhận profile trả về, kiểm tra nếu user chưa tồn tại thì tạo mới đồng thời khởi tạo `UserStats`. Sinh JWT tương tự UC01.

#### UC03: Verify Email (Guest, Email System)
* **Trạng thái**: 🔶 **Một phần (Partial)**
* **Hướng dẫn lập trình tiếp theo**:
  1. Thêm trường `isEmailVerified: { type: Boolean, default: false }` và `emailVerificationToken: { type: String }` vào [user.model.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/auth/models/user.model.ts).
  2. Viết Mailer Service sử dụng `nodemailer` tại `src/modules/mail/`.
  3. Khi đăng ký (UC01), sinh token ngẫu nhiên gán vào `emailVerificationToken`, gửi link xác nhận (dạng `http://localhost:3001/api/v1/auth/verify?token=...`) qua email.
  4. Viết API Route GET `/api/v1/auth/verify` tìm user chứa token khớp, chuyển `isEmailVerified = true` và xóa token.
  5. Trong hàm `login()`, nếu `isEmailVerified === false` thì chặn đăng nhập.

#### UC04: Log In (Student, Admin)
* **Trạng thái**: ✅ **Đã hoàn thiện (Done)**
* **Mô tả kỹ thuật**: API `POST /api/v1/auth/login` tiếp nhận email/password. [auth.service.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/auth/services/auth.service.ts) (`login()`) thực hiện so khớp mật khẩu bằng `bcrypt.compare()`, sinh Access/Refresh Tokens và lưu Refresh Token xuống DB.

#### UC05: Log In with Google (Student, Admin, Google OAuth System)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình**: Ghép chung luồng OAuth ở UC02. Nếu user đăng nhập bằng Google đã có tài khoản, hệ thống tự động trả về JWT Access Token & Refresh Token nội bộ để thiết lập phiên làm việc.

#### UC06: Log Out (Student, Admin, Authentication System)
* **Trạng thái**: ✅ **Đã hoàn thiện (Done)**
* **Mô tả kỹ thuật**: API `POST /api/v1/auth/logout` nhận Refresh Token. `AuthService.logout()` tiến hành xóa bản ghi Refresh Token tương ứng khỏi database để vô hiệu hóa lượt dùng và dọn dẹp phiên đăng nhập.

#### UC07: Forgot Password (Student, Admin, Email System)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình**:
  1. Tạo model `PasswordResetToken` lưu trữ `{ userId, token, expiresAt }`.
  2. Viết API POST `/api/v1/auth/forgot-password` nhận email.
  3. Sinh token ngẫu nhiên hết hạn sau 1 giờ, lưu vào DB và gửi email chứa liên kết reset mật khẩu kèm token đó cho người dùng.

#### UC08: Reset Password (Student, Admin, Authentication System)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình**:
  1. Viết API POST `/api/v1/auth/reset-password` nhận `{ token, newPassword }`.
  2. Kiểm tra token có hợp lệ và còn hạn trong DB hay không.
  3. Băm mật khẩu mới bằng `bcryptjs`, cập nhật `passwordHash` của User, sau đó xóa bản ghi Token trong DB.

#### UC09: Update Personal Profile / Upload Avatar (Student, Admin, Storage System)
* **Trạng thái**: ✅ **Đã hoàn thiện (Done)**
* **Mô tả kỹ thuật**: API `POST /api/v1/users/avatar` nhận avatar qua multipart Form-Data. Helper [upload.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/configs/upload.ts) lưu file tĩnh vào thư mục tĩnh `/public/uploads/avatars/` và [users.service.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/users/services/users.service.ts) cập nhật đường dẫn `avatarUrl` cho User.

#### UC10: Add Student (Admin)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình**:
  1. Viết hàm `createStudent(data)` trong `AdminService` chỉ cho phép quyền Admin truy cập.
  2. Băm mật khẩu ngẫu nhiên hoặc được chỉ định, tạo User mới với `role: 'STUDENT'`.
  3. Khởi tạo `UserStats` tương tự UC01 và gửi email thông tin tài khoản cho học viên.

#### UC11: Lock / Unlock Student (Admin)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình**:
  1. Thêm trường `isLocked: { type: Boolean, default: false }` vào [user.model.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/auth/models/user.model.ts).
  2. Viết hàm `toggleUserLock(userId)` lật giá trị cờ `isLocked`.
  3. Trong `JwtAuthGuard`, thêm logic kiểm tra trạng thái: nếu user đăng có `isLocked === true` thì lập tức từ chối và ném lỗi 403 Forbidden.

#### UC12: View Student List (Admin)
* **Trạng thái**: 🔶 **Một phần (Partial)**
* **Hướng dẫn lập trình tiếp theo**: Đã có logic phân trang `AdminService.listUsers(page, limit)`. DEV 1 cần bổ sung route `GET /api/v1/admin/users` trong `AdminController`, trang bị `@UseGuards(JwtAuthGuard)` và `@Roles('ADMIN')`.

#### UC13: Update Student Information (Admin)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình**: Viết hàm `updateUserByAdmin(userId, updateData)` tại `AdminService` và Route `PUT /api/v1/admin/users/:id` để thay đổi họ tên, quyền hạn (Student/Admin), trạng thái khóa.

#### UC14: View Statistics Charts (Admin, Analytics System)
* **Trạng thái**: 🔶 **Một phần (Partial)**
* **Mô tả kỹ thuật**: [analytics.service.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/analytics/services/analytics.service.ts) (`getPlatformStats()`) đã đếm tổng số học viên, khóa học, lượt enroll, lượt làm quiz, completion rate.
* **Hướng dẫn lập trình tiếp theo**: 
  1. Viết thêm các MongoDB aggregation pipelines để nhóm số lượng đăng ký học viên mới theo tuần/tháng nhằm phục vụ hiển thị biểu đồ đường (line chart) trên Dashboard.
  2. Tích hợp thống kê Doanh thu (sau khi có UC52).
  3. Phục vụ API Route qua `GET /api/v1/admin/stats` được gác cổng bởi Admin roles.

---

### 📚 CHƯƠNG II: DEV 2 — Course, Lesson & Learning Experience (UC15 - UC28)

DEV 2 phụ trách toàn bộ luồng nghiệp vụ liên quan đến học liệu, bao gồm quản lý thông tin Khóa học, Bài học, Tìm kiếm nâng cao thông qua MongoDB Vector Search, Tiến độ học tập và ghi danh học viên.
*Thư mục làm việc chính: `src/modules/courses/`, `src/modules/lessons/`, `src/modules/enrollments/`*

#### UC15: Add New Course (Admin)
* **Trạng thái**: 🔶 **Một phần (Partial)**
* **Hướng dẫn lập trình tiếp theo**:
  1. Cập nhật [course.model.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/courses/models/course.model.ts) bổ sung:
     ```typescript
     tags: [{ type: String, index: true }],
     level: { type: String, enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'], default: 'BEGINNER', index: true },
     language: { type: String, default: 'JavaScript', index: true },
     ```
  2. Viết API Route `POST /api/v1/courses/thumbnail` hỗ trợ upload ảnh bìa lưu tại `/public/uploads/courses/`.
  3. Hoàn thiện API `POST /api/v1/courses` gọi `CoursesService.createCourse()`.

#### UC16: Edit Course Information (Admin)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình**: Viết hàm `updateCourse(courseId, data)` trong `CoursesService` và xuất route `PUT /api/v1/courses/:id` cho phép cập nhật tiêu đề, mô tả, ảnh bìa, tags, level và language.

#### UC17: Hide / Show Course (Admin)
* **Trạng thái**: ✅ **Đã hoàn thiện (Done)**
* **Mô tả kỹ thuật**: Triển khai tại `AdminService.toggleCoursePublish()`. Khi khóa học chuyển `isPublished = false`, nó sẽ bị ẩn khỏi các luồng tìm kiếm và danh mục của học viên.

#### UC18: Delete Course (Admin)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình**: Thêm trường `isDeleted: { type: Boolean, default: false }` vào `CourseSchema`. Triển khai Soft Delete bằng cách chuyển cờ `isDeleted = true` trong API `DELETE /api/v1/courses/:id`, đồng thời cập nhật tất cả câu lệnh query khóa học để luôn lọc `{ isDeleted: false }`.

#### UC19: Add Lesson to Course (Admin)
* **Trạng thái**: 🔶 **Một phần (Partial)**
* **Hướng dẫn lập trình tiếp theo**:
  1. Sửa đổi [lesson.model.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/lessons/models/lesson.model.ts) bổ sung trường: `duration: { type: Number, required: true, default: 0 }` (thời lượng tính theo phút) và `videoUrl: { type: String }`.
  2. Viết Route API `POST /api/v1/lessons` trong `LessonsController` liên kết với `LessonsService.createLesson()`.

#### UC20: Edit / Upgrade Lesson (Admin)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình**: Viết API `PUT /api/v1/lessons/:id` gọi hàm `updateLesson(lessonId, data)` cập nhật markdown content, videoUrl, duration và thứ tự bài học (`order`).

#### UC21: Lock / Unlock Lesson (Admin)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình**: Thêm trường `isLocked: { type: Boolean, default: false }` vào `LessonSchema`. Viết logic tại `LessonsService`: học viên chỉ xem được bài học nếu bài đó được mở khóa hoặc các bài học trước đó trong lộ trình đã hoàn thành.

#### UC22: Delete Lesson (Admin)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình**: Viết API `DELETE /api/v1/lessons/:id` liên kết hàm `deleteLesson(id)` trong `LessonsService` để xóa bài học ra khỏi DB.

#### UC23: View Course Detail (Guest, Student, Admin)
* **Trạng thái**: ✅ **Đã hoàn thiện (Done)**
* **Mô tả kỹ thuật**: API `GET /api/v1/courses/:id` lấy chi tiết khóa học, bao gồm danh sách bài học liên kết được sắp xếp theo thứ tự `order` tăng dần.

#### UC24: Search / Filter Courses - MongoDB Vector Search (Guest, Student, Admin)
* **Trạng thái**: 🔶 **Một phần (Partial)**
* **Mô tả kỹ thuật**: Đang hỗ trợ tìm kiếm text search index đơn giản trên MongoDB thông qua toán tử `$text` tìm trên trường `title` khóa học.
* **Hướng dẫn lập trình tiếp theo**: Để nâng cấp lên **MongoDB Vector Search**:
  1. Dùng thư viện embeddings (như HuggingFace hoặc OpenAI) tạo vector số thực cho tiêu đề và mô tả khóa học.
  2. Lưu vector này vào trường `vectorEmbedding: [Number]` trong `CourseSchema`.
  3. Tạo chỉ mục Atlas Vector Search trên MongoDB Atlas.
  4. Thực hiện tìm kiếm ngữ nghĩa (Semantic Search) bằng Aggregation pipeline sử dụng stage `$vectorSearch`.
  5. Cho phép kết hợp lọc theo `level`, `language`, và `tags`.

#### UC25: View Lesson (Student, Admin, Guest if free lesson)
* **Trạng thái**: ✅ **Đã hoàn thiện (Done)**
* **Mô tả kỹ thuật**: API `GET /api/v1/lessons/:id` cho phép truy xuất thông tin bài học bao gồm tiêu đề, tài liệu đính kèm và nội dung Markdown của bài.

#### UC26: Enroll in Course (Student)
* **Trạng thái**: 🔶 **Một phần (Partial)**
* **Mô tả kỹ thuật**: Đã có hàm `EnrollmentsService.enrollInCourse(userId, courseId)` tạo mới bản ghi `Enrollment` và kiểm tra chống trùng lặp.
* **Hướng dẫn lập trình tiếp theo**: Viết Route API `POST /api/v1/enrollments` gác cổng bởi `JwtAuthGuard` để học viên có thể thực hiện đăng ký tham gia khóa học trực tiếp.

#### UC27: Complete Lesson (Student)
* **Trạng thái**: 🔶 **Một phần (Partial)**
* **Mô tả kỹ thuật**: Đã có hàm `EnrollmentsService.updateLessonProgress(userId, courseId, completedCount)`.
* **Hướng dẫn lập trình tiếp theo**: Viết Route API `POST /api/v1/enrollments/progress` nhận `courseId` và `completedLessonsCount` (hoặc tự tính toán dựa trên danh sách bài học đã đánh dấu hoàn thành) để trigger cập nhật tiến độ học tập và thưởng XP cho học viên.

#### UC28: Track Learning Progress (Student, System)
* **Trạng thái**: ✅ **Đã hoàn thiện (Done)**
* **Mô tả kỹ thuật**: Tiến độ được quản lý tự động thông qua trường `progress` (phần trăm) trên DB của bảng `Enrollment`. Khi tiến độ đạt `100%`, hệ thống tự chuyển cờ `completed = true` và thưởng **500 XP** cho học viên trên `UserStats`.

---

### 💬 CHƯƠNG III: DEV 3 — Comment, Bookmark, Note, IDE & AI Features (UC29 - UC35, UC44 - UC47, UC53)

DEV 3 chịu trách nhiệm lập trình các tính năng tương tác chuyên sâu, khu vực viết code (Monaco Editor & Judge0), kết nối OpenAI/AI System để gợi ý học tập và hệ thống thông báo Socket.IO thời gian thực.
*Thư mục làm việc chính: `src/modules/comments/`, `src/modules/bookmarks/`, `src/modules/notes/`, `src/modules/code-execution/`, `src/modules/ide/`, `src/modules/ai/`, `src/modules/notifications/`*

#### UC29: Add Comment in Lesson (Student)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình**:
  1. Tạo thư mục `src/modules/comments/`.
  2. Tạo model `Comment` lưu `{ lessonId, userId, content, parentId, likes: [Types.ObjectId] }`.
  3. Viết API POST `/api/v1/comments` yêu cầu đăng nhập, cho học viên bình luận thảo luận.

#### UC30: Reply to Comment (Student, Admin)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình**: Khi gửi comment, nếu có truyền `parentId` khớp với ID một comment cha đã tồn tại trong bài học đó, hệ thống sẽ lưu và xây dựng cấu trúc cây bình luận lồng nhau.

#### UC31: Edit Comment (Student, Admin)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình**: Viết API `PUT /api/v1/comments/:id` cho phép cập nhật nội dung bình luận. Cần kiểm tra chặt chẽ: chỉ có chính chủ bình luận đó mới được phép chỉnh sửa.

#### UC32: Delete Comment (Student, Admin)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình**: Viết API `DELETE /api/v1/comments/:id`. Cho phép người tạo comment hoặc Admin thực hiện xóa bình luận (áp dụng xóa vật lý hoặc soft delete cờ `isDeleted = true`).

#### UC33: View Lesson Bookmarks (Student)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình**:
  1. Tạo model `Bookmark` lưu trữ `{ userId, lessonId, createdAt }`.
  2. Viết API `GET /api/v1/bookmarks` trả về danh sách các bài học mà học viên hiện tại đã đánh dấu lưu trữ để tiện xem lại.

#### UC34: Save Lesson Bookmark (Student)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình**: Viết API `POST /api/v1/bookmarks` nhận `lessonId`. Nếu đã bookmark rồi thì xóa bỏ (un-bookmark), nếu chưa thì tạo bản ghi mới để đánh dấu bài học.

#### UC35: Add Note in Lesson (Student)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình**:
  1. Tạo model `Note` lưu trữ `{ userId, lessonId, noteText, codeSnippet }`.
  2. Thiết kế các API CRUD `/api/v1/notes` giúp học viên lưu trữ các dòng ghi chú cá nhân hữu ích cho từng bài học.

#### UC44: Run Code in IDE (Student, Code Execution System / Judge0)
* **Trạng thái**: ✅ **Đã hoàn thiện (Done)**
* **Mô tả kỹ thuật**: `CodeExecutionService.executeCode()` chuyển đổi mã nguồn và stdin sang Base64 để gửi tới Judge0 API Server (`/submissions?wait=true`). Nếu môi trường chưa cấu hình Judge0 API URL, hệ thống kích hoạt chế độ **Mock local fallback** để giả lập kết quả trả về, đảm bảo luồng phát triển không bị gián đoạn.

#### UC45: View Code Execution Output (Student, Code Execution System)
* **Trạng thái**: ✅ **Đã hoàn thiện (Done)**
* **Mô tả kỹ thuật**: API giải mã Base64 kết quả `stdout`/`stderr` nhận từ Judge0, đóng gói cùng các chỉ số tài nguyên như thời gian chạy (`time`) và bộ nhớ tiêu thụ (`memory`) rồi trả lại cho client hiển thị trực quan.

#### UC46: Submit Code and Request AI Recommendation (Student, AI System)
* **Trạng thái**: ✅ **Đã hoàn thiện (Done)**
* **Mô tả kỹ thuật**: API `POST /api/v1/ai/recommendation` nhận `courseId`. [ai.service.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/ai/services/ai.service.ts) gửi prompt tổng hợp học lực của học viên đến AI API để xây dựng lộ trình nâng cao học tập cá nhân hóa, đồng thời lưu lịch sử vào `ai-history.model.ts`.

#### UC47: View AI Chat / Analysis History (Student, AI System)
* **Trạng thái**: ✅ **Đã hoàn thiện (Done)**
* **Mô tả kỹ thuật**: API GET tại `AIController` giúp học viên lấy lại toàn bộ danh sách các lượt tư vấn, phân tích học tập và lịch sử chat AI đã thực hiện trước đó để tiếp tục theo dõi lộ trình.

#### UC53: View Notifications (Student, Admin, Notification System)
* **Trạng thái**: ✅ **Đã hoàn thiện (Done)**
* **Mô tả kỹ thuật**: API `GET /api/v1/notifications` thông qua `NotificationsService` tải toàn bộ các thông báo cá nhân hóa. Hệ thống hỗ trợ lưu trữ lâu dài dưới database và tự động bắn thông báo đẩy (push notifications) thời gian thực thông qua **Socket.IO** khi có các hoạt động như thăng cấp, đạt thành tựu, pass quiz hoặc thay đổi bảng xếp hạng.

---

### 🏆 CHƯƠNG IV: DEV 4 — Quiz, Quiz Runtime, Quiz History, Gamification, Leaderboard & Subscription (UC36 - UC43, UC48 - UC52)

DEV 4 chịu trách nhiệm toàn bộ hệ thống đánh giá năng lực (Quiz Engine), chấm điểm, lịch sử làm bài, các tính năng Gamification (thưởng XP, thăng cấp, streaks), bảng xếp hạng hiệu năng cao bằng Redis và hệ thống thanh toán nâng cấp tài khoản PREMIUM.
*Thư mục làm việc chính: `src/modules/quiz/`, `src/modules/quiz-attempts/`, `src/modules/gamification/`, `src/modules/leaderboard/`, `src/modules/subscriptions/`, `src/modules/payments/`*

#### UC36: Create Quiz (Admin)
* **Trạng thái**: ✅ **Đã hoàn thiện (Done)**
* **Mô tả kỹ thuật**: `QuizService.createQuiz()` cho phép khởi tạo một bài Quiz thuộc về một bài học (`lessonId`), thiết lập phần thưởng `xpReward` và lưu danh sách mảng các câu hỏi trắc nghiệm kèm đáp án chính xác.

#### UC37: Add Question (Admin)
* **Trạng thái**: 🔶 **Một phần (Partial)**
* **Hướng dẫn lập trình tiếp theo**: Hiện tại đang thêm câu hỏi hàng loạt lúc tạo mới Quiz. DEV 4 cần viết thêm API `POST /api/v1/quiz/:id/questions` gọi hàm `addQuestionToQuiz()` trong `QuizService` dùng toán tử `$push` để đẩy thêm một câu hỏi mới vào mảng `questions` của Quiz đang chạy.

#### UC38: Edit Question (Admin)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình**: Viết API `PUT /api/v1/quiz/:id/questions/:questionId` cho phép cập nhật nội dung câu hỏi, danh sách các tùy chọn hoặc vị trí đáp án đúng bằng cách dùng toán tử định vị phần tử mảng của MongoDB `$set: { "questions.$[elem]": ... }`.

#### UC39: Delete Question (Admin)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình**: Viết API `DELETE /api/v1/quiz/:id/questions/:questionId` gọi hàm `deleteQuestionFromQuiz()` dùng toán tử `$pull` để rút câu hỏi ra khỏi mảng `questions` của Quiz.

#### UC40: Take Quiz (Student)
* **Trạng thái**: 🔶 **Một phần (Partial)**
* **Mô tả kỹ thuật**: Đã có logic nộp bài chấm điểm `QuizAttemptsService.submitAttempt()`.
* **Hướng dẫn lập trình tiếp theo**: 
  1. Bổ sung trường `timeLimit: { type: Number, default: 600 }` (giới hạn thời gian làm bài, đơn vị là giây) vào [quiz.model.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/quiz/models/quiz.model.ts).
  2. Ghi nhận thời điểm bắt đầu làm bài. Khi nộp, tính thời gian thực hiện: `submittedAt - startedAt`. Nếu vượt quá `timeLimit` cộng sai số cho phép, tự động đánh trượt bài Quiz đó với điểm số là 0.

#### UC41: Grade Quiz (System)
* **Trạng thái**: ✅ **Đã hoàn thiện (Done)**
* **Mô tả kỹ thuật**: Xử lý tự động ở `QuizAttemptsService.submitAttempt()`. Hệ thống so khớp danh sách đáp án học viên chọn với đáp án chuẩn, tính tỷ lệ phần trăm chính xác làm điểm số, đánh dấu trạng thái Đạt hay Trượt và lưu lịch sử vào [quiz-attempt.model.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/quiz-attempts/models/quiz-attempt.model.ts).

#### UC42: View Quiz Result (Student)
* **Trạng thái**: ✅ **Đã hoàn thiện (Done)**
* **Mô tả kỹ thuật**: Payload trả về chứa đầy đủ phân tích chi tiết kết quả (số câu đúng/sai, điểm số đạt được, trạng thái Pass/Fail và phần thưởng XP nhận được nếu pass) lập tức được gửi ngược lại cho client ngay khi API nộp bài thành công.

#### UC43: View Quiz Attempt History (Student)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình**: Viết API `GET /api/v1/quiz/attempts/me` (gác cổng bởi `JwtAuthGuard`) truy xuất danh sách các lượt làm Quiz từ `QuizAttempt.find({ userId })` sắp xếp giảm dần theo thời gian làm bài (`createdAt: -1`).

#### UC48: Accumulate Experience Points - XP Engine (Student, XP System)
* **Trạng thái**: ✅ **Đã hoàn thiện (Done)**
* **Mô tả kỹ thuật**: Logic nằm tại `gamification.service.ts` (`awardXP()`). Hệ thống tự động cộng dồn XP cho học viên vào `UserStats` khi họ hoàn thành bài học/khóa học (thưởng 500 XP) hoặc vượt qua bài Quiz thành công (thưởng theo `xpReward` của Quiz).

#### UC49: View User Level (Student)
* **Trạng thái**: ✅ **Đã hoàn thiện (Done)**
* **Mô tả kỹ thuật**: `gamification.service.ts` tự động tính toán cấp độ theo công thức: `level = Math.floor(xp / 1000) + 1` bất cứ khi nào XP thay đổi. Nếu có thăng cấp, hệ thống tự động sinh thông báo chúc mừng lưu vào DB và đẩy thời gian thực qua socket.

#### UC50: View Leaderboard (Student, Admin)
* **Trạng thái**: ✅ **Đã hoàn thiện (Done)**
* **Mô tả kỹ thuật**: Bảng xếp hạng XP được triển khai tối ưu hóa bằng **Redis Sorted Set** (`ZADD` đồng bộ điểm số và `ZREVRANGEWITHSCORES` để lấy danh sách top đầu). Hệ thống tích hợp sẵn cơ chế DB Aggregation fallback phòng ngừa trường hợp máy chủ Redis xảy ra sự cố ngắt kết nối.

#### UC51: Manage Service Plans - Subscription / Plan Management (Admin, Payment System, Subscription System)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình**:
  1. Tạo thư mục `src/modules/subscriptions/`.
  2. Bổ sung vào User model các trường: `planType: { type: String, enum: ['FREE', 'PREMIUM'], default: 'FREE' }` và `subscriptionExpiresAt: { type: Date }`.
  3. Viết middleware gác cổng `requirePremium` để chặn truy cập của các tài khoản FREE đối với các tính năng nâng cao (như Vector Search, xuất file AI report, hoặc chat AI không giới hạn).

#### UC52: Purchase Feature Plan (Student, Payment Gateway)
* **Trạng thái**: ❌ **Chưa có (Missing)**
* **Hướng dẫn lập trình**:
  1. Viết API `POST /api/v1/payments/create-checkout` kết nối cổng thanh toán (Stripe/VNPAY/Momo).
  2. Viết Route Webhook `/api/v1/payments/webhook` tiếp nhận phản hồi giao dịch từ cổng thanh toán. Khi nhận được tín hiệu giao dịch thành công từ phía nhà mạng, tiến hành nâng cấp `planType = 'PREMIUM'` và cộng thêm 30 ngày sử dụng vào `subscriptionExpiresAt` của học viên đó.
