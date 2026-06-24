# Phiếu phối hợp (Coordination Ticket) dành cho DEV2

**Mô tả:**
Sau khi hoàn tất tái cấu trúc (refactoring) module `gamification` theo Clean Architecture (Bước B3), class `GamificationRewardsService` và event bus tự chế cục bộ đã bị loại bỏ hoàn toàn.
Thay vào đó, module `gamification` đã chuyển sang sử dụng `@nestjs/event-emitter` (singleton toàn cục) để lắng nghe side-effects cộng điểm XP.

**Việc cần DEV2 thực hiện tại module `enrollments`:**

1. **Sử dụng `EventEmitter2` để phát Event**
   Thay vì gọi trực tiếp class `GamificationRewardsService` (điều này vi phạm nguyên tắc Dependency Inversion / module isolation), module `enrollments` cần inject `EventEmitter2` (có sẵn từ `@nestjs/event-emitter`) vào trong `EnrollmentsService` hoặc publisher của nó.
   - Khi hoàn thành bài học (lesson), phát event:
     ```typescript
     this.eventEmitter.emit('lesson.completed', { userId, courseCompleted });
     ```
   - Khi hoàn thành khóa học (course), phát event:
     ```typescript
     this.eventEmitter.emit('course.completed', { userId });
     ```

2. **Dọn dẹp code thừa**
   - **XÓA HOÀN TOÀN** file `src/modules/enrollments/application/events/gamification.handler.ts`. Module `enrollments` không được phép và không cần biết đến sự tồn tại của module `gamification`.
   - Lưu ý: Hiện tại file này đang được tôi (DEV4) tạm comment-out toàn bộ logic nội bộ để tránh làm vỡ build của dự án. Xin vui lòng xóa bỏ hẳn.

**Tác động (Impact):**
Việc tính toán XP khi kết thúc khóa học/bài học đang **bị gián đoạn** cho tới khi DEV2 hoàn tất phiếu phối hợp này. (Lưu ý: Đây không phải là regression từ phía Gamification, mà do luồng bus cũ trước đó vốn đã chết vì gọi vào một object `new DomainEventPublisher()` ảo).
Luồng cấp XP khi thi đậu Quiz vẫn hoạt động bình thường, không bị ảnh hưởng.
