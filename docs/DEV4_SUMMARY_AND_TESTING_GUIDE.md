# DEV4 — BÁO CÁO TỔNG KẾT & HƯỚNG DẪN KIỂM THỬ (TESTING GUIDE)

> **Mục đích:** Tài liệu này tóm tắt toàn bộ công việc DEV4 đã hoàn thiện, nhận xét trạng thái kiến trúc hệ thống hiện tại và cung cấp kịch bản kiểm thử (Test Flow) chi tiết cho từng Use Case (UC) mà DEV4 đảm nhiệm.

---

## 1. TÓM TẮT NHỮNG VIỆC CHÍNH ĐÃ HOÀN THIỆN

Dựa trên luồng `DEV4_WORKFLOW.md` và `ARCHITECTURE_RULES.md`, các module dưới sự phụ trách của DEV4 đã được refactor/rebuild hoàn toàn sang chuẩn **Clean Architecture (4 tầng)**.

*   **B1: Quiz (UC36–39)**
    *   **Trạng thái:** ✅ Đã hoàn thiện.
    *   **Chi tiết:** Xử lý triệt để nợ kỹ thuật. Đã gỡ bỏ sự phụ thuộc vào Mongoose (`IQuiz`) ra khỏi tầng Domain. Các Port đã sử dụng `Symbol` token. Repo được chuẩn hóa để luôn trả về Entity.
*   **B2: Quiz Attempts (UC40–43)**
    *   **Trạng thái:** ✅ Đã hoàn thiện.
    *   **Chi tiết:** Đã phân tách luồng "làm bài" và "chấm điểm". Việc chấm điểm (UC41) được đưa vào Domain Service (`quiz-grading.service.ts`) thuần túy, không chứa I/O. Sau khi nộp bài, hệ thống kích hoạt sự kiện (`quiz.passed`) qua Event Publisher.
*   **B3: Gamification (UC48–49)**
    *   **Trạng thái:** ✅ Đã hoàn thiện.
    *   **Chi tiết:** Xóa bỏ hoàn toàn folder `services/` phẳng cũ. Đã xây dựng **Rich Domain Model** cho `UserStats` (logic cộng XP, tính Streak, tăng Level đều nằm trong Entity). Sửa cầu nối Event để lắng nghe `quiz.passed` từ module `quiz-attempts` thông qua global `EventEmitter2`.
*   **B4: Leaderboard (UC50)**
    *   **Trạng thái:** ✅ Đã hoàn thiện.
    *   **Chi tiết:** Đã **rebuild** từ cấu trúc phẳng. Đọc dữ liệu XP qua Port của module Gamification thay vì import chọc thẳng model. Logic xếp hạng là pure function. Bảng xếp hạng được làm mới (cache invalidate) tự động thông qua Event Handler.
*   **B5: Subscription (UC51–52)**
    *   **Trạng thái:** ⏳ Pending (Greenfield).
    *   **Chi tiết:** Các Use Case về gói dịch vụ hiện chưa được implement và sẽ là mục tiêu phát triển mới hoàn toàn tiếp theo.

---

## 2. NHẬN XÉT HỆ THỐNG HIỆN TẠI (SYSTEM ASSESSMENT)

Hệ thống của các module DEV4 quản lý hiện tại **cực kỳ sạch sẽ, linh hoạt và đáp ứng đúng 100% các tiêu chí khắt khe nhất** của ThreadLearn:

1.  **Sự thuần khiết của Lõi (Domain Purity):** Lệnh `grep` chạy qua thư mục `domain/` trả về kết quả rỗng hoàn toàn. Tầng lõi nghiệp vụ không hề biết đến NestJS, Mongoose hay HTTP. Điều này giúp code logic cực kỳ dễ viết Unit Test.
2.  **Giao tiếp liên Module an toàn (Cross-module ACL):** Trước đây các module hay import thẳng Model của nhau dễ sinh ra vòng lặp (circular dependency). Hiện tại, Leaderboard lấy data của Gamification, Gamification cập nhật điểm từ Quiz-Attempts... **TẤT CẢ đều đi qua Interface Port**.
3.  **Kiến trúc hướng Sự kiện (Event-Driven):** Thay vì sau khi nộp Quiz hệ thống phải tuần tự gọi hàm cấp XP -> gọi hàm cập nhật bảng xếp hạng -> gọi hàm gửi thông báo (dễ gây chậm API và lỗi dây chuyền), hệ thống hiện tại chỉ đơn giản "bắn" ra 1 event `quiz.passed`. Các Module Gamification và Leaderboard tự động "nghe" và chạy ngầm (Side-effects).
4.  **Tương thích ngược (Backward Compatibility):** Dù code bên dưới thay đổi kiến trúc toàn diện, API route (v1/...) và cấu trúc JSON trả về cho Frontend vẫn được giữ nguyên y hệt, thông qua Data Mapper và Presenter.

---

