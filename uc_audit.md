# ThreadLearn Backend — Bảng Đối Chiếu Use Case (49 UC)

## 📊 Thống Kê Tổng Quan

| Trạng thái | Số lượng | Tỷ lệ |
|---|---|---|
| ✅ **Đã hoàn thiện (Done)** | **22** | 45% |
| 🔶 **Một phần (Partial)** | **10** | 20% |
| ❌ **Chưa có (Missing)** | **17** | 35% |
| **Tổng số Use Case** | **49** | 100% |

---

## 📋 Danh Sách Chi Tiết 49 Use Case

### 🔐 1. Authentication (UC01 - UC09)

| UC | Mô tả | Trạng thái | Mã nguồn liên quan / Chỉ dẫn kỹ thuật |
|---|---|---|---|
| **UC01** | Đăng ký tài khoản (Guest) | ✅ Done | [auth.service.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/auth/services/auth.service.ts) (`register()`), [auth.controller.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/auth/controllers/auth.controller.ts) (`register()`), [route.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/app/api/v1/auth/register/route.ts) |
| **UC02** | Đăng ký bằng Google (Guest) | ✅ Done | [route.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/app/api/auth/%5B...nextauth%5D/route.ts) — Tự động lưu user mới vào MongoDB khi OAuth thành công |
| **UC03** | Đăng ký bằng thông tin + xác thực email | 🔶 Partial | **Có logic Đăng ký**, nhưng *thiếu* Email Verification System (Token verification & NodeMailer service) |
| **UC04** | Đăng nhập (Student, Admin) | ✅ Done | [auth.service.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/auth/services/auth.service.ts) (`login()`), [route.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/app/api/v1/auth/login/route.ts) |
| **UC05** | Đăng nhập bằng Google | ✅ Done | [route.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/app/api/auth/%5B...nextauth%5D/route.ts) (NextAuth Google Provider Setup) |
| **UC06** | Đăng nhập bằng Username/Password | ✅ Done | Sử dụng email/password tại [auth.service.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/auth/services/auth.service.ts) (`login()`) |
| **UC07** | Quên mật khẩu | ❌ Missing | *Thiếu*: Cần tạo model Token quên mật khẩu, Email Service, và API `/auth/forgot-password` |
| **UC08** | Đặt lại mật khẩu | ❌ Missing | *Thiếu*: API `/auth/reset-password` kiểm tra Token và hash mật khẩu mới |
| **UC09** | Cập nhật hồ sơ & Upload Avatar | ✅ Done | [users.controller.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/users/controllers/users.controller.ts), [upload.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/configs/upload.ts), [route.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/app/api/v1/users/avatar/route.ts) |

---

### 👨‍💼 2. Admin — Quản lý người dùng (UC10 - UC13)

| UC | Mô tả | Trạng thái | Mã nguồn liên quan / Chỉ dẫn kỹ thuật |
|---|---|---|---|
| **UC10** | Thêm Student (Admin) | ❌ Missing | *Thiếu*: Logic tạo Student thủ công từ giao diện Admin trong `AdminService` |
| **UC11** | Khóa/Mở khóa Student (Admin) | ❌ Missing | *Thiếu*: Cần thêm trường `isLocked` (Boolean) vào [user.model.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/auth/models/user.model.ts) và API toggle status |
| **UC12** | Xem danh sách Student (Admin) | 🔶 Partial | Đã có `AdminService.listUsers()` nhưng **chưa viết Route API** cho chức năng này |
| **UC13** | Cập nhật thông tin Student (Admin) | ❌ Missing | *Thiếu*: Logic update thông tin người dùng bởi Admin |

---

### 📊 3. Dashboard & Thống kê (UC14)

| UC | Mô tả | Trạng thái | Mã nguồn liên quan / Chỉ dẫn kỹ thuật |
|---|---|---|---|
| **UC14** | Xem biểu đồ thống kê | 🔶 Partial | Đã có [analytics.service.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/analytics/services/analytics.service.ts) (`getPlatformStats()`) đếm số lượng khóa học, bài học, tỷ lệ tương tác. *Thiếu*: Doanh thu (vì chưa có Premium), người dùng hoạt động theo thời gian, và chưa vẽ biểu đồ time-series. |

---

### 📚 4. Quản lý khóa học (UC15 - UC18)

