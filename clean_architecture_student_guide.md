# Hướng dẫn Học tập & Nghiên cứu: Clean Architecture & DDD trong NestJS

Chào bạn! Chúc mừng bạn đã bước chân vào thế giới của **Kiến trúc Sạch (Clean Architecture)** và **Thiết kế hướng tên miền (Domain-Driven Design - DDD)**. Đây là những kỹ năng thiết kế phần mềm nâng cao giúp bạn xây dựng các hệ thống lớn, dễ bảo trì, dễ kiểm thử và có khả năng mở rộng tốt trong môi trường production thực tế.

Tài liệu này được biên soạn chi tiết dành riêng cho bạn để nghiên cứu sâu về dự án **ThreadLearn Backend Core**.

---

## 1. Cấu trúc Tổng quan của 3 Module dưới dạng Clean Architecture

Dưới đây là sơ đồ cây thư mục thực tế của 3 module mà bạn đang tiếp cận. Clean Architecture chia mã nguồn thành các lớp đồng tâm, với nguyên tắc bất di bất dịch: **Lớp bên trong KHÔNG ĐƯỢC PHÉP biết gì về lớp bên ngoài (Dependency Rule)**.

```
src/
├── shared/ (Shared Kernel)
│   ├── domain/ (Chứa các Class cơ sở dùng chung cho Core Nghiệp vụ)
│   │   ├── base.entity.ts           # Lớp cha cho tất cả Entity (có ID)
│   │   ├── aggregate-root.ts        # Lớp cha bảo vệ ranh giới giao dịch & chứa sự kiện
│   │   ├── value-object.ts          # Đối tượng bất biến không định danh (chỉ chứa giá trị)
│   │   ├── unique-id.vo.ts          # Value Object bọc định dạng ID (ObjectId của MongoDB)
│   │   └── result.ts                # Wrapper đóng gói kết quả thành công/thất bại sạch sẽ
│   └── infrastructure/
│       └── persistence/
│           └── mongo-transaction-manager.ts # Quản lý Transactions (Giao dịch DB)
│
└── modules/
    ├── quiz/ (Quản lý Quiz - Dành cho Giáo viên/Admin)
    │   ├── domain/
    │   │   ├── aggregates/
    │   │   │   └── quiz.aggregate.ts   # Aggregate Root bảo vệ tính toàn vẹn của câu hỏi
    │   │   ├── entities/
    │   │   │   └── question.entity.ts  # Thực thể Câu hỏi (có ID) nằm trong Quiz
    │   │   └── ports/
    │   │       └── quiz.repository.interface.ts # Interface (Cổng kết nối DB) do Domain định nghĩa
    │   ├── application/
    │   │   └── use-cases/              # Các chức năng cụ thể (Use Cases / Services)
    │   │       ├── commands/           # Các hành động ghi dữ liệu (Tạo, Sửa, Xóa)
    │   │       └── queries/            # Các hành động đọc dữ liệu (Lấy thông tin)
    │   └── infrastructure/
    │       └── persistence/
    │           ├── schemas/            # Cấu trúc DB MongoDB (Mongoose Schema)
    │           └── repositories/       # Hiện thực hóa chi tiết cách lưu xuống MongoDB
    │
    ├── quiz-attempts/ (Làm bài thi - Dành cho Học viên)
    │   ├── domain/
    │   │   ├── domain-services/
    │   │   │   └── quiz-grading.service.ts # Logic chấm điểm thuần túy (Không gọi Database)
    │   │   └── ports/
    │   │       └── quiz-attempt.repository.interface.ts
    │   ├── application/
    │   │   └── use-cases/              # Nộp bài, Xem lịch sử thi
    │   └── infrastructure/
    │       ├── event-handlers/         # Lắng nghe sự kiện để xóa cache bảng xếp hạng/gửi thông báo
    │       └── persistence/
    │
    └── gamification/ (Điểm số, Level & Streak - Hệ thống Gamification)
        ├── domain/
        │   ├── domain-services/
        │   │   └── level-calculator.ts # Công thức tính Level (Level = XP/1000 + 1)
        │   └── ports/
        │       └── user-stats.repository.interface.ts
        └── application/
            └── use-cases/              # Cộng XP, cập nhật chuỗi Streak hàng ngày
```

