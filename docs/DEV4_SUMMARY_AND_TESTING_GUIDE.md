# DEV4 — HƯỚNG DẪN KIỂM THỬ CHI TIẾT (TESTING GUIDE & API CONTRACT)

> **Mục đích:** Tài liệu này cung cấp chi tiết tuyệt đối về toàn bộ API Routes thuộc phạm vi trách nhiệm của **DEV4** (Quiz, Quiz Attempts, Gamification, Leaderboard). 
> 
> Mọi Endpoint đều được ghi rõ:
> - **HTTP Method & Route Path**
> - **Header & Phân quyền (Role)**
> - **Route Params & Query Params**
> - **Cấu trúc Body Payload (Yêu cầu bắt buộc & Kiểu dữ liệu)**
> - **JSON Payload ví dụ mẫu**

---

## 0. CẬP NHẬT NHANH 2026-07-09

Các phần DEV4 đã được bổ sung/kiểm thử trong session gần nhất:

- FE đã merge Admin Plan CRUD, Admin Route Guard và Quiz Countdown Timer.
- BE đã merge service-flow tests cho Subscription UC51-UC52.
- BE có PR #69 đang mở để bổ sung verification/fix cho realtime XP + leaderboard:
  - `quiz.passed` có `attemptId`;
  - XP chỉ award một lần cho cùng một quiz attempt;
  - leaderboard cache invalidate sau event;
  - `/leaderboard/me` và top rankings đọc rank mới từ `UserStats`.

Lệnh verify BE đã chạy khi tạo PR #69:

```bash
npx jest src/modules/gamification/application/event-handlers/xp-leaderboard-flow.spec.ts --runInBand
npm test -- --runInBand
npm run build
npm run lint
```

---

## 1. CẤU HÌNH CHUNG
- **Base URL:** `http://localhost:5000`
- **Header bắt buộc:** 
  - `Content-Type: application/json`
  - `Authorization: Bearer <JWT_TOKEN>` (Token này lấy được sau khi gọi API `/api/v1/auth/login` bằng tài khoản Admin hoặc Student).

---

## 2. CHI TIẾT API CỦA CÁC USE CASE (UC)

### ─── LUỒNG 1: ADMIN QUẢN LÝ BÀI KIỂM TRA (UC36 - UC39) ───
*Yêu cầu Role: `ADMIN`*

#### 1. Tạo Quiz mới (UC36-1)
*   **Method:** `POST`
*   **Path:** `/api/v1/quiz`
*   **Chi tiết Payload Schema (Zod Validation):**
    - `lessonId` (String, Bắt buộc): ID của bài học chứa quiz.
    - `title` (String, Bắt buộc): Tiêu đề quiz (1 - 255 ký tự).
    - `description` (String, Tùy chọn): Mô tả ngắn về quiz.
    - `passingScorePercent` (Number, Mặc định 80): Điểm số % cần đạt để đậu (0 - 100).
    - `timeLimitSeconds` (Number, Tùy chọn): Thời gian giới hạn làm bài (giây, > 0).
    - `xpReward` (Number, Mặc định 100): Điểm kinh nghiệm thưởng khi đậu (> 0).
    - `questions` (Array, Bắt buộc, tối thiểu 1 câu): Mảng các câu hỏi, mỗi câu gồm:
        - `questionText` (String, Bắt buộc): Nội dung câu hỏi.
        - `options` (Array of Strings, Bắt buộc, 2 - 6 lựa chọn): Các phương án chọn.
        - `correctAnswerIndex` (Number, Bắt buộc, từ 0 đến options.length - 1): Index của đáp án đúng.
