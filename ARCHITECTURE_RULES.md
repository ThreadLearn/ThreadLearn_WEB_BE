# ThreadLearn BE — ARCHITECTURE RULES (luật bắt buộc, đọc trước khi code)

> **Đối tượng:** mọi AI model / dev. Áp cho **cả 4 dev (DEV1, DEV2, DEV3, DEV4)** — đây là chuẩn DUY NHẤT của dự án.
>
> **Chuẩn vàng = module [`src/modules/course/`](./src/modules/course/).** Đây là code SẠCH NHẤT đang có.
> Khi phân vân: MỞ module này ra và copy y hệt. Không tự nghĩ kiểu mới.
>
> **KHÔNG dùng `commands/` / `queries/`** (check.txt cũ có, dự án bỏ).
> **KHÔNG nhân theo `quiz`/`quiz-attempts` hiện tại** — chúng đặt thư mục gần đúng nhưng còn rò Mongoose
> vào domain (§1.3). DEV4 phải sửa về chuẩn này, không phải ngược lại.
> `src/modules/courses/` (số nhiều) = legacy, bỏ qua.
>
> **Nếu bạn là model đọc file này:** áp §0→§4 cho MỌI file; xong thì chạy hết §6. Không đoán — copy skeleton §3.

---

## 0. NORTH STAR — đích duy nhất

Clean Architecture 4 tầng, **Dependency Rule một chiều**:

```
presentation  →  application  →  domain  ←  infrastructure
  (HTTP)           (use-case)      (lõi)       (Mongoose)
```

Tầng trong KHÔNG biết gì về tầng ngoài. `domain` là trái tim sạch, không ai ở trong nó được phụ thuộc ra ngoài.

**Luật vàng (vi phạm = SAI, không bàn):**

1. `domain/` KHÔNG import `@nestjs/*`, `mongoose`, `*.model.ts`, `*.schema.ts`, `application/`, `infrastructure/`, `presentation/`.
2. `application/` chỉ chạm DB **qua port** (`@Inject(X_REPOSITORY)` + interface). KHÔNG import Mongoose model/schema.
3. `infrastructure/` là nơi DUY NHẤT import `mongoose` + `*.model.ts`/`*.schema.ts`.
4. `presentation/` (controller) MỎNG: validate input → gọi **1** application service → trả `ApiResponse`.
5. **Cross-module:** chỉ qua **port/service đã `exports`** của module kia. CẤM import `*.model.ts`/service nội bộ của module khác.
6. **Side-effect** (XP, certificate, notification, leaderboard) = **event handler**, không gọi trực tiếp trong use-case.
7. **Giữ nguyên API path + response shape** cho FE. Field legacy che ở **mapper (ghi)** + **presenter (đọc)**, KHÔNG xoá.

---

## 1. TEMPLATE CHUẨN

### 1.1 Cấu trúc thư mục bắt buộc (theo `course`)

```
modules/<tên-số-ít>/
├── domain/                                  # THUẦN: không @nestjs, không mongoose, không model/schema
│   ├── entities/<x>.entity.ts               # class thuần: private ctor + factory + MỌI business rule + toProps()
│   ├── value-objects/<x>.vo.ts              # (optional) status/level/enum + helper thuần
│   ├── services/<x>.domain-service.ts       # (optional) logic thuần KHÔNG I/O (vd: chấm điểm, tính level)
│   ├── events/<x>.event.ts                  # (optional) object sự kiện domain
│   └── interfaces/<x>.repository.ts         # PORT: interface I<X>Repository + token Symbol
├── application/                             # điều phối use-case; biết domain — KHÔNG biết mongoose
│   ├── dto/<x>.dto.ts                       # Zod schema + type DTO (input/output)
│   ├── services/<verb>-<x>.service.ts       # 1 FILE = 1 USE-CASE, đúng 1 method execute()
│   └── events/<x>.handler.ts                # (Phase 4) handler cho side-effect
├── infrastructure/                          # nơi DUY NHẤT đụng mongoose
│   ├── persistence/mongo-<x>.repository.ts  # implements I<X>Repository; import model Ở ĐÂY
│   └── mapper/<x>.mapper.ts                 # doc <-> entity; NƠI DUY NHẤT biết field legacy (mirror khi GHI)
└── presentation/
    ├── controller/<x>.controller.ts         # MỎNG
    └── response/<x>.presenter.ts            # entity -> JSON FE; gom field legacy (mirror khi ĐỌC)
```