## 3. HƯỚNG DẪN KIỂM THỬ TỪNG USE CASE (TEST FLOW)

Để kiểm chứng các flow trên thực tế (qua Postman/Swagger), bạn có thể làm theo các bước sau:

### Chuẩn bị chung:
*   Đăng nhập tài khoản **Admin** và **Student** qua API Login để lấy `Bearer Token`.
*   Lắp Token này vào Header (Authorization) cho các request dưới đây.

### Luồng 1: Admin quản lý bài kiểm tra (UC36 - UC39)
*   **Mục tiêu:** Kiểm tra Entity Quiz và hệ thống DB CRUD mượt mà không.
*   **Hành động:**
    1.  **Tạo Quiz mới** (`POST /api/v1/quiz` - Admin Token).
        *   **Payload (JSON):**
            ```json
            {
              "lessonId": "<NHẬP_MỘT_LESSON_ID_CÓ_SẴN>",
              "title": "Test Bài Tập Mẫu",
              "description": "Quiz kiểm thử hệ thống DEV4",
              "passingScorePercent": 80,
              "timeLimitSeconds": 300,
              "xpReward": 150,
              "questions": [
                {
                  "questionText": "NestJS sử dụng ngôn ngữ mặc định nào?",
                  "options": ["Java", "TypeScript", "Python", "C#"],
                  "correctAnswerIndex": 1
                }
              ]
            }
            ```
        *   *Lưu lại `id` của Quiz vừa tạo (gọi là `<QUIZ_ID>`).*
    2.  **Thêm Question** (`POST /api/v1/quiz/<QUIZ_ID>/questions` - Admin Token).
        *   **Payload (JSON):**
            ```json
            {
              "questionText": "HTTP Method nào dùng để cập nhật tài nguyên?",
              "options": ["GET", "POST", "PUT", "DELETE"],
              "correctAnswerIndex": 2
            }
            ```
    3.  **Lấy chi tiết Quiz** (`GET /api/v1/quiz/<QUIZ_ID>` - Admin Token) để đảm bảo câu hỏi đã được thêm.

### Luồng 2: Học viên làm bài và xem kết quả (UC40 - UC43)
*   **Mục tiêu:** Test hệ thống nộp bài (UC40), chấm điểm tự động (UC41) và xem lịch sử (UC42-43).
*   **Hành động:**
    1.  **Học viên nộp bài** (`POST /api/v1/quiz/submit` - Student Token).
        *   **Payload (JSON):**
            ```json
            {
              "quizId": "<QUIZ_ID>",
              "answers": {
                "0": 1,
                "1": 2
              },
              "startTime": "2026-06-24T00:00:00.000Z"
            }
            ```
            *(Lưu ý: Key của `answers` là thứ tự câu hỏi (index 0, 1...), value là index của đáp án học viên chọn).*
    2.  **Kiểm tra Response:** Đảm bảo hệ thống trả về điểm số (`score`: 100), trạng thái đậu/rớt (`passed`: true), và lượng XP nhận được (`xpRewarded`: 150).
    3.  **Kiểm tra lịch sử:** Gọi `GET /api/v1/quiz/attempts/me`. Phải thấy bài kiểm tra vừa làm xuất hiện trong danh sách. Lấy `<ATTEMPT_ID>` để gọi `GET /api/v1/quiz/attempts/<ATTEMPT_ID>` xem chi tiết.

### Luồng 3: Hệ thống XP và Level (UC48 - UC49)
*   **Mục tiêu:** Kiểm tra Event `quiz.passed` có kích hoạt Gamification thành công không.
*   **Hành động:**
    1.  Sau khi Student thi **Đậu** (Passed) bài Quiz ở Luồng 2.
    2.  Gọi `GET /api/v1/gamification/stats/me`.
    3.  **Kiểm tra Response:** Lượng XP hiện tại phải được cộng thêm đúng bằng `xpRewarded` của bài Quiz. Nếu đủ XP, Level sẽ tự động tăng lên. (Logic Rich Domain Model hoạt động).

### Luồng 4: Bảng xếp hạng - Leaderboard (UC50)
*   **Mục tiêu:** Kiểm tra sự bắt tay giữa Gamification và Leaderboard Cache.
*   **Hành động:**
    1.  Gọi `GET /api/v1/leaderboard` (lấy danh sách Top).
    2.  Gọi `GET /api/v1/leaderboard/me` (lấy hạng của bản thân).
    3.  **Kiểm tra:** Xem tài khoản Student vừa nhận XP ở Luồng 3 có leo hạng thành công trong danh sách hay không. Đảm bảo dữ liệu (name, avatar, xp) được format chính xác bởi Presenter.

### Luồng 5: Gói dịch vụ - Subscription (UC51 - UC52)
*   *Ghi chú:* Module này là bước B5 (Greenfield) và chưa được phát triển trong chu kỳ refactor này. Sẽ tiến hành xây dựng 4 tầng từ đầu trong giai đoạn tới.
