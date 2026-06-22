# DEV4 WORKFLOW — Quiz / Quiz-Attempts / Gamification / Leaderboard / Subscription

> **Cách dùng file này:** Đây là quy trình DEV4 đưa cho các AI khác làm theo.
> Mọi AI **bắt buộc** đọc `ThreadLearn_WEB_BE/ARCHITECTURE_RULES.md` trước (luật §0–§8).
> File này KHÔNG thay thế ARCHITECTURE_RULES — nó chỉ **đặt thứ tự + ràng buộc riêng cho DEV4** và đóng gói sẵn prompt để copy.
> Chuẩn vàng để copy: `src/modules/course/`. Khi phân vân → mở `course` ra chép, đừng tự nghĩ kiểu mới.

---

## 0. NGUYÊN TẮC VÀNG CHO MỌI TASK DEV4

1. **1 module / 1 lần. KHÔNG big-bang.** Xong module này, build xanh, grep sạch → mới sang module kế.
2. **Refactor = KHÔNG đổi hành vi.** Giữ nguyên API path + response shape (FE không được vỡ). Field legacy che ở mapper (ghi) + presenter (đọc), KHÔNG xoá.
3. **Tách 2 vai AI:** model A code (Prompt #1), model B nghiệm thu (Prompt #2). Không để model tự chấm bài mình.
4. **Side-effect (XP, leaderboard, notification) = event handler.** KHÔNG gọi thẳng trong use-case.
5. **Định nghĩa "xong" = §6 ARCHITECTURE_RULES chạy sạch.** Build xanh + 4 lệnh grep rỗng + dán kết quả ra. Còn 1 dòng grep → CHƯA xong.

---

## 1. THỨ TỰ LÀM (theo dependency — không được nhảy cóc)

```
B1. quiz            (UC36–39)  ── nền: question/quiz schema, mapper, entity. Module nhỏ nhất, set pattern.
B2. quiz-attempts   (UC40–43)  ── đọc question từ quiz để chấm. Đã half-done, chỉ làm sạch.
B3. gamification    (UC48–49)  ── XP engine + user level. Nhận event từ quiz-attempts.
B4. leaderboard     (UC50)     ── đọc stats từ gamification. REBUILD từ legacy phẳng.
B5. subscription    (UC51–52)  ── GREENFIELD. Plan CRUD + purchase flow. Độc lập, làm cuối.
```

Lý do thứ tự: quiz là gốc (quiz-attempts cần đọc câu hỏi/đáp án để chấm) → gamification tiêu thụ event `quiz.passed` → leaderboard đọc stats gamification → subscription độc lập nên để cuối, tránh chặn đường tới hạn.

**Mỗi bước Bn chạy đúng MICRO-WORKFLOW 6 bước ở §2.**

---

## 2. MICRO-WORKFLOW 6 BƯỚC (lặp cho TỪNG module)

> Áp y hệt cho cả refactor lẫn greenfield. Greenfield bỏ qua "giữ field legacy" vì không có legacy.

**Bước 1 — SOI (read-only).** Liệt kê mọi file của module + map sang layout chuẩn §1.1. Ghi rõ: file nào thiếu (entity? mapper? presenter? port Symbol?), file nào vi phạm §0/§1.3/§2. Output: bảng "file hiện có → đích". CHƯA sửa gì.

**Bước 2 — ĐỊNH HÌNH ĐÍCH.** Khai báo đúng cây thư mục §1.1 sẽ tạo:
`domain/entities` · `domain/interfaces/<x>.repository.ts` (+ Symbol token) · `domain/value-objects|services|events` (nếu cần) · `application/dto` (Zod) · `application/services/<verb>-<x>.service.ts` (1 use-case/1 file/1 `execute()`) · `application/events` (handler nếu có side-effect) · `infrastructure/persistence/mongo-<x>.repository.ts` · `infrastructure/mapper/<x>.mapper.ts` · `presentation/controller` (mỏng) · `presentation/response/<x>.presenter.ts`.

**Bước 3 — DOMAIN trước (trong → ngoài).** Viết Entity thuần (private ctor + `createNew()` + `fromPersistence()` + business rule là method + `toProps()`), Port interface + Symbol token, value-object/domain-service/event nếu có. **Domain KHÔNG import `@nestjs`, `mongoose`, `*.model`, `*.schema`, `application/`, `infrastructure/`, `presentation/`.**

**Bước 4 — INFRASTRUCTURE.** Mapper (`doc <-> entity`, nơi DUY NHẤT biết field legacy, ghi thì suy ra mirror) + Repository implements port bằng Mongoose (import model CHỈ ở đây, luôn trả Entity qua mapper).

**Bước 5 — APPLICATION + PRESENTATION.** DTO Zod → service per-UC (inject port qua token, gọi factory/method entity, KHÔNG đụng mongoose) → controller mỏng (ZodValidationPipe → 1 service → `ApiResponse.success`) → presenter (gom field legacy). Nối DI trong `*.module.ts`: `{ provide: X_REPOSITORY, useExisting: MongoXRepository }`, **export PORT** không export service lẻ.

**Bước 6 — SELF-CHECK §6 + DÁN KẾT QUẢ.** Chạy từ `ThreadLearn_WEB_BE/`:

```bash
npx tsc --noEmit
grep -rEl "from 'mongoose'|\.model'|\.schema'|@nestjs|presentation/" src/modules/<MOD>/domain && echo "❌ DOMAIN BẨN" || echo "✅"
grep -rEl "from 'mongoose'|\.model'|\.schema'" src/modules/<MOD>/application && echo "❌ APP CHẠM DB" || echo "✅"
grep -rEl "from 'mongoose'|\.model'" src/modules/<MOD>/presentation && echo "❌ CONTROLLER CHẠM DB" || echo "✅"
grep -rn "modules/.*model\|[A-Z][a-z]*Service" src/modules/<MOD> | grep -v "application/services" && echo "⚠️ KIỂM TRA COUPLING" || echo "✅"
```

Tất cả phải xanh/rỗng. Còn dòng đỏ → quay lại bước tương ứng, KHÔNG báo xong.

---

## 3. RÀNG BUỘC RIÊNG TỪNG MODULE (đọc kèm §2)

### B1 · quiz — UC36 CRUD Quiz / UC37 Add / UC38 Edit / UC39 Delete Question

Đây là module "nợ kỹ thuật" §1.3 — phải SỬA về chuẩn, KHÔNG nhân theo.

- `domain/ports/*.repository.interface.ts` → `domain/interfaces/quiz.repository.ts`.
- Token chuỗi `'IQuizRepository'` → `export const QUIZ_REPOSITORY = Symbol('QUIZ_REPOSITORY')` (+ sửa mọi `@Inject`).
- Port bỏ `import { IQuiz } from models` + bỏ `CreateQuizDto/QuestionDto` từ `presentation/` → nói Entity/type domain thuần.
- `quiz.facade.ts` bỏ gọi `Quiz.findByIdAndUpdate/findBy*` trực tiếp → đi qua repository.
- Thêm `infrastructure/mapper/quiz.mapper.ts` (doc↔entity). Repository trả Entity.
- Giữ `quiz.aggregate.ts` / `question.entity.ts` (đúng tinh thần domain) — chỉ làm sạch import.
- Giữ nguyên path controller + shape response.

### B2 · quiz-attempts — UC40 Take / UC41 Grade / UC42 Result / UC43 History

Đã có events + domain-service + handlers (đúng tinh thần) — chủ yếu làm sạch purity.

- `domain/ports/` → `domain/interfaces/`; token chuỗi → Symbol.
- Thêm `infrastructure/mapper/quiz-attempt.mapper.ts`; repository trả Entity (không trả doc thô).
- `quiz-grading.service.ts` giữ ở `domain/services` (logic chấm thuần, KHÔNG I/O).
- **UC41 Grade = chấm trong domain-service**, rồi use-case emit `quiz.passed` / `quiz-attempt.submitted`. KHÔNG gọi thẳng XP/leaderboard/notification ở use-case (đã có event-handler — giữ vậy).
- Đọc câu hỏi/đáp án để chấm: lấy QUA PORT của quiz đã `exports`, CẤM import `quiz/models/*`.

### B3 · gamification — UC48 Accumulate XP / UC49 View Level

- `models/` + `domain/ports/` + legacy `services/gamification-rewards.service.ts` → chuẩn 4 tầng.
- Tạo `domain/entities/user-stats.entity.ts` (XP, level, streak là business rule = method).
- `level-calculator.ts` → `domain/services/` (tính level thuần, KHÔNG I/O).
- `domain/ports/` → `domain/interfaces/` + Symbol token; thêm mapper + presenter.
- **UC48 XP = side-effect:** `AwardXpService` chỉ được gọi từ `application/events/*.handler.ts` nghe `quiz.passed`/`lesson.completed`. CẤM use-case khác gọi thẳng `AwardXpService`.
- Gỡ folder `services/` phẳng sau khi chuyển hết logic.

### B4 · leaderboard — UC50 View Leaderboard (REBUILD)

- Legacy phẳng (`controllers/` + `services/`) → dựng đủ 4 tầng theo `course`.
- Entity/ranking thuần ở `domain/services/` (sắp xếp/tính hạng KHÔNG I/O).
- Đọc XP/stats QUA PORT gamification đã `exports`. CẤM import `gamification/models/*`.
- Cập nhật bảng xếp hạng = `LeaderboardHandler` nghe event (đã có `leaderboard.event-handler.ts` ở quiz-attempts — nối vào), KHÔNG ghi trực tiếp trong use-case khác.

### B5 · subscription — UC51 Manage Service Plans / UC52 Purchase Feature Plan (GREENFIELD)

Dựng module MỚI từ đầu theo `course`, KHÔNG có legacy nên KHÔNG có field mirror.

- `modules/subscription/` đủ 4 tầng. Entity: `Plan` (UC51) + `Subscription`/`Purchase` (UC52).
- UC51 Admin CRUD plan: `@Roles('ADMIN')` đủ trên route ghi; DTO Zod đầy đủ.
- UC52 Purchase: use-case tạo bản ghi purchase + emit event; tích hợp payment gateway QUA PORT (`IPaymentGateway` interface ở domain, adapter ở infrastructure) — domain KHÔNG biết SDK cổng thanh toán.
- Kích hoạt quyền sau thanh toán = event handler (`payment.succeeded` → activate subscription). KHÔNG nhét logic cổng thanh toán vào controller.
- Path mới đặt theo convention `v1/...` như các module khác; thống nhất với FE trước khi chốt shape.

---

## 4. PROMPT #1 — GIAO CHO AI CODE (copy, điền chỗ [...])

```
Bạn đang làm BE dự án ThreadLearn (NestJS + Mongoose), vai DEV4.

BẮT BUỘC đọc và tuân thủ tuyệt đối:
- ThreadLearn_WEB_BE/ARCHITECTURE_RULES.md  (luật §0–§8)
- ThreadLearn_WEB_BE/DEV4_WORKFLOW.md        (thứ tự + ràng buộc riêng DEV4)

Chuẩn vàng để copy cấu trúc: src/modules/course/. Phân vân thì mở course ra chép, đừng tự nghĩ kiểu mới.

Nhiệm vụ lần này: module [TÊN MODULE] (bước [Bn] trong DEV4_WORKFLOW §1).
Làm theo đúng MICRO-WORKFLOW 6 bước (§2 DEV4_WORKFLOW) + RÀNG BUỘC RIÊNG của module này (§3).

Quy tắc cứng:
1. Áp §0–§4 ARCHITECTURE_RULES cho MỌI file. KHÔNG nhân lại lỗi §1.3.
2. Refactor = KHÔNG đổi hành vi. Giữ nguyên API path + response shape. Field legacy che ở mapper+presenter, KHÔNG xoá.
3. 1 service = 1 use-case = 1 execute(). Business rule nằm trong Entity, không nằm ở service. DB chỉ qua @Inject(token)+interface.
4. Side-effect (XP/leaderboard/notification) = event handler, KHÔNG gọi thẳng trong use-case.
5. Cross-module CHỈ qua port đã exports của module kia. CẤM import *.model / service nội bộ module khác.
6. Làm 1 module này thôi, KHÔNG đụng module khác.

TRƯỚC khi báo "xong": chạy hết §6 ARCHITECTURE_RULES (npx tsc --noEmit + 4 lệnh grep, thay <MOD>=[tên thư mục module]) và DÁN NGUYÊN kết quả ra.
Nếu grep còn ra dòng nào → CHƯA xong, sửa tiếp rồi chạy lại.

Bắt đầu từ Bước 1 (SOI, read-only): liệt kê file hiện có → map sang layout chuẩn, chỉ ra vi phạm. Xong mới sang bước 2.
```

---

## 5. PROMPT #2 — GIAO CHO AI NGHIỆM THU (model KHÁC, để bắt lỗi chéo)

```
Bạn nghiệm thu BE ThreadLearn. KHÔNG sửa code, chỉ soi và chấm.

Đọc: ThreadLearn_WEB_BE/ARCHITECTURE_RULES.md + ThreadLearn_WEB_BE/DEV4_WORKFLOW.md.

Soi module [TÊN MODULE] xem có vi phạm:
- §0 (7 luật vàng) — Dependency Rule một chiều, domain thuần, DB qua port, controller mỏng, cross-module qua port, side-effect=event, giữ path/shape.
- §1.3 (nợ cấm nhân) + §2 (bảng import được/cấm theo tầng).
- RÀNG BUỘC RIÊNG của module trong DEV4_WORKFLOW §3.

Chạy ĐÚNG 4 lệnh grep §6 (thay <MOD>=[tên thư mục]) + npx tsc --noEmit. DÁN NGUYÊN kết quả.

Trả về:
- PASS/FAIL từng mục (§0 từng luật, §1.3, §2, §3 ràng buộc riêng, §6 grep+build).
- Với mỗi FAIL: file:line cụ thể + lý do.
- KHÔNG khen chung chung. Chỉ kết luận PASS toàn bộ khi mọi grep rỗng và build xanh.
```

---

## 6. BẢNG TIẾN ĐỘ (AI tick khi xong, dev kiểm tra lại)

| Bước | Module | UC | Code (Prompt#1) | Nghiệm thu (Prompt#2) | §6 grep sạch | Build xanh |
|------|--------|-----|:---:|:---:|:---:|:---:|
| B1 | quiz | 36–39 | ☑ | ☑ | ☑ | ☑ |
| B2 | quiz-attempts | 40–43 | ☑ | ☑ | ☑ | ☑ |
| B3 | gamification | 48–49 | ☑ | ☐ | ☐ | ☐ |
| B4 | leaderboard | 50 | ☐ | ☐ | ☐ | ☐ |
| B5 | subscription | 51–52 | ☐ | ☐ | ☐ | ☐ |

> Quy tắc chốt: một bước chỉ được tick đủ khi Prompt#2 (model khác) trả PASS toàn bộ. Sau đó mới mở bước kế.