### 1.2 Trách nhiệm từng tầng (nhớ kỹ, đây là "linh hồn")

- **Entity (`domain/entities`)** = trái tim. `private constructor`; tạo qua factory `createNew()` (tạo mới, set default + validate) và `fromPersistence()` (mapper dựng lại). **Mọi business rule là method của entity** (publish guard, softDelete, restore window…). Lỗi nghiệp vụ ném bằng `DomainError.xxx(ErrorCode.YYY, msg)` từ [shared/errors](./src/shared/errors/error-codes.ts). Cho ra ngoài đọc bằng `toProps()` (snapshot bất biến).
- **Port (`domain/interfaces`)** = hợp đồng DB nói **ngôn ngữ domain** (nhận/trả Entity, không nhận `FilterQuery`, không trả Mongoose doc). Kèm token: `export const X_REPOSITORY = Symbol('X_REPOSITORY')`.
- **Application service** = 1 use-case. Inject port qua token. Gọi factory/method của entity rồi lưu qua repo. KHÔNG có nghiệp vụ "nặng" ở đây (đẩy vào entity), KHÔNG đụng mongoose.
- **Repository (`infrastructure/persistence`)** = implements port bằng Mongoose. Luôn trả **Entity** (qua mapper), không bao giờ trả doc thô ra ngoài.
- **Mapper (`infrastructure/mapper`)** = cầu `doc <-> entity`. **Nơi DUY NHẤT** biết field legacy; khi ghi thì suy ra mirror (vd `isPublished = status === 'published'`).
- **Presenter (`presentation/response`)** = entity → shape FE; gom field legacy 1 chỗ, không rải khắp service.
- **Controller** = parse DTO (ZodValidationPipe) → gọi 1 service → `ApiResponse.success(...)`. Auth bằng `@UseGuards/@Roles/@CurrentUser`, KHÔNG decode JWT tay.

### 1.3 ⚠️ NỢ KỸ THUẬT đang tồn tại — CẤM nhân theo, phải SỬA về chuẩn

| File                                                            | Lỗi                                                     | Phải thành                                                             |
| --------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------- |
| `quiz/domain/ports/quiz.repository.interface.ts`                | Port import `IQuiz` (Mongoose) + DTO từ `presentation/` | Port nói entity/type domain; KHÔNG import model/presentation           |
| `quiz/application/services/quiz.facade.ts`                      | Gọi thẳng `Quiz.findByIdAndUpdate` (bypass repo)        | Mọi truy cập DB qua `@Inject(token)` repo                              |
| `shared/application/learning-access/learning-access.service.ts` | Import `mongoose` + 4 model, dùng `static`              | Inject `ICourseRepository`/`ILessonRepository`/`IEnrollmentRepository` |
| `shared/domain/interfaces/learning-access.port.ts`              | Port `domain` import `ILesson` (Mongoose)               | Type thuần domain                                                      |

> DEV3 ĐƯỢC dùng `LearningAccessService` qua port `ILearningAccess` (API ổn định). KHÔNG copy cách nó đụng Mongoose. Sửa kernel là việc người giữ kernel.

---

## 2. Import được / cấm — theo tầng

| Tầng              | ĐƯỢC import                                                                 | CẤM import                                                                                         |
| ----------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `domain/`         | `shared/domain/*`, `shared/errors`, file domain cùng module                 | `@nestjs/*`, `mongoose`, `*.model`, `*.schema`, `application/`, `infrastructure/`, `presentation/` |
| `application/`    | `domain/*` (entity, port, token), `dto`, `shared/`, `@nestjs/common`        | `mongoose`, `*.model`, `*.schema`, `infrastructure/`, controller                                   |
| `infrastructure/` | `mongoose`, `*.model`/`*.schema`, `domain/*`, mapper                        | controller, application service                                                                    |
| `presentation/`   | `application/*`, `dto`, presenter, `common/*` (guard/decorator/ApiResponse) | `mongoose`, `*.model`, repository impl                                                             |

---

## 3. SKELETON copy-paste (đúng chuẩn `course`)

### 3.1 Entity — `domain/entities/<x>.entity.ts`