---

## 2. Những phần ĐÃ LÀM ĐƯỢC (Core Features)

Hệ thống hiện tại đã được cấu trúc lại hoàn chỉnh, chạy cực kỳ ổn định với các tính năng:
1. **Domain Isolation (Cô lập Nghiệp vụ)**: Các thực thể nghiệp vụ cốt lõi không bị phụ thuộc vào NestJS hay Mongoose (không sử dụng `@Injectable()` hay các annotation của DB trong file domain). Bạn có thể viết unit test cho các thực thể này bằng TypeScript thuần mà không cần chạy MongoDB hay khởi động server.
2. **Dependency Inversion (Đảo ngược phụ thuộc)**: Các Repositories ở tầng Application/Domain chỉ là các **Interface (Ports)**. Lớp Infrastructure viết code kết nối MongoDB cụ thể và tự động "cắm" (inject) vào Use Case nhờ cơ chế DI của NestJS.
3. **Pure Domain Grading (Chấm điểm thuần khiết)**: Logic chấm điểm và kiểm tra quá giờ (`QuizGradingService`) được tách biệt hoàn toàn khỏi I/O (không gọi DB, không phát sự kiện trực tiếp), giúp việc tính toán điểm số minh bạch, dễ viết test.
4. **Flat Event-Driven (Kiến trúc hướng sự kiện phẳng)**: Loại bỏ việc chaining sự kiện lồng nhau. Khi học viên thi đạt, sự kiện `QuizPassedEvent` phát ra, các handler (`NotificationEventHandler`, `LeaderboardEventHandler`) tự động bắt lấy độc lập và xử lý bất đồng bộ.
5. **Giao dịch nhất quán (Transactional consistency)**: Đảm bảo khi lưu bài thi thành công $\rightarrow$ cộng điểm XP thành công $\rightarrow$ cộng streak thành công. Nếu một bước lỗi, hệ thống tự động kích hoạt **Compensating Action (Manual Rollback)** để xóa bài thi bị lỗi, không để lại dữ liệu rác.

---

## 3. Những phần bạn NÊN TÌM HIỂU SÂU & HỌC TẬP

Để làm chủ kiến trúc này, bạn nên tập trung nghiên cứu 5 khái niệm cốt lõi sau:

### Khái niệm 1: Entities vs. Value Objects (DDD)
- **Entity**: Là đối tượng có danh tính duy nhất (Identity) và định danh đó không đổi theo thời gian (ví dụ: `Question` có ID câu hỏi, `QuizAttempt` có ID bài làm).
- **Value Object**: Là đối tượng chỉ biểu diễn thuộc tính, không cần định danh (ví dụ: `UniqueId`, hoặc một lớp `Address` chứa xã, huyện, tỉnh). Hai Value Object giống nhau khi mọi thuộc tính bên trong chúng giống nhau.

### Khái niệm 2: Aggregate Roots & Boundaries (DDD)
- Một **Aggregate** là một nhóm các đối tượng (Entities & Value Objects) đi cùng nhau và được quản lý bởi một đối tượng gốc gọi là **Aggregate Root**.
- Ví dụ: `Quiz` là Aggregate Root, còn `Question` là Entity con bên trong. Học viên không bao giờ được phép trực tiếp sửa đổi `Question` mà không thông qua các phương thức của `Quiz` (ví dụ: `quiz.addQuestion()`). Điều này giúp kiểm soát lỗi dữ liệu từ gốc.

### Khái niệm 3: Ports & Adapters (Kiến trúc Lục giác)
- **Port (Interface)**: Định nghĩa "Tôi cần những tính năng lưu trữ/giao tiếp nào?".
- **Adapter (Implementation)**: Triển khai chi tiết "Tôi sẽ dùng MongoDB/Mongoose/PostgreSQL để đáp ứng nhu cầu đó".
- *Bài học*: Giúp hệ thống không bị "khóa chặt" vào một loại cơ sở dữ liệu cụ thể.

