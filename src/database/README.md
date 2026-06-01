# Database Seeding Utility Documentation

Thư mục này chứa cơ chế seeding dữ liệu mẫu (mock data) cho dự án ThreadLearn. Điều này giúp toàn bộ lập trình viên trong đội ngũ phát triển và kiểm thử dễ dàng tạo ra một cơ sở dữ liệu mẫu đồng bộ, đầy đủ cấu trúc chỉ bằng một câu lệnh duy nhất.

---

## 🚀 Cách Sử Dụng (Quick Start)

Hãy đảm bảo rằng bạn đã khởi động MongoDB (ví dụ qua Docker `docker-compose up -d` hoặc chạy MongoDB local) và cấu hình đúng địa chỉ `DATABASE_URL` trong file `.env`.

Sau đó, mở terminal tại thư mục gốc của backend và chạy lệnh sau:

```bash
npm run db:seed
```

---

## 🗑️ Cơ Chế Hoạt Động (How it works)

Khi bạn chạy lệnh seeder, kịch bản `src/database/seed.ts` sẽ thực hiện các bước sau:

1. **Khởi tạo kết nối**: Kết nối trực tiếp vào MongoDB thông qua hàm `connectToDatabase()` được cấu hình tại `src/configs/db.ts`.
2. **Xóa sạch dữ liệu cũ (Wipe out)**: Để tránh tình trạng trùng lặp dữ liệu (duplicate key errors) hoặc dữ liệu rác, hệ thống sẽ thực hiện xóa toàn bộ các bản ghi hiện tại của các collections core:
   - `User` & `UserStats`
   - `Course` & `Lesson`
   - `Quiz` & `QuizAttempt`
   - `Enrollment`
   - `RefreshToken`
   - `Notification`
   - `AIHistory`
3. **Mã hóa mật khẩu**: Sử dụng `bcryptjs` để hash mật khẩu thô của tài khoản mẫu nhằm đảm bảo hệ thống có thể đăng nhập khớp với cơ chế Authentication chuẩn.
4. **Tạo dữ liệu mới**: Khởi tạo cấu trúc dữ liệu theo đúng các mối quan hệ (references) của MongoDB Mongoose.
5. **Đóng kết nối**: Tự động giải phóng kết nối MongoDB sau khi hoàn tất.

---

## 📊 Dữ Liệu Mẫu Được Tạo (Seed Data Details)

### 1. Tài Khoản Đăng Nhập (Accounts)

| Vai Trò | Email Đăng Nhập | Mật Khẩu (Raw) | Thông Số Ban Đầu (UserStats) |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@threadlearn.com` | `Admin@123` | Level 5, 1500 XP, Streak 4 ngày, 12 bài thi hoàn thành |
| **STUDENT** | `student@threadlearn.com` | `Student@123` | Level 1, 0 XP, Streak 0 ngày, Starter stats |

### 2. Danh Mục Khóa Học (Courses & Lessons)

Kịch bản seed khởi tạo cấu trúc khóa học hoàn chỉnh bao gồm:

*   **HTML & CSS Foundations** (Trạng thái: `Published`)
    *   *Bài 1*: Introduction to HTML & Document Structure (Order 1)
    *   *Bài 2*: CSS Selectors & Cascade Ordering Rules (Order 2) — *Gắn kèm Quiz*
    *   *Bài 3*: Responsive Flexbox Layout Design (Order 3)
*   **JavaScript Programming Fundamentals** (Trạng thái: `Published`)
    *   *Bài 1*: Variables, Strict Typing & Truthy/Falsy Rules (Order 1)
    *   *Bài 2*: Array Methods, Map, Filter & Reduce Chains (Order 2)
    *   *Bài 3*: Asynchronous Code: Promises, Async/Await & Event Loop (Order 3) — *Gắn kèm Quiz*
*   **Advanced React & Redux Toolkit** (Trạng thái: `Draft` - Chưa xuất bản)

### 3. Bài Kiểm Tra Trắc Nghiệm (Interactive Quizzes)

*   **CSS Selectors Specifier Quiz** (Đính kèm tại Bài 2 của HTML/CSS):
    *   Điểm đạt: 80%
    *   Thời gian giới hạn: 5 phút (300 giây)
    *   Phần thưởng hoàn thành: 100 XP
    *   Nội dung: 3 câu hỏi trắc nghiệm về độ ưu tiên (Specificity), pseudo-class `:hover` và selector nâng cao.
*   **Advanced JavaScript Concurrency & Event Loop Quiz** (Đính kèm tại Bài 3 của JS):
    *   Điểm đạt: 66%
    *   Thời gian giới hạn: 7 phút (420 giây)
    *   Phần thưởng hoàn thành: 150 XP
    *   Nội dung: 3 câu hỏi nâng cao về cơ chế Microtask Queue, thứ tự in console log của Promise/setTimeout, và Event Loop.

### 4. Đăng Ký Học Thử Nghiệm (Starter Enrollments)

*   Học sinh mẫu (`student@threadlearn.com`) sẽ tự động được **đăng ký** vào khóa học **HTML & CSS Foundations** với tiến trình học hiện tại là **33%** (đã học xong bài 1). Điều này giúp UI Dashboard hiển thị ngay trạng thái tiến trình học khi vừa mới đăng nhập.

---

## 🛠️ Lưu Ý Dành Cho Nhà Phát Triển (Developer Notes)

*   Nếu bạn thêm model mới hoặc thuộc tính mới bắt buộc (`required: true`) vào schema, hãy nhớ cập nhật kịch bản seed tương ứng trong `src/database/seed.ts` để tránh lỗi phát sinh khi chạy.
*   Không nên chạy lệnh này trên môi trường Production vì nó sẽ xóa toàn bộ dữ liệu của người dùng thật. Lệnh chỉ dành riêng cho môi trường **development** hoặc **test**.