```ts
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';

export interface XProps {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'deleted'; /* ... */
}

export class XEntity {
  private constructor(private readonly props: XProps) {}

  static fromPersistence(props: XProps): XEntity {
    return new XEntity(props);
  } // mapper gọi

  static createNew(input: { title: string /* ... */ }): XEntity {
    // tạo mới
    if (!input.title?.trim())
      throw DomainError.badRequest(ErrorCode.X_INVALID_INPUT, 'title required.');
    return new XEntity({ id: '', title: input.title.trim(), status: 'draft' /* + default */ });
  }

  get id() {
    return this.props.id;
  }
  get status() {
    return this.props.status;
  }

  publish(): void {
    // business rule = method
    if (this.props.status !== 'draft')
      throw DomainError.badRequest(ErrorCode.X_NOT_PUBLISHABLE, '...');
    this.props.status = 'published';
  }

  toProps(): XProps {
    return { ...this.props };
  } // snapshot cho mapper/presenter
}
```

### 3.2 Port — `domain/interfaces/<x>.repository.ts`

```ts
import { XEntity } from '../entities/x.entity';
// CHỈ import domain/ + shared/. KHÔNG *.model, *.schema, presentation/.

export interface IXRepository {
  findById(id: string): Promise<XEntity | null>;
  create(entity: XEntity): Promise<XEntity>;
  update(entity: XEntity): Promise<XEntity>;
}
export const X_REPOSITORY = Symbol('X_REPOSITORY'); // DI token (Symbol — chống trùng/gõ nhầm)
```

### 3.3 Application service — `application/services/<verb>-<x>.service.ts`

```ts
import { Inject, Injectable } from '@nestjs/common';
import { XEntity } from '../../domain/entities/x.entity';
import { X_REPOSITORY, IXRepository } from '../../domain/interfaces/x.repository';
import { CreateXDto } from '../dto/x.dto';

/** UCxx — mô tả use-case. */
@Injectable()
export class CreateXService {
  constructor(@Inject(X_REPOSITORY) private readonly repo: IXRepository) {}
  async execute(input: CreateXDto): Promise<XEntity> {
    const x = XEntity.createNew(input); // nghiệp vụ ở entity, KHÔNG ở service
    return this.repo.create(x); // KHÔNG gọi XModel.* ở đây
  }
}
```

### 3.4 Repository — `infrastructure/persistence/mongo-<x>.repository.ts`

```ts
import { Injectable } from '@nestjs/common';
import { XModel } from '../../../<...>/models/x.model'; // import mongoose CHỈ Ở ĐÂY
import { XEntity } from '../../domain/entities/x.entity';
import { IXRepository } from '../../domain/interfaces/x.repository';
import { XMapper } from '../mapper/x.mapper';

@Injectable()
export class MongoXRepository implements IXRepository {
  async findById(id: string): Promise<XEntity | null> {
    const doc = await XModel.findById(id);
    return doc ? XMapper.toEntity(doc) : null; // luôn trả Entity
  }
  async create(entity: XEntity): Promise<XEntity> {
    const doc = await XModel.create(XMapper.toPersistence(entity));
    return XMapper.toEntity(doc);
  }
  async update(entity: XEntity): Promise<XEntity> {
    const doc = await XModel.findByIdAndUpdate(entity.id, XMapper.toPersistence(entity), {
      new: true,
    });
    return XMapper.toEntity(doc!);
  }
}
```

### 3.5 Mapper — `infrastructure/mapper/<x>.mapper.ts`

```ts
export class XMapper {
  static toEntity(doc: any): XEntity {
    return XEntity.fromPersistence({
      id: String(doc._id),
      title: doc.title,
      status: doc.status /* ... */,
    });
  }
  static toPersistence(entity: XEntity): Record<string, any> {
    const p = entity.toProps();
    return {
      title: p.title,
      status: p.status,
      isPublished: p.status === 'published', // legacy mirror — suy ra, KHÔNG phải nguồn sự thật
    };
  }
}
```

### 3.6 Presenter — `presentation/response/<x>.presenter.ts`

```ts
export class XPresenter {
  static toResponse(x: XEntity) {
    const p = x.toProps();
    return {
      _id: p.id,
      id: p.id,
      title: p.title,
      status: p.status,
      isPublished: p.status === 'published',
    }; // gom legacy 1 chỗ
  }
  static toList(xs: XEntity[]) {
    return xs.map((x) => XPresenter.toResponse(x));
  }
}
```

### 3.7 Controller + Module