### Khái niệm 4: Thiết lập Transactional Rollback trong MongoDB
- Khi chạy MongoDB offline ở máy cá nhân (Local), thường MongoDB chạy ở chế độ Single-Node (không có Replica Set) và sẽ không hỗ trợ Transactions của Mongo.
- Hãy tìm hiểu cách viết mã nguồn tự động Rollback thủ công trong khối `try/catch` của file [submit-attempt.service.ts](file:///d:/FPT_University_c%C3%A1c%20k%C3%AC/k%C3%AC%208/WDP301/ThreadLearn_WEB_BE/src/modules/quiz-attempts/application/services/submit-attempt.service.ts) để hiểu cách xử lý lỗi nghiệp vụ khi không dùng được Transaction của Database.

---

## 4. Các Công nghệ & Thư viện hỗ trợ trong dự án

Dưới đây là bản đồ công nghệ bạn cần trang bị:

1. **NestJS Framework**:
   * *Nội dung học*: Học về **Dependency Injection (DI)**, **Module**, và cách sử dụng **Pipes/Filters** để validate dữ liệu đầu vào.
   * *Tài liệu khuyên dùng*: [NestJS Official Documentation](https://docs.nestjs.com).
2. **Mongoose & MongoDB**:
   * *Nội dung học*: Cách ánh xạ các Schema, viết các câu lệnh Query phức tạp (như `$push`, `$pull` để cập nhật mảng con trong MongoDB).
   * *Tài liệu khuyên dùng*: [Mongoose Docs](https://mongoosejs.com).
3. **Jest Testing Framework**:
   * *Nội dung học*: Viết **Unit Tests** sử dụng Mocking (giả lập các Repository bằng `jest.fn()`).
   * *Tài liệu khuyên dùng*: Các test case mẫu tại [bugfix-regression.spec.ts](file:///d:/FPT_University_c%C3%A1c%20k%C3%AC/k%C3%AC%208/WDP301/ThreadLearn_WEB_BE/src/modules/bugfix-regression.spec.ts).
4. **Zod**:
   * *Nội dung học*: Cách định nghĩa schema để validate và kiểm soát kiểu dữ liệu của request HTTP gửi lên từ Client.

---

## 5. Luồng di chuyển dữ liệu mẫu để bạn nghiên cứu (Request Flow)

Khi một Client gửi yêu cầu nộp bài thi (`POST /quiz-attempts/submit`), hãy mở các file sau theo thứ tự để xem luồng chạy của code:

1. **Presentation Layer**: [quiz-attempts.controller.ts](file:///d:/FPT_University_c%C3%A1c%20k%C3%AC/k%C3%AC%208/WDP301/ThreadLearn_WEB_BE/src/modules/quiz-attempts/presentation/controller/quiz-attempts.controller.ts)
   * Tiếp nhận request HTTP, validate dữ liệu thông qua Zod Pipe.
2. **Application Layer (Use Case)**: [submit-attempt.service.ts](file:///d:/FPT_University_c%C3%A1c%20k%C3%AC/k%C3%AC%208/WDP301/ThreadLearn_WEB_BE/src/modules/quiz-attempts/application/services/submit-attempt.service.ts)
   * Gọi Repository Port để lấy thông tin Quiz Aggregate Root.
3. **Domain Layer (Domain Service)**: [quiz-grading.service.ts](file:///d:/FPT_University_c%C3%A1c%20k%C3%AC/k%C3%AC%208/WDP301/ThreadLearn_WEB_BE/src/modules/quiz-attempts/domain/services/quiz-grading.service.ts)
   * Thực hiện chấm điểm toán học thuần túy và trả về kết quả đạt/trượt.
4. **Infrastructure Layer**: [mongo-quiz-attempt.repository.ts](file:///d:/FPT_University_c%C3%A1c%20k%C3%AC/k%C3%AC%208/WDP301/ThreadLearn_WEB_BE/src/modules/quiz-attempts/infrastructure/persistence/repositories/mongo-quiz-attempt.repository.ts)
   * Lưu thực thể bài thi xuống MongoDB và bắn sự kiện bất đồng bộ để xóa cache và gửi thông báo.