| UC | Mô tả | Trạng thái | Mã nguồn liên quan / Chỉ dẫn kỹ thuật |
|---|---|---|---|
| **UC15** | Thêm khóa học mới (Tag, Level, Language, Cover) | 🔶 Partial | Đã có `CoursesService.createCourse()`. *Thiếu*: Các trường `tags[]`, `level`, `language` trong [course.model.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/courses/models/course.model.ts) và API upload file riêng cho thumbnail |
| **UC16** | Chỉnh sửa thông tin khóa học | ❌ Missing | *Thiếu*: Logic và endpoint update Course |
| **UC17** | Ẩn/Hiện khóa học | ✅ Done | [admin.service.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/admin/services/admin.service.ts) (`toggleCoursePublish()`) |
| **UC18** | Xóa khóa học | ❌ Missing | *Thiếu*: Khái niệm Soft Delete / Hard Delete cho khóa học |

---

### 📖 5. Quản lý bài học (UC19 - UC25)

| UC | Mô tả | Trạng thái | Mã nguồn liên quan / Chỉ dẫn kỹ thuật |
|---|---|---|---|
| **UC19** | Thêm bài học (Thời lượng, Markdown, Đính kèm, Video URL) | 🔶 Partial | Đã có `LessonsService.createLesson()` lưu Markdown và Attachment. *Thiếu*: Trường `duration`, `videoUrl` trong [lesson.model.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/lessons/models/lesson.model.ts) và **thiếu Route API POST** tạo bài học |
| **UC20** | Chỉnh sửa/Nâng cấp bài học | ❌ Missing | *Thiếu*: Endpoint và logic sửa bài học |
| **UC21** | Khóa/Mở khóa bài học | ❌ Missing | *Thiếu*: Trường `isLocked` trong Lesson model |
| **UC22** | Xóa bài học | ❌ Missing | *Thiếu*: Logic xóa bài học |
| **UC23** | Xem khóa học (Admin, Student, Guest) | ✅ Done | `CoursesService.listCourses()`, `getCourseDetail()` và [route.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/app/api/v1/courses/route.ts) |
| **UC24** | Tìm kiếm/Lọc khóa học | 🔶 Partial | Có tìm kiếm Text Index trong MongoDB. *Thiếu*: Vector Search và Lọc theo Tag, Level, Language |
| **UC25** | Xem bài học (Admin, Student) | ✅ Done | [lessons.service.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/lessons/services/lessons.service.ts) (`getLesson()`), [route.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/app/api/v1/lessons/%5Bid%5D/route.ts) |

---

### 📝 6. Quản lý bài kiểm tra - Quiz (UC26 - UC29)

| UC | Mô tả | Trạng thái | Mã nguồn liên quan / Chỉ dẫn kỹ thuật |
|---|---|---|---|
| **UC26** | Tạo Quiz (Admin) | ✅ Done | [quiz.service.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/quiz/services/quiz.service.ts) (`createQuiz()`) |
| **UC27** | Thêm câu hỏi | 🔶 Partial | Thêm câu hỏi trực tiếp lúc tạo Quiz. *Thiếu*: Endpoint push câu hỏi đơn lẻ vào Quiz đang chạy |
| **UC28** | Chỉnh sửa câu hỏi | ❌ Missing | *Thiếu*: Logic edit câu hỏi |
| **UC29** | Xóa câu hỏi | ❌ Missing | *Thiếu*: Logic xóa câu hỏi khỏi Quiz |

---

### 💎 7. Hệ thống gói dịch vụ (UC30)

| UC | Mô tả | Trạng thái | Mã nguồn liên quan / Chỉ dẫn kỹ thuật |
|---|---|---|---|
| **UC30** | Phân cấp gói dịch vụ | ❌ Missing | *Thiếu*: Cần tạo model Subscription Plan, lưu cấp độ gói của User |

---

### 💎 8. Student — Gói & Thông báo (UC31 - UC32)

| UC | Mô tả | Trạng thái | Mã nguồn liên quan / Chỉ dẫn kỹ thuật |
|---|---|---|---|
| **UC31** | Mua gói tính năng | ❌ Missing | *Thiếu*: Payment Gateway Integration (Stripe/Momo/VNPAY...) |
| **UC32** | Xem thông báo | ✅ Done | [notifications.service.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/notifications/services/notifications.service.ts), [route.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/app/api/v1/notifications/route.ts) |

---

### 📈 9. Tiến độ học tập (UC33)