```ts
@ApiTags('X')
@Controller('v1/...') // GIỮ NGUYÊN path cũ
export class XController {
  constructor(private readonly createX: CreateXService) {}
  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  async create(
    @Body(new ZodValidationPipe(createXSchema)) body: CreateXDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const x = await this.createX.execute({ ...body, createdBy: user.id });
    return ApiResponse.success({ message: '...', data: XPresenter.toResponse(x), statusCode: 201 });
  }
}

@Module({
  controllers: [XController],
  providers: [
    MongoXRepository,
    { provide: X_REPOSITORY, useExisting: MongoXRepository }, // nối port -> adapter
    CreateXService /* , 1 service / use-case */,
  ],
  exports: [X_REPOSITORY], // export PORT, KHÔNG export service lẻ
})
export class XModule {}
```

### 3.8 Cross-module (vd DEV3 dùng access control)

```ts
constructor(@Inject(LEARNING_ACCESS) private readonly access: ILearningAccess) {}   // ĐÚNG
await this.access.assertLessonInteractionAccess(lessonId, user);
// SAI: import LessonsService / lessons/models/*
```

---

## 4. SIDE-EFFECT = EVENT (Phase 4)

```ts
// complete-lesson.service.ts — chỉ update lõi rồi emit
await this.enrollmentRepo.markLessonComplete(...);
this.events.emit('lesson.completed', new LessonCompletedEvent(userId, lessonId, courseId));
// XP / certificate / notification / leaderboard nằm ở application/events/*.handler.ts
```

CẤM gọi thẳng `AwardXpService`/`CertificateService`… trong use-case hoàn thành bài.

---

## 5. AN TOÀN FE

Giữ nguyên route path + shape response. Field legacy che ở mapper (ghi) + presenter (đọc), KHÔNG xoá DB. Mọi response bọc `ApiResponse.success({ message, data, meta? })`. Gỡ/đổi legacy CHỈ ở Phase 7, sau khi FE chuyển trước.

---

## 6. SELF-CHECK trước khi báo "xong" (BẮT BUỘC)

Chạy từ `ThreadLearn_WEB_BE/`. Mỗi grep phải **rỗng** (trừ build).

```bash
npx tsc --noEmit                                                   # BUILD xanh

# domain KHÔNG dính mongoose/nest/model/schema/presentation
grep -rEl "from 'mongoose'|\.model'|\.schema'|@nestjs|presentation/" src/modules/*/domain && echo "❌ DOMAIN BẨN" || echo "✅"

# application KHÔNG import model/schema
grep -rEl "from 'mongoose'|\.model'|\.schema'" src/modules/*/application && echo "❌ APP CHẠM DB" || echo "✅"

# presentation KHÔNG đụng DB
grep -rEl "from 'mongoose'|\.model'" src/modules/*/presentation && echo "❌ CONTROLLER CHẠM DB" || echo "✅"

# module bạn (sửa <self>) KHÔNG import chéo module khác qua model/service
grep -rn "modules/lessons/.*model\|LessonsService" src/modules/<self> && echo "❌ COUPLING" || echo "✅"
```

**Checklist tay:**

- [ ] Mỗi service = 1 use-case, 1 `execute()`. Controller không có business logic / vòng lặp / if nghiệp vụ.
- [ ] Business rule nằm trong **Entity** (method/factory), không nằm ở service.
- [ ] DB chỉ qua `@Inject(X_REPOSITORY)` + interface. Repository trả Entity, không trả Mongoose doc.
- [ ] Field legacy chỉ xuất hiện ở mapper + presenter. Cross-module qua port đã `exports`.
- [ ] Path + shape response không đổi. Side-effect = event handler.

---

## 7. RULE THEO PHASE + DEFINITION OF DONE

> Sau MỖI module: `npx tsc --noEmit` xanh + smoke-test luồng học chính. **Không big-bang** — xong module này rồi sang module kế (PLAN §9).

### Phase 3 — Tách module 4 tầng + đảo chiều coupling

**DEV2:** `course`, `lesson`, `enrollment` về layout §1.1. **DEV3:** `comment`, `bookmark`, `note` về module mình + chuyển access sang `ILearningAccess`.

- [ ] Đủ 4 tầng đúng §1.1 (entity thuần, port + Symbol token, repo+mapper, controller mỏng, presenter).
- [ ] Service cũ "đụng model" → thay bằng port + `infrastructure/persistence`.
- [ ] Nested-route (`/lessons/:id/comments|bookmarks|notes|complete`) chuyển về controller **module sở hữu**; path GIỮ NGUYÊN.
- [ ] `lesson` KHÔNG còn import comment/bookmark/note/enrollment service hay model.
- [ ] DEV3: gỡ hết import `LessonsService`/`lessons/models/*`; access qua `ILearningAccess`.
- [ ] Self-check §6 xanh sạch.