*   **Ví dụ Body (JSON):**
    ```json
    {
      "lessonId": "6a31f7f36e4e16e36fb5c5d7",
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

#### 2. Lấy danh sách tất cả các Quiz (UC36-5)
*   **Method:** `GET`
*   **Path:** `/api/v1/quiz`
*   **Params / Query:** Không có.
*   **Ví dụ Response thành công:**
    ```json
    {
      "success": true,
      "message": "Quizzes fetched successfully.",
      "data": [
        {
          "id": "6a3b9df49234bd4d6b40fce2",
          "title": "Test Bài Tập Mẫu",
          "lessonId": "6a31f7f36e4e16e36fb5c5d7",
          "passingScorePercent": 80,
          "xpReward": 150,
          "timeLimitSeconds": 300
        }
      ]
    }
    ```

#### 3. Lấy chi tiết một bài Quiz (UC36-3)
*   **Method:** `GET`
*   **Path:** `/api/v1/quiz/<QUIZ_ID>`
*   **Route Params:**
    - `QUIZ_ID` (String, Bắt buộc): ID của Quiz cần lấy (ví dụ: `6a3b9df49234bd4d6b40fce2`).
*   **Ví dụ Request:** `GET /api/v1/quiz/6a3b9df49234bd4d6b40fce2`

#### 4. Cập nhật thông tin Quiz (UC36-2)
*   **Method:** `PUT`
*   **Path:** `/api/v1/quiz/<QUIZ_ID>`
*   **Route Params:**
    - `QUIZ_ID` (String, Bắt buộc): ID của Quiz cần cập nhật.
*   **Chi tiết Payload Schema (Zod Validation - Toàn bộ các trường đều là Tùy chọn):**
    - `title` (String, Tùy chọn)
    - `description` (String, Tùy chọn)
    - `passingScorePercent` (Number, Tùy chọn, 0 - 100)
    - `timeLimitSeconds` (Number, Tùy chọn, > 0)
    - `xpReward` (Number, Tùy chọn, > 0)
    - `questions` (Array, Tùy chọn, cấu trúc giống lúc tạo)
*   **Ví dụ Body (JSON):**
    ```json
    {
      "title": "Test Bài Tập Mẫu Cập Nhật",
      "passingScorePercent": 70,
      "xpReward": 200
    }
    ```

#### 5. Xóa Quiz (UC36-4)
*   **Method:** `DELETE`
*   **Path:** `/api/v1/quiz/<QUIZ_ID>`
*   **Route Params:**
    - `QUIZ_ID` (String, Bắt buộc): ID của Quiz cần xóa.
*   **Ví dụ Request:** `DELETE /api/v1/quiz/6a3b9df49234bd4d6b40fce2`

#### 6. Thêm câu hỏi vào Quiz (UC37)
*   **Method:** `POST`
*   **Path:** `/api/v1/quiz/<QUIZ_ID>/questions`
*   **Route Params:**
    - `QUIZ_ID` (String, Bắt buộc): ID của Quiz cần thêm câu hỏi.
*   **Chi tiết Payload Schema (Zod Validation):**
    - `questionText` (String, Bắt buộc): Nội dung câu hỏi.
    - `options` (Array of Strings, Bắt buộc, 2 - 6 lựa chọn): Các phương án chọn.
    - `correctAnswerIndex` (Number, Bắt buộc, từ 0 đến options.length - 1): Index của đáp án đúng.
*   **Ví dụ Body (JSON):**
    ```json
    {
      "questionText": "HTTP Method nào dùng để cập nhật tài nguyên?",
      "options": ["GET", "POST", "PUT", "DELETE"],
      "correctAnswerIndex": 2
    }
    ```

#### 7. Sửa một câu hỏi trong Quiz (UC38)
*   **Method:** `PUT`
*   **Path:** `/api/v1/quiz/<QUIZ_ID>/questions/<QUESTION_ID>`
*   **Route Params:**
    - `QUIZ_ID` (String, Bắt buộc): ID của Quiz chứa câu hỏi.
    - `QUESTION_ID` (String, Bắt buộc): ID của câu hỏi cần sửa.
*   **Chi tiết Payload Schema (Zod Validation - Cần truyền ít nhất 1 trường):**
    - `questionText` (String, Tùy chọn)
    - `options` (Array of Strings, Tùy chọn, 2 - 6 lựa chọn)
    - `correctAnswerIndex` (Number, Tùy chọn)
*   **Ví dụ Body (JSON):**
    ```json
    {
      "questionText": "HTTP Method nào chuyên dùng cho cập nhật ghi đè toàn bộ tài nguyên?",
      "correctAnswerIndex": 2
    }
    ```

#### 8. Xóa câu hỏi khỏi Quiz - Hard Delete (UC39)
*   **Method:** `DELETE`
*   **Path:** `/api/v1/quiz/<QUIZ_ID>/questions/<QUESTION_ID>`
*   **Route Params:**
    - `QUIZ_ID` (String, Bắt buộc): ID của Quiz.
    - `QUESTION_ID` (String, Bắt buộc): ID của câu hỏi cần xóa.
    - *Lưu ý:* Hệ thống chặn không cho xóa nếu bài Quiz chỉ còn lại duy nhất 1 câu hỏi (giới hạn tối thiểu 1 câu).
*   **Ví dụ Request:** `DELETE /api/v1/quiz/6a3b9df49234bd4d6b40fce2/questions/6a31f7f46e4e16e36fb5c5ef`

---

### ─── LUỒNG 2: HỌC VIÊN LÀM BÀI & XEM KẾT QUẢ (UC40 - UC43) ───
*Yêu cầu Role: `STUDENT`*

#### 1. Lấy Quiz theo Bài học (UC40)
*Học viên lấy đề thi về làm. Toàn bộ các trường `correctAnswerIndex` (đáp án đúng) của các câu hỏi sẽ bị ẩn đi để chống lộ đề.*
*   **Method:** `GET`
*   **Path:** `/api/v1/quiz/lesson/<LESSON_ID>`
*   **Route Params:**
    - `LESSON_ID` (String, Bắt buộc): ID bài học liên kết với Quiz.
*   **Ví dụ Request:** `GET /api/v1/quiz/lesson/6a31f7f36e4e16e36fb5c5d6`

#### 2. Nộp bài Quiz & Chấm điểm tự động (UC41)
*   **Method:** `POST`
*   **Path:** `/api/v1/quiz/submit`
*   **Chi tiết Payload Schema (Zod Validation):**
    - `quizId` (String, Bắt buộc): ID của Quiz nộp bài.
    - `answers` (Record<String, Number>, Bắt buộc): Danh sách câu trả lời. 
      - *Hỗ trợ Cách 1 (Khuyên dùng):* Key là `questionId` (chuỗi ID), Value là index của lựa chọn (0, 1, 2...).
      - *Hỗ trợ Cách 2 (Legacy):* Key là thứ tự câu hỏi (như `"0"`, `"1"`), Value là index lựa chọn.
    - `startTime` (String ISO-8601 Datetime, Tùy chọn): Mốc thời gian bắt đầu làm bài để Backend kiểm tra xem có làm quá giờ giới hạn (timeLimitSeconds) hay không. Nếu không truyền, hệ thống sẽ bỏ qua bước check quá giờ.
*   **Ví dụ Body (JSON - Khuyên dùng):**
    ```json
    {
      "quizId": "6a31f7f46e4e16e36fb5c5ee",
      "answers": {
        "6a31f7f46e4e16e36fb5c5ef": 1,
        "6a31f7f46e4e16e36fb5c5f0": 2,
        "6a31f7f46e4e16e36fb5c5f1": 2
      }
    }
    ```
*   **Side-effect sau khi pass:**
    - Backend publish `quiz.submitted` cho mọi lần nộp.
    - Nếu bài đạt điểm pass, Backend publish thêm `quiz.passed`.
    - `quiz.passed` mang `attemptId`, `quizId`, `score`, `xpReward`.
    - Gamification handler xử lý event này để cộng XP.
    - Sau PR #69, XP quiz được chống double-award theo `attemptId`.

#### 3. Xem danh sách lịch sử các lần làm Quiz của bản thân (UC43)
*   **Method:** `GET`
*   **Path:** `/api/v1/quiz/attempts/me`
*   **Params / Query:** Không có.
*   **Ví dụ Response:** Trả về danh sách mảng các lần làm bài, xếp theo thời gian nộp mới nhất lên đầu.

#### 4. Xem chi tiết kết quả một lần làm bài (UC42)
*   **Method:** `GET`
*   **Path:** `/api/v1/quiz/attempts/<ATTEMPT_ID>`
*   **Route Params:**
    - `ATTEMPT_ID` (String, Bắt buộc): ID của bản ghi lượt làm bài (lấy ra từ danh sách lịch sử ở trên).
*   **Ví dụ Request:** `GET /api/v1/quiz/attempts/666fc123ab45cd67ef89012a`

---

### ─── LUỒNG 3: GAMIFICATION & XP ENGINE (UC48 - UC49) ───
*Yêu cầu Role: `STUDENT`*

#### 1. Xem Level, điểm XP, Streak tích lũy hiện tại (UC49)
*   **Method:** `GET`
*   **Path:** `/api/v1/gamification/stats`
*   **Params / Query:** Không có. (Tự nhận diện User thông qua JWT Token).
*   **Ví dụ Response thành công:**
    ```json
    {
      "success": true,
      "message": "Stats fetched.",
      "data": {
        "userId": "6a31f7f26e4e16e36fb5c58b",
        "xp": 1200,
        "level": 3,
        "streak": 5,
        "lastActive": "2026-06-24T12:00:00.000Z",
        "nextLevelXp": 1500,
        "progressPercent": 80
      }
    }
    ```

---

### ─── LUỒNG 5: SUBSCRIPTION / SERVICE PLANS (UC51 - UC52) ───

#### 1. Tạo gói dịch vụ mới (UC51)
*Yêu cầu Role: `ADMIN`*
*   **Method:** `POST`
*   **Path:** `/api/v1/subscription/plans`
*   **Body:**
    - `name` (String, bắt buộc, tối đa 120 ký tự)
    - `description` (String, tùy chọn, tối đa 1000 ký tự)
    - `price` (Number, bắt buộc, >= 0)
    - `currency` (String, tùy chọn, mặc định do domain xử lý)
    - `durationDays` (Number, bắt buộc, integer > 0)
    - `features` (Array<String>, tùy chọn)
    - `isActive` (Boolean, tùy chọn)
*   **Ví dụ Body:**
    ```json
    {
      "name": "Premium Monthly",
      "description": "Monthly premium access",
      "price": 99000,
      "currency": "VND",
      "durationDays": 30,
      "features": ["AI hints", "Premium lessons"]
    }
    ```

#### 2. Lấy danh sách gói dịch vụ (UC51)
*Yêu cầu JWT*
*   **Method:** `GET`
*   **Path:** `/api/v1/subscription/plans`
*   **Query Params:**
    - `includeInactive` (Boolean String, tùy chọn): truyền `true` để admin/debug xem cả plan đã deactivate.
*   **Ví dụ Request:** `GET /api/v1/subscription/plans?includeInactive=true`

#### 3. Lấy chi tiết một gói dịch vụ (UC51)
*Yêu cầu JWT*
*   **Method:** `GET`
*   **Path:** `/api/v1/subscription/plans/<PLAN_ID>`
*   **Route Params:**
    - `PLAN_ID`: Mongo ObjectId 24 ký tự hex.

#### 4. Cập nhật gói dịch vụ (UC51)
*Yêu cầu Role: `ADMIN`*
*   **Method:** `PUT`
*   **Path:** `/api/v1/subscription/plans/<PLAN_ID>`
*   **Body:** các field giống tạo plan, tất cả tùy chọn nhưng phải có ít nhất 1 field.

#### 5. Vô hiệu hóa gói dịch vụ (UC51)
*Yêu cầu Role: `ADMIN`*
*   **Method:** `DELETE`
*   **Path:** `/api/v1/subscription/plans/<PLAN_ID>`
*   **Ghi chú:** Đây là soft deactivate, không hard delete.

#### 6. Student mua gói dịch vụ (UC52)
*Yêu cầu Role: `STUDENT` hoặc user có JWT hợp lệ*
*   **Method:** `POST`
*   **Path:** `/api/v1/subscription/purchase`
*   **Body:**
    ```json
    {
      "planId": "64b7f3c2a1234567890abcde"
    }
    ```
*   **Response data chính:**
    - `id` / `_id`
    - `userId`
    - `planId`
    - `amount`
    - `currency`
    - `status`
    - `transactionId`
    - `paymentUrl`

#### 7. Webhook thanh toán (UC52)
*Dành cho payment gateway / mock gateway*
*   **Method:** `POST`
*   **Path:** `/api/v1/subscription/webhook/payment`
*   **Body:** record linh hoạt theo gateway adapter.
*   **Mock/service-flow fields thường dùng:**
    ```json
    {
      "purchaseId": "64b7f3c2a1234567890abcde",
      "transactionId": "64b7f3c2a1234567890abcde",
      "status": "success",
      "amount": "99000"
    }
    ```
*   **Side-effect:**
    - Webhook verified + amount đúng -> purchase `succeeded`.
    - Emit `payment.succeeded`.
    - Handler tạo mới hoặc gia hạn subscription active.
    - Retry webhook thành công cho cùng purchase không emit `payment.succeeded` lần 2.

#### 8. Lấy subscription hiện tại của user (UC52)
*Yêu cầu JWT*
*   **Method:** `GET`
*   **Path:** `/api/v1/subscription/my-subscription`
*   **Response data chính:**
    - `id` / `_id`
    - `userId`
    - `planId`
    - `status`
    - `startedAt`
    - `expiresAt`

---

## 3. CHECKLIST KIỂM THỬ THỦ CÔNG CHO DEV4

1. Admin login, tạo plan ở FE `/admin/plans`.
2. Student login, gọi mua plan, nhận `paymentUrl`.
3. Xử lý mock/webhook payment, kiểm tra `GET /api/v1/subscription/my-subscription` trả subscription active.
4. Student mở quiz có `timeLimitSeconds`, kiểm tra countdown hiển thị.
5. Làm quiz pass, kiểm tra response submit có `xpRewarded`.
6. Gọi `GET /api/v1/gamification/stats`, XP phải tăng.
7. Gọi `GET /api/v1/leaderboard/me`, rank/xp phải cập nhật.
8. Retry cùng webhook hoặc cùng event quiz attempt trong test không được cộng side-effect lần 2.

---

### ─── LUỒNG 4: BẢNG XẾP HẠNG - LEADERBOARD (UC50) ───
*Yêu cầu Role: `STUDENT` hoặc `ADMIN`*

#### 1. Xem danh sách Bảng xếp hạng Top (UC50)
*   **Method:** `GET`
*   **Path:** `/api/v1/leaderboard`
*   **Query Params:**
    - `limit` (Number String, Tùy chọn, Mặc định `"10"`): Số lượng user hiển thị trong bảng xếp hạng.
*   **Ví dụ Request:** `GET /api/v1/leaderboard?limit=5`

#### 2. Xem thứ hạng và thống kê cá nhân trên Bảng xếp hạng (UC50)
*   **Method:** `GET`
*   **Path:** `/api/v1/leaderboard/me`
*   **Params / Query:** Không có. (Tự động lọc hạng của user gửi request dựa trên JWT Token).
*   **Ví dụ Response thành công:**
    ```json
    {
      "success": true,
      "message": "Rank fetched.",
      "data": {
        "userId": "6a31f7f26e4e16e36fb5c58b",
        "name": "Nguyen Van A",
        "avatar": "/uploads/avatars/default.png",
        "xp": 1200,
        "rank": 4
      }
    }
    ```