| UC | Mô tả | Trạng thái | Mã nguồn liên quan / Chỉ dẫn kỹ thuật |
|---|---|---|---|
| **UC33** | Hoàn thành bài học & cập nhật tiến độ | ✅ Done | [enrollments.service.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/enrollments/services/enrollments.service.ts) (`updateLessonProgress()`), thưởng 500 XP khi hoàn thành 100% |

---

### 💬 10. Comment System (UC34 - UC37)

| UC | Mô tả | Trạng thái | Mã nguồn liên quan / Chỉ dẫn kỹ thuật |
|---|---|---|---|
| **UC34** | Thêm comment trong lesson | ❌ Missing | *Thiếu*: Module Comment (Model, Service, API) chưa được lập trình |
| **UC35** | Trả lời comment | ❌ Missing | *Thiếu*: Quan hệ cha-con (parentId) trong Model Comment |
| **UC36** | Chỉnh sửa comment | ❌ Missing | *Thiếu*: Logic cập nhật comment của chính chủ |
| **UC37** | Xóa comment | ❌ Missing | *Thiếu*: Logic soft/hard delete comment |

---

### 🔖 11. Bookmark & Note (UC38 - UC40)

| UC | Mô tả | Trạng thái | Mã nguồn liên quan / Chỉ dẫn kỹ thuật |
|---|---|---|---|
| **UC38** | Xem Bookmark bài học | ❌ Missing | *Thiếu*: Toàn bộ module Bookmark chưa triển khai |
| **UC39** | Lưu Bookmark bài học | ❌ Missing | *Thiếu*: API endpoint lưu trữ bài học đánh dấu |
| **UC40** | Ghi chú (Note) trong lesson | ❌ Missing | *Thiếu*: Model và API lưu Note cá nhân của từng bài học |

---

### 🏆 12. Quiz & XP System (UC41 - UC46)

| UC | Mô tả | Trạng thái | Mã nguồn liên quan / Chỉ dẫn kỹ thuật |
|---|---|---|---|
| **UC41** | Làm bài kiểm tra + tính thời gian | 🔶 Partial | Đã có `submitAttempt()`. *Thiếu*: `timeLimit` trong Quiz model và so sánh `startedAt`/`submittedAt` |
| **UC42** | Chấm điểm Quiz (Hệ thống) | ✅ Done | [quiz-attempts.service.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/quiz-attempts/services/quiz-attempts.service.ts) (`submitAttempt()`) |
| **UC43** | Xem kết quả Quiz (Student) | ✅ Done | Trả về ngay trong phản hồi của API `/quiz/submit` |
| **UC44** | Tích lũy điểm kinh nghiệm (XP System) | ✅ Done | Logic tự động cộng XP cho UserStats khi hoàn thành bài học / pass Quiz |
| **UC45** | Xem cấp độ + tự động thăng cấp + thông báo | ✅ Done | [gamification.service.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/gamification/services/gamification.service.ts), tự thăng cấp theo công thức: `level = floor(xp / 1000) + 1` |
| **UC46** | Xem bảng xếp hạng (Leaderboard) | ✅ Done | [leaderboard.service.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/leaderboard/services/leaderboard.service.ts), sử dụng **Redis Sorted Set** (`ZADD`, `ZREVRANGEWITHSCORES`) |

---

### 🤖 13. AI Features (UC47 - UC48)

| UC | Mô tả | Trạng thái | Mã nguồn liên quan / Chỉ dẫn kỹ thuật |
|---|---|---|---|
| **UC47** | Yêu cầu AI Recommend + Phản hồi | ✅ Done | [ai.service.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/ai/services/ai.service.ts) (`requestRecommendation()`), [route.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/app/api/v1/ai/recommendation/route.ts) |
| **UC48** | Xem lịch sử Chat AI | ✅ Done | [ai.service.ts](file:///d:/FPT_University_các%20kì/kì%208/WDP301/ThreadLearn_WEB_BE/src/modules/ai/services/ai.service.ts) (`getHistoryLogs()`) |

---

### ⏳ 14. Quiz History (UC49)

| UC | Mô tả | Trạng thái | Mã nguồn liên quan / Chỉ dẫn kỹ thuật |
|---|---|---|---|
| **UC49** | Xem lịch sử làm Quiz (Attempt History) | ❌ Missing | *Thiếu*: Endpoint GET danh sách attempt của từng Student |