### Phase 4 — Domain Events cho Enrollment

- [ ] `complete-lesson.service.ts` chỉ update Enrollment/Progress qua repo + emit `lesson.completed`/`course.completed`.
- [ ] `GamificationHandler`/`CertificatesHandler`/`NotificationsHandler`/`LeaderboardHandler` ở `application/events/`.
- [ ] Không còn gọi trực tiếp XP/cert/notif/leaderboard trong use-case. Test `course.completed` → cert + XP đúng.

### Phase 5 — Luồng Student (DEV2)

`UC24 search/filter → UC23 detail → UC26 enroll → UC25 view lesson → UC27 complete → UC28 progress`.

- [ ] Mỗi UC = 1 service mỏng + DTO + presenter + access qua port. Gộp 2 đường enroll trùng. Path/shape không đổi.

### Phase 6 — Admin Course/Lesson CRUD (UC15–22)

- [ ] DTO/validator đầy đủ; `@Roles('ADMIN')` đủ trên route ghi. Soft-delete đồng nhất (sửa `Section` hard-delete → soft).

### Phase 7 — Cleanup (làm CUỐI, cẩn thận FE)

- [ ] Chỉ `@deprecated` field legacy — CHƯA xoá khỏi response cho tới khi FE migrate xong.
- [ ] Bỏ manual JWT decode → `@CurrentUser()`. Xử lý premium `subscriptionExpiresAt = null`.

---

## 8. VIỆC RIÊNG TỪNG DEV (ngoài phần lõi §0–§6 dùng chung)

> Phần lõi §0–§6 + skeleton §3 áp cho **mọi dev, mọi module**. Mục này chỉ ghi việc đặc thù của từng người.
> Phạm vi theo PLAN §8. Mỗi dev xong việc của mình: `npx tsc --noEmit` xanh + §6 sạch.

### DEV1 — Notifications

Module `notifications` hiện còn layout legacy (`controllers/`, `services/`, `models/` phẳng). Việc:

- [ ] Nhân về 4 tầng theo §1.1: `domain/entities/notification.entity.ts` + `domain/interfaces/notification.repository.ts` (Symbol token) + `infrastructure/persistence/mongo-notification.repository.ts` + `infrastructure/mapper` + `presentation/controller` (mỏng) + `presentation/response/notification.presenter.ts`.
- [ ] Logic gửi/đọc/đánh-dấu-đã-đọc gom vào application service per-UC (`create-notification`, `mark-read`, `list-my-notifications`…).
- [ ] **Đăng ký `NotificationsHandler` ở `application/events/`** nghe `lesson.completed` / `course.completed` / `quiz.passed` (Phase 4) — KHÔNG để module khác gọi thẳng `NotificationsService`.
- [ ] Export PORT (hoặc service tạo notification) để các handler dùng; giữ path + shape response cho FE.

### DEV2 — Course / Lesson / Enrollment

- [ ] Theo §7 Phase 3 (4 tầng) → Phase 5 (luồng Student) → Phase 6 (Admin CRUD).
- [ ] `lesson` KHÔNG host route comment/bookmark/note/complete nữa (đẩy về module sở hữu — phối hợp DEV3).

### DEV3 — Comment / Bookmark / Note / IDE / AI

- [ ] Theo §7 Phase 3: nhân 4 tầng + nhận nested-route về module mình (path giữ nguyên).
- [ ] Mọi access-control qua `@Inject(LEARNING_ACCESS)` `ILearningAccess`; gỡ hết import `LessonsService`/`lessons/models/*`.

### DEV4 — Quiz / Quiz-Attempts / Gamification / Leaderboard / Subscription

> **Phạm vi:** UC36–43 (Quiz + làm bài + chấm + lịch sử), UC48–50 (XP / Level / Leaderboard), UC51–52 (Plan / Purchase).
> **Quy trình chi tiết + thứ tự + prompt giao AI:** xem [`DEV4_WORKFLOW.md`](./DEV4_WORKFLOW.md).
> **Thứ tự bắt buộc (theo dependency, không nhảy cóc):**
> `quiz → quiz-attempts → gamification → leaderboard → subscription`.
> 1 module/lần, build xanh + §6 grep sạch rồi mới sang module kế.

**B1 · quiz (UC36–39) — refactor, KHÔNG đổi hành vi.** Đây là nợ §1.3.

- [ ] `domain/ports/*.repository.interface.ts` → `domain/interfaces/*.repository.ts`.
- [ ] Token chuỗi `'IQuizRepository'` → Symbol `export const QUIZ_REPOSITORY = Symbol('QUIZ_REPOSITORY')` (+ sửa `@Inject`).
- [ ] Port bỏ import Mongoose `IQuiz` + DTO `presentation/` → dùng Entity/type domain thuần.
- [ ] `quiz.facade.ts` bỏ gọi `Quiz.findBy*` trực tiếp → đi qua repository.
- [ ] Thêm `infrastructure/mapper/quiz.mapper.ts` (doc↔entity); repository trả Entity. Giữ `quiz.aggregate.ts`/`question.entity.ts`, chỉ làm sạch import.

**B2 · quiz-attempts (UC40–43) — refactor purity.** Đã có events/domain-service/handler đúng tinh thần.

- [ ] `domain/ports/` → `domain/interfaces/`; token chuỗi → Symbol. Thêm `infrastructure/mapper/quiz-attempt.mapper.ts`; repo trả Entity.
- [ ] UC41 Grade: chấm trong `domain/services/quiz-grading.service.ts` (thuần, KHÔNG I/O) → use-case emit `quiz.passed`/`quiz-attempt.submitted`. KHÔNG gọi thẳng XP/leaderboard/notification.
- [ ] Đọc câu hỏi/đáp án để chấm QUA PORT `quiz` đã `exports`; CẤM import `quiz/models/*`.

**B3 · gamification (UC48–49) — refactor về 4 tầng.**

- [ ] Tạo `domain/entities/user-stats.entity.ts` (XP/level/streak = method). `level-calculator.ts` → `domain/services/` (thuần).
- [ ] `models/` + `domain/ports/` + `services/` phẳng → chuẩn §1.1; thêm mapper + presenter; Symbol token.
- [ ] UC48 XP là side-effect: `AwardXpService` CHỈ gọi từ `application/events/*.handler.ts` nghe `quiz.passed`/`lesson.completed`. CẤM use-case khác gọi thẳng.

**B4 · leaderboard (UC50) — REBUILD từ legacy phẳng.**

- [ ] Dựng đủ 4 tầng theo `course`. Ranking thuần ở `domain/services/` (KHÔNG I/O).
- [ ] Đọc XP/stats QUA PORT `gamification` đã `exports`; CẤM import `gamification/models/*`. Cập nhật bảng = `LeaderboardHandler` nghe event.

**B5 · subscription (UC51–52) — GREENFIELD theo `course` (không có legacy mirror).**

- [ ] `modules/subscription/` đủ 4 tầng. Entity `Plan` (UC51) + `Subscription`/`Purchase` (UC52).
- [ ] UC51 Admin CRUD plan: `@Roles('ADMIN')` đủ trên route ghi; DTO Zod đầy đủ.
- [ ] UC52 Purchase: cổng thanh toán qua port `IPaymentGateway` (domain) + adapter (infrastructure) — domain KHÔNG biết SDK. Kích hoạt quyền = handler nghe `payment.succeeded`.

> **Cách giao việc:** dùng Prompt #1 (§4 DEV4_WORKFLOW) cho model code, Prompt #2 (§5) cho model KHÁC nghiệm thu. Một bước chỉ chốt khi model nghiệm thu trả PASS toàn bộ + §6 grep rỗng.

### Kernel (Phase 1–2, lead + cả nhóm review)

- [ ] Sửa nợ §1.3: `LearningAccessService` bỏ `mongoose`/model + bỏ `static` → inject `ICourseRepository`/`ILessonRepository`/`IEnrollmentRepository`.
- [ ] `learning-access.port.ts` bỏ import `ILesson` (Mongoose) → type thuần domain.
- [ ] Xoá dead file `modules/courses/controllers/courses.controller.ts` (không module nào đăng ký).

---

## 9. TÓM TẮT 10 GIÂY

> Copy module `src/modules/course/`. Entity thuần giữ business rule (factory + method, no mongoose). Port ở `domain/interfaces` + Symbol token, nói ngôn ngữ domain. DB chỉ qua `@Inject(X_REPOSITORY)`. Repo trả Entity qua mapper; mapper+presenter là 2 nơi DUY NHẤT biết field legacy. Controller mỏng → 1 service → `ApiResponse`. Side-effect = event handler. Cross-module qua port đã export. Giữ path+shape cho FE. Xong thì chạy hết §6.
