# DEV3 Code Flow & QA Audit — ThreadLearn

**Ngày audit:** 2026-07-28  
**Phạm vi:** UC29, UC30, UC31, UC32, UC33, UC34, UC35, UC44, UC45, UC46, UC47, UC53  
**Chế độ:** Chỉ phân tích và kiểm thử; không sửa business code, không commit/push/merge.

## PHẦN 1 — Bối cảnh và phạm vi

ThreadLearn dùng NestJS/Mongoose ở Backend; Next.js/React/TanStack Query ở Frontend; Monaco, Judge0, AI provider và Socket.IO cho các luồng nâng cao.

Actor thực tế:

- `STUDENT`: comment/reply/edit/delete theo ownership; bookmark/note riêng; IDE, AI và notification của chính mình.
- `ADMIN`: bypass enrollment để comment/moderate; notification Admin riêng; được dùng code execution/AI theo implementation. Admin không có API xem bookmark, note, code history hoặc AI history của Student khác.
- Judge0, AI provider và Socket.IO là external/runtime dependency.

Kết luận sớm: implementation đã có đủ module và UI chính, nhưng chưa đủ điều kiện Accepted do hai lỗi High và nhiều lỗi concurrency, retention, history-detail, token-refresh và unread-count.

## PHẦN 2 — Repository và phiên bản code

| Thành phần | Repository audit | Branch | Commit | Develop đối chiếu |
|---|---|---|---|---|
| Backend | `C:\ThreadLearn\course-management-be` | `feature/dev3-completion` | `8f7b238 fix(dev3): close interaction acceptance gaps` | Tree giống `origin/develop` tại merge `c495542` |
| Frontend | `C:\ThreadLearn\course-management-fe` | `feature/dev3-completion` | `cbcf857 fix(dev3): complete interaction and history flows` | Tree giống `upstream/develop` tại merge `918a558` |

Hai repository audit sạch trước và sau khi chạy test. Không đụng thay đổi của người dùng:

- `C:\ThreadLearn\ThreadLearn_WEB_BE`: branch `develop`, commit `2508bfd`, đang `behind 2`, có `package-lock.json` modified.
- `C:\ThreadLearn\ThreadLearn_WEB_FE`: branch `develop`, commit `fccbbe4`, có `package-lock.json` modified và cũ hơn `upstream/develop`.

Browser ở `localhost:3001` đang phục vụ UI khớp worktree FE cũ: `/ide` hiển thị “mock code runner”, trong khi source audit `app/(app)/ide/page.tsx` đã import `src/features/ide/IDEPage.tsx`. Vì vậy quan sát browser trên cổng 3001 không được dùng để tuyên bố bản audit đã chạy E2E hoàn chỉnh.

## PHẦN 3 — Nguồn nghiệp vụ và mâu thuẫn

Nguồn chính:

- `C:\ThreadLearn\docs\_requirements_text.txt`, đặc biệt dòng 351–375, 839–868, 930–991 và 1115–1132.
- BE: `docs/DEV3_FINAL_ACCEPTANCE_REPORT.md`, architecture/migration docs, controller/service/repository/schema và test hiện tại.
- FE: architecture/acceptance docs, routes, pages/components/hooks/services.

Business rules chuẩn:

- Comment cần login + lesson access; tối đa 2.000; reply cùng target, không reply deleted, tối đa hai cấp; owner/Admin edit/delete; delete mềm.
- Bookmark unique `(userId,targetType,targetId)`, recent-first, filter type, snapshot server.
- Note private, nhiều note/lesson, `anchorEnd > anchorStart`.
- IDE chỉ JavaScript/Python, code ≤50KB, 20 lượt/ngày, lưu history.
- AI code ≤5.000, Free 10/Premium 40, SHA-256 cache, history riêng; optimized code chỉ Premium; Free retention 30 ngày.
- Notification riêng theo user, 20/page, unread/mark one/mark all/link và Socket JWT.

Mâu thuẫn chính giữa code và requirements:

1. Comment list/replies hiện public, trái yêu cầu login + lesson access.
2. FE lesson nhận Java/C/C++ là runnable trong khi API Student chỉ nhận JavaScript/Python.
3. AI chỉ xóa field `optimizedCode`, nhưng vẫn trả cùng nội dung fix trong `issues[].fix` cho Free.
4. Free-retention dựa vào `planType` tĩnh, không xét subscription hết hạn/feature grant.
5. Notification topbar tính unread trên trang 20 phần tử thay vì endpoint unread tổng.

## PHẦN 4 — Phương pháp trace

Mỗi UC được trace theo chuỗi:

`Page/component → hook/query/mutation → FE service/apiClient → route/controller → JWT/DTO → application service → entity/rule → repository/schema/index → external dependency → response/cache/UI state`.

Evidence dùng trong báo cáo gồm source và dòng, output test, API read-only và browser observation. Browser E2E của đúng commit bị giới hạn bởi CORS/runtime; không có kết luận “Passed” giả định.

## PHẦN 5 — Trace tuần tự từng UC

### UC29 — Add Comment in Lesson

**Flow**

`LessonPage` (`src/features/lessons/pages.tsx:38-40,654-656`)  
→ `CommentsSection` composer/mutation (`src/features/lessons/CommentsSection.tsx`)  
→ `commentsService.create` (`src/services/index.ts:299-335`)  
→ `POST /api/v1/comments`  
→ `CommentController.createComment` + JWT + Zod (`comment.controller.ts:67-77`)  
→ `CreateCommentService.execute` kiểm tra lesson/course access  
→ `CommentEntity.createNew` trim/nonempty/status active (`comment.entity.ts:33-57`)  
→ `MongoCommentRepository.create`  
→ `Comment` schema max 2.000/index target-thread  
→ response view populate tên/avatar  
→ TanStack invalidation và UI thread.

**Đúng:** create cần JWT; access có Admin bypass; DTO chặn rỗng/quá dài; React render content dạng text nên script không execute; schema có target/user/thread indexes.

**Sai/thiếu:** `GET /v1/comments` và `GET /:commentId/replies` không có JWT/access (`comment.controller.ts:49-64`). API runtime trả 2 comment của lesson Premium mà không gửi JWT. `CommentsSection` chỉ lấy `isLoading`, không xử lý query `isError`, nên lỗi tải bị hiển thị như empty thread. Alias `POST /v1/lessons/:id/comments` dùng body thô.

**Kết luận:** Rejected vì IDOR/read-access.

### UC30 — Reply to Comment

**Flow**

Reply button  
→ mutation `commentsService.reply`  
→ `POST /v1/comments/:commentId/replies`  
→ JWT + object-id/body Zod (`comment.controller.ts:80-98`)  
→ lấy parent  
→ `CreateCommentService` normalize reply-of-reply về root  
→ repository kiểm tra parent tồn tại, active, root, cùng target (`mongo-comment.repository.ts:63-79`)  
→ create reply  
→ tìm parent owner và gửi `COMMENT_REPLY` nếu khác chính mình  
→ invalidate thread.

**Đúng:** Student/Admin có thể reply nếu access hợp lệ; không self-notify; tombstone/replies được giữ; deleted parent bị chặn ở trạng thái bình thường.

**Sai/thiếu:** list replies public; check parent rồi create là hai thao tác không transaction/conditional write. Parent có thể bị delete giữa dòng 67 và 78, tạo reply vào parent vừa deleted. UI lỗi replies cũng có thể trông như rỗng.

**Kết luận:** Rejected vì cùng IDOR UC29 và race delete/reply.

### UC31 — Edit Comment

**Flow**

Edit/cancel/save trong `CommentsSection`  
→ `PATCH /v1/comments/:commentId`  
→ JWT + object-id + max 2.000  
→ `UpdateCommentService` (`update-comment.service.ts:9-15`)  
→ entity `ensureCanModify` owner/Admin + `edit` (`comment.entity.ts:80-90`)  
→ repository update  
→ response/invalidate.

**Đúng:** Student chỉ sửa own; Admin sửa bất kỳ; deleted bị `findById` loại; `isEdited`, `editedAt`, `updatedAt` được ghi.

**Thiếu:** read-modify-write không dùng `__v`, ETag hoặc predicate `status != deleted`. Hai edit đồng thời last-write-wins; edit/delete đồng thời có thể ghi đè tombstone. Không có audit log khi Admin sửa Student comment.

**Kết luận:** Partial.

### UC32 — Delete Comment

**Flow**

Delete action  
→ `DELETE /v1/comments/:commentId`  
→ JWT + ownership/Admin  
→ `CommentEntity.softDelete` (`comment.entity.ts:93-100`)  
→ content tombstone + deletedAt/status  
→ repository update  
→ UI invalidate; replies vẫn query theo parent.

**Đúng:** soft delete, replies retained; mapper redacts identity của tombstone; edit/re-delete bị 404 do `findById` loại deleted.

**Thiếu:** update không conditional nên race edit/delete; API dùng 404 cho deleted/re-delete nhưng không có conflict semantic; không audit Admin moderation.

**Kết luận:** Partial.

### UC33 — View Lesson Bookmarks

**Flow**

`/bookmarks` → `BookmarksPage` (`BookmarksPage.tsx:28-144`)  
→ `bookmarksService.getAll(page,20)` ép `targetType=LESSON` (`services/index.ts:339-348`)  
→ `GET /v1/bookmarks` + JWT/Zod  
→ `ListMyBookmarksService`  
→ repository `{userId,status != deleted}`, recent-first, paginated (`mongo-bookmark.repository.ts:28-36`)  
→ cards/loading/error/empty/pagination.

**Đúng:** ownership nằm trong query; recent-first; snapshot title/thumbnail; click đi `/lessons/:targetId`.

**Thiếu:** UI không cho đổi filter COURSE/LESSON dù BE hỗ trợ. Nếu xóa item cuối ở page >1, nhánh empty thay toàn bộ list và pagination biến mất, user bị kẹt ở trang rỗng. Deleted/unpublished target vẫn xuất hiện theo snapshot và click có thể dẫn lỗi mà UI không cảnh báo.

**Kết luận:** Partial.

### UC34 — Save Lesson Bookmark

**Flow**

Lesson Bookmark button  
→ `bookmarksService.check/toggle`  
→ `GET /bookmarks/check`, `POST /bookmarks/toggle`  
→ JWT + Zod  
→ `ToggleBookmarkService` validate ObjectId và lesson access, metadata lấy từ server (`toggle-bookmark.service.ts:20-38`)  
→ repository delete-existing hoặc create  
→ unique index `(userId,targetType,targetId)` (`bookmark.model.ts:37`)  
→ FE invalidate/check; list removal có optimistic rollback.

**Đúng:** không tin title client ở endpoint chuẩn; unique + E11000; refresh đọc state từ DB; locked/premium/enrollment qua learning access.

**Sai/thiếu concurrency:** hai toggle đồng thời trên bookmark đang tồn tại không tuyến tính: request A xóa, request B thấy absent rồi tạo lại; hai lần toggle có thể kết thúc `bookmarked=true`. E11000 chỉ xử lý create/create. `exists()` không lọc status deleted; sau `DELETE` soft-delete, check có thể vẫn true và toggle đầu tiên chỉ hard-delete record.

**Kết luận:** Partial.

### UC35 — Add Note in Lesson

**Flow**

Selection trong `LessonReader`  
→ `onTextSelected` mở `NotesPanel`  
→ create/edit/delete mutations  
→ `/v1/notes` JWT + Zod  
→ create/list/update services ép viewer `STUDENT`, kiểm tra enrollment và content length  
→ repository luôn query `userId`  
→ Note schema không unique, compound `(userId,lessonId,updatedAt)`  
→ invalidate, private UI states.

**Đúng:** nhiều note/lesson; ownership mọi read/update/delete; Admin không xem note Student; bounds server; manual excerpt change xóa offset cũ (`NotesPanel.tsx:157-163`); loading/error/empty có UI.

**Sai/thiếu:** selection offset dùng `renderedContent.indexOf(selectedText)` (`LessonReader.tsx:119-143`). Với text trùng, Markdown nhiều node hoặc title bị strip, offset có thể trỏ lần xuất hiện đầu/sai hệ quy chiếu; fallback còn lưu 0 thay vì báo lỗi. DTO cho phép chỉ gửi một trong `anchorStart/anchorEnd`; max note/code chỉ dựa Mongoose nên alias/body thô có thể trả lỗi 500 thay vì validation 400.

**Kết luận:** Partial.

### UC44 — Run Code in IDE

**Flow độc lập**

`/ide` → `IDEPage` → dynamic `@monaco-editor/react` (`IDEPage.tsx:11,110-117`)  
→ draft localStorage debounce  
→ `codeExecutionService.run`  
→ `POST /v1/code-execution/run` JWT + Zod (`code-execution.controller.ts:12-21`)  
→ `CodeExecutionService` validate, lesson access, atomic quota 20/day  
→ map JS=63/Python=71  
→ Judge0 base64 `wait=true`  
→ persist `CodeExecution`  
→ stdout/status/runtime/memory UI + history invalidation cần bổ sung.

**Đúng:** Student payload không có `languageId`; chỉ JS/Python; không local eval; quota atomic qua unique daily row; failure trước execution release quota; history lưu owner; draft restore.

**Sai/thiếu:** lesson runner coi Java/C/C++ là runnable (`pages.tsx:50,344-346`) rồi gửi language string bị public DTO từ chối. Judge0 `fetch` không có AbortController/timeout (`code-execution.service.ts:45-53`). Limit dùng số ký tự 50.000, không phải byte 50KB. FE standalone history không có loading/error state rõ. Live Judge0 chưa smoke-test.

**Kết luận:** Partial; external environment pending.

### UC45 — View Code Execution Output

**Flow**

Run result  
→ controller response có stdout/stderr/compileOutput/status/runtime/memory  
→ IDE `<pre>` phân vùng output (`IDEPage.tsx:63-72,142-145`)  
→ `GET /code-execution/history` owner + page  
→ `GET /code-execution/:id` owner.

**Đúng:** compile/runtime status từ Judge0 được giữ; không expose token/internal config; history owner-scoped và indexed.

**Sai/thiếu:** click history chỉ restore `sourceCode`, không set/fetch execution detail (`IDEPage.tsx:128-131`), nên sau refresh không xem lại stdout/stderr của record. FE service không expose detail endpoint. Invalid execution id gây HTTP 500 thay vì 400/404 (đã test API). Output không có cap/truncation. Không có pending/polling vì dùng Judge0 synchronous wait.

**Kết luận:** Partial; external environment pending.

### UC46 — Submit Code and Request AI Recommendation

**Flow**

`/ai` `AIPage`  
→ optional Run tạo `executionId`  
→ `useAnalyzeStream.run` POST fetch `/ai/analyze/stream`  
→ JWT + Zod max 5.000  
→ profile/tier + execution ownership  
→ SHA-256 cache, atomic daily quota  
→ AI provider SSE  
→ persist `AIHistory`, cache TTL 1h  
→ pipeline/issues/result/history invalidation.

**Đúng:** executionId owner-check; atomic Free 10/Premium 40; provider-start failure release quota; SHA-256 cache không chứa user identity; cached request tạo history riêng; input không được dùng làm URL/header/system secret.

**Lỗi chặn acceptance:** Free user vẫn nhận `issues[].fix`. `persistHistory` chỉ bỏ top-level `optimizedCode`, nhưng lưu `issues` với `fix` cho mọi tier (`request-recommendation.service.ts:119-126`, `stream-recommendation.service.ts:202-209`). History presenter chỉ `delete value.optimizedCode` (`get-history-logs.service.ts:29-32`). SSE còn forward nguyên result upstream. Đây là bypass Premium.

Nếu stream kết thúc bình thường mà không có `result`, reservation không được release; FE vẫn toast success vì chỉ kiểm tra `streamError`. `fetch` riêng không dùng refresh-token interceptor; access token hết hạn làm Analyze 401 dù refresh token còn hợp lệ. Prompt-injection robustness của AI provider chưa có test.

**Kết luận:** Rejected; external AI environment pending.

### UC47 — View AI Chat / Analysis History

**Flow**

`AIPage` history query/page + `/ai/history/:id` detail  
→ JWT  
→ `GetHistoryLogsService/GetHistoryByIdService`  
→ repository filter `{userId}`, newest-first  
→ tier presenter  
→ list/detail/loading/error/empty.

**Đúng:** owner-scoped list/detail/update feedback; pagination; newest-first; detail route; cached/non-cached stored; UI states có đủ.

**Sai/thiếu:** đây là analysis record, không phải conversation/chat thread; cần đổi tên UC/UI nếu product muốn chat. Retention job tìm Free bằng `planType != PREMIUM` nhưng không xét expiry và feature grant (`mongo-ai-history.repository.ts:59-66`): expired Premium có thể giữ vô hạn, user có grant hợp lệ nhưng planType Free có thể bị purge. Invalid ID trả 500. Free vẫn thấy `issues[].fix`.

**Kết luận:** Partial.

### UC53 — View Notifications

**Flow Student**

`/notifications` + Topbar  
→ list/unread/mark one/mark all services  
→ JWT  
→ repository queries luôn `{userId}`  
→ pagination 20, readAt  
→ click `link`  
→ Socket.IO handshake JWT, join `user:<verified JWT id>`  
→ emit/invalidate/toast.

**Flow Admin**

`/admin/notifications`  
→ Admin controller JWT + `@Roles('ADMIN')`  
→ scope own user + ADMIN recipient/type  
→ separate read state/eventKey unique.

**Đúng:** HTTP ownership; mark one/all; unread endpoint tổng; socket không tin client userId; unique admin event key; page UI có loading/error/empty.

**Sai/thiếu:** Topbar gọi list mặc định 20 rồi tự đếm unread (`Topbar.tsx:47-54`) thay vì unread-count, nên badge sai khi unread nằm ngoài trang đầu. Socket invalidates `['notifications']` nhưng không `['notification-unread-count']` (`useSocket.ts:68-77`). Axios refresh chỉ cập nhật localStorage, không cập nhật Zustand token; socket reconnect giữ JWT cũ. Admin UI tải 50 record một lần, không có pagination. `router.push(notification.link)` không whitelist internal path.

**Kết luận:** Partial.

## PHẦN 6 — Student user journey

| Bước | Trang/control | API và dữ liệu lưu | Kết quả/thất bại thực tế |
|---|---|---|---|
| 1 | `/login`, email/password, Sign in | `POST /auth/login`; token/local auth state | Login seed Student thành công trên runtime cũ. |
| 2 | `/courses/:id`, Enroll | enrollment API | Sau enroll mới tương tác lesson non-preview; lỗi premium/locked cần hiện rõ. |
| 3 | `/lessons/:id` | lesson + enrollment + bookmark check | Nội dung, notes/comments/sidebar; current code cần chạy đúng worktree. |
| 4 | Comment composer, Post | `POST /comments`; Comment active | Thành công thì invalidate thread; lỗi list hiện đang dễ bị hiểu là empty. |
| 5 | Reply | `POST /comments/:id/replies`; root parent | Reply-of-reply normalize root; deleted parent bị chặn trừ race. |
| 6 | Edit → Save/Cancel | `PATCH /comments/:id`; edited metadata | Owner-only; concurrent edit last-write-wins. |
| 7 | Delete | `DELETE /comments/:id`; tombstone | Replies giữ; author redacted. |
| 8 | Bookmark button | check + toggle; snapshot server | State reload từ DB; double request có thể sai final state. |
| 9 | `/bookmarks` | `GET /bookmarks?targetType=LESSON&page=` | Cards/newest-first; page rỗng sau delete có thể kẹt. |
| 10 | Bôi đen lesson | mở Notes composer; POST note | Offset có thể sai với duplicate/Markdown. |
| 11 | Pencil/Trash note | PATCH/DELETE owner-only | Invalidate và toast; nhiều note/lesson được phép. |
| 12 | `/ide` | Monaco + local draft | Source audit có Monaco; server 3001 hiện vẫn deploy mock cũ. |
| 13 | Run code | `POST /code-execution/run` | JS/Python; quota 20; Judge0 missing → 503. |
| 14 | Output panel/history | history/list result | Run hiện tại xem đủ fields; history cũ không mở lại full output. |
| 15 | `/ai`, Run rồi Analyze | execution + SSE AI | Quota/cache/history; expired access token không auto-refresh. |
| 16 | Pipeline/result cards | SSE result | Free đang thấy fix Premium qua `issues[].fix`. |
| 17 | AI history/detail | page + detail owner-only | Có list/detail; retention sai với subscription state. |
| 18 | `/notifications` | list + unread count | Main page đúng tổng; topbar badge có thể thiếu. |
| 19 | Click/Mark all | PATCH one/all + router link | Read state đúng owner; link chưa whitelist. |

Recovery UX nên bổ sung: Retry trong comment/history/notification; thông báo quota/error code cụ thể; back-to-valid-page khi page vượt total; reconnect/auth refresh cho SSE/socket.

## PHẦN 7 — Admin journey và quyền

| Chức năng | Quyền thực tế | Evidence/kết luận |
|---|---|---|
| List comment/replies | Hiện public, nên Admin xem được nhưng sai security | Comment controller GET không guard. |
| Add/reply comment | Có; Admin bypass enrollment | controller truyền `user.role`; learning access Admin bypass. |
| Edit/delete Student comment | Có | entity cho `ADMIN`; FE hiện action nếu Admin. Không audit log. |
| Bookmark/note Student | Không | repository/service owner-only; không Admin endpoint. Admin lesson notes bị xử lý như STUDENT của chính Admin, không xem Student khác. |
| Code history Student | Không | repository `{userId}`; Admin chỉ xem history của chính mình. |
| AI history Student | Không | repository `{userId}`; Admin chỉ own. |
| Dùng IDE/AI | Có theo controller hiện tại | JWT không giới hạn STUDENT; Admin không bị daily code quota và được tier AI Premium. |
| Notification Admin | `/admin/notifications` | JWT + `@Roles('ADMIN')`; own recipient rows; mark one/all. |
| Notification Student endpoint | Admin có thể gọi nhưng chỉ nhận row có `userId` của Admin | Không mở rộng sang user khác. |
| Socket | room từ JWT | `socket/index.ts:27-50`; không nhận client-selected room. |

UI route `/admin/*` có role protection; route chung `/ide`, `/ai`, `/lessons/:id` không chặn Admin. Đây phù hợp implementation và access matrix cho IDE/AI, nhưng không suy ra quyền xem dữ liệu Student.

## PHẦN 8 — Test matrix

`Actual` phân biệt: **Runtime** (đã gọi API/browser), **Static** (trace code/schema), **Not run** (thiếu harness/external). PASS chỉ có nghĩa case cụ thể đạt, không đồng nghĩa UC Accepted.

| ID | UC | Loại | Preconditions / Steps / Input | Expected | Actual | Status | Evidence |
|---|---|---|---|---|---|---|---|
| C29-01 | 29 | Happy/validation | Student access; post text hợp lệ, rỗng, >2000 | 201; invalid 400 | Static: DTO/service đúng | PASS | controller 67-77, DTO |
| C29-02 | 29 | Auth/access/security | GET Premium lesson comments không JWT | 401/403 | Runtime: 200, 2 rows | FAIL | API 5000 + controller 49-57 |
| C29-03 | 29 | UI/network | comment list API lỗi | Error/retry | UI rơi vào empty | FAIL | `CommentsSection` query state |
| C29-04 | 29 | XSS | `<script>` content | Không execute | React text escape; BE lưu raw | PASS/P2 | JSX text rendering |
| C30-01 | 30 | Happy/RBAC | Student/Admin reply active parent | 201/root thread | Static đạt | PASS | controller/service/repo |
| C30-02 | 30 | Deleted/not found | reply deleted parent | 400/404 | Static chặn | PASS | repo 67-72 |
| C30-03 | 30 | Concurrency | delete parent giữa check/create | Không tạo orphan reply | Có race window | FAIL | repo 67 và 78 |
| C30-04 | 30 | Auth | GET replies không JWT | 401/403 | Runtime public | FAIL | controller 60-64 |
| C31-01 | 31 | Ownership/RBAC | A edit B; Admin edit B | 403; Admin 200 | Static đạt | PASS | entity 80-90 |
| C31-02 | 31 | Deleted | edit deleted | 404/conflict | Static 404 | PASS | repository findById |
| C31-03 | 31 | Concurrency | hai edit đồng thời | conflict/versioning | last-write-wins | FAIL | find + update |
| C31-04 | 31 | UI/a11y | edit/cancel/save keyboard | controls có label/action | Static cơ bản đạt | PASS | CommentsSection |
| C32-01 | 32 | Happy/ownership | owner/Admin delete | soft tombstone | Static đạt | PASS | entity 93-100 |
| C32-02 | 32 | Isolation | A delete B | 403 | Static đạt | PASS | ensureCanModify |
| C32-03 | 32 | Persistence | reload thread after delete | tombstone + replies | mapper/list giữ | PASS | repo/mapper tests |
| C32-04 | 32 | Concurrency | edit/delete đồng thời | delete thắng hoặc 409 | Có thể ghi đè | FAIL | unconditional update |
| B33-01 | 33 | Ownership/page | GET mine page 1/20 | only own, newest | Static + authenticated endpoint | PASS | repo 28-36 |
| B33-02 | 33 | Empty/page-overflow | page > total | empty + quay lại được | pagination biến mất | FAIL | BookmarksPage 104-144 |
| B33-03 | 33 | Deleted target | click stale snapshot | cảnh báo/disable | điều hướng lesson lỗi | FAIL | BookmarksPage 116 |
| B33-04 | 33 | Responsive/a11y | cards/buttons mobile | usable labels | Static cơ bản đạt | PASS | responsive grid/buttons |
| B34-01 | 34 | Happy/access | toggle enrolled lesson | create/remove, server snapshot | Static đạt | PASS | service 20-38 |
| B34-02 | 34 | Auth/premium | no JWT/non-enrolled/locked | 401/403 | guard/access có | PASS | controller/service |
| B34-03 | 34 | Concurrent | two simultaneous toggles | deterministic parity | non-linearizable | FAIL | repo 13-24 |
| B34-04 | 34 | Soft-delete/check | DELETE then check/toggle | false/restore once | exists sees deleted | FAIL | repo 39-41 |
| N35-01 | 35 | Happy/multiple | create 2 notes same lesson | both saved private | schema no unique | PASS | note index |
| N35-02 | 35 | Ownership/IDOR | A read/update B; Admin read B | denied/not found | owner query | PASS | repo 11-13,42-45 |
| N35-03 | 35 | Bounds | end<=start/end>content | 400 | Static chặn when pair | PASS | DTO/service |
| N35-04 | 35 | Anchor correctness | duplicate Markdown text | exact source offset | `indexOf` first match | FAIL | LessonReader 137-143 |
| E44-01 | 44 | Happy/external | Monaco, JS/Python run | output/history | Code static đạt; live Judge0 not run | BLOCKED | env pending |
| E44-02 | 44 | Payload/security | caller languageId/empty/>50KB | rejected | DTO blocks ID; char/byte mismatch | PARTIAL | DTO/service |
| E44-03 | 44 | Quota/concurrent | 21 parallel runs | exactly 20 reserved | atomic quota unit tests pass | PASS | DailyQuota tests |
| E44-04 | 44 | Timeout | Judge0 hangs | bounded 503/timeout | no fetch timeout | FAIL | service 45-53 |
| E45-01 | 45 | Output | stdout/stderr/compile/runtime/memory | all visible | Static UI present | PASS | IDEPage 63-72 |
| E45-02 | 45 | Ownership | A GET execution B | 404 | owner query | PASS | repo 30-31 |
| E45-03 | 45 | Refresh/history | click old run after reload | full output | only source restored | FAIL | IDEPage 128-131 |
| E45-04 | 45 | Invalid ID | GET `not-an-id` | 400/404 | Runtime 500 | FAIL | API test |
| A46-01 | 46 | Happy/external | analyze valid code | stream/history | Code static; live AI not run | BLOCKED | env pending |
| A46-02 | 46 | Ownership | foreign executionId | 404 | owner exists query | PASS | request/stream services |
| A46-03 | 46 | Tier/security | Free reads recommendation/history | no optimized fix | `issues[].fix` exposed | FAIL | service/presenter |
| A46-04 | 46 | Quota/cache/failure | parallel quota/cache/provider fail | atomic/release/cache | unit pass initial failure; SSE end gap | PARTIAL | quota/AI tests |
| A47-01 | 47 | Ownership/IDOR | A requests B id | 404 | owner query | PASS | repository 27-29 |
| A47-02 | 47 | Page/UI | page/list/detail/empty/error | usable states | Static đạt | PASS | AIPage/detail |
| A47-03 | 47 | Retention/tier | expired Premium >30d | purge as Free | không purge | FAIL | repo 59-66 |
| A47-04 | 47 | Invalid ID | history `not-an-id` | 400/404 | Runtime 500 | FAIL | API test |
| N53-01 | 53 | Ownership | A list/read B notification | no data/404 | owner query | PASS | notification service |
| N53-02 | 53 | Pagination/unread | >20, unread on later page | badge total exact | topbar counts first page | FAIL | Topbar 47-54 |
| N53-03 | 53 | Socket spoof | client sends other userId | ignored/rejected | room solely verified JWT | PASS | socket 27-50 |
| N53-04 | 53 | Refresh/reconnect | access token rotates | socket reconnects new JWT | Zustand socket token stale | FAIL | apiClient 119-124/useSocket 32-46 |
| N53-05 | 53 | Link security | `https://evil`/`javascript:` metadata | reject/internal only | no whitelist | FAIL | page/topbar router.push |
| N53-06 | 53 | Admin/page | >50 Admin notifications | paginate 20/page | UI hardcodes limit 50/no pager | FAIL | AdminNotificationsPage 11 |

Các case chưa có automated/runtime harness: JWT expired end-to-end, cross-user fixture đầy đủ, mobile viewport, keyboard/screen-reader, real concurrent Mongo requests, live Judge0/AI, Socket reconnect/duplicate/Redis outage.

## PHẦN 9 — Kết quả test tự động

| Thành phần | Command | Exit | Kết quả |
|---|---|---:|---|
| BE | `npm.cmd test -- --runInBand` | 0 | 28/28 suites; 98/98 tests; 0 snapshot; không báo skip |
| BE | `npm.cmd run lint` | 0 | Không lỗi |
| BE | `npm.cmd run build` | 0 | Nest build thành công |
| FE | `npx.cmd tsc --noEmit` | 0 | TypeScript thành công |
| FE | `npm.cmd run lint` | 0 | Không warning/error; `next lint` đã deprecated |
| FE | `npm.cmd run build` | 0 | Next production build; 30 static pages generated |

Thiếu test:

- BE không có controller/API integration/e2e suite cho DEV3.
- Không có bookmark tests.
- Comment chỉ có entity/repository; note chỉ entity/anchor bound; code execution có một service case; AI có request/cache; notification có service unit.
- FE không có test script/framework, component/hook/service test, Playwright/Cypress.
- Browser đúng commit không hoàn tất vì runtime hiện phục vụ worktree cũ ở 3001; FE audit ở 3002 bị backend CORS chặn. Backend audit tạm ở 5001 không bind thành công với runtime local và đã được dừng/cleanup.
- Judge0, AI provider và Redis/Socket production chưa smoke-test.

## PHẦN 10 — Database và concurrency

| Schema | Fields/index chính | Rủi ro |
|---|---|---|
| Comment | target/user/parent/content/status/isEdited/deletedAt; max 2000; target+parent+created index | update/delete không optimistic; reply check/create race; public read data leak |
| Bookmark | owner/target/snapshot/status; unique owner+type+target; owner+status+created | toggle không linearizable; `exists` bỏ status; stale target |
| Note | owner/lesson/text/code/anchor; text max10k, code50k; owner+lesson+updated; text index | offset semantic sai; partial range; hard delete |
| CodeExecution | owner/course/lesson/source/language/output/status/runtime/memory/token; owner+created indexes | output/token retention không TTL; invalid-id cast 500; unbounded output |
| AIHistory | owner/input/issues/docs/fix/tier result; owner index gián tiếp | không có owner+created compound index rõ ràng; Free fix leak; retention profile sai |
| AIAnalysisCache | SHA-256 unique key + expiresAt TTL | cache content dùng chung nhưng history owner riêng; fix Premium leak theo payload |
| DailyQuota | owner/scope/UTC day/count; unique compound | reserve atomic; SSE normal-end không release |
| Notification | owner/type/link/readAt/eventKey; owner+read+created; sparse unique owner+eventKey | link untrusted; topbar count; Admin UI pagination |

Index cần bổ sung/đánh giá: `AIHistory({userId:1,createdAt:-1})`; validation/migration cho legacy bookmark deleted; có thể TTL/retention strategy cho execution output theo policy.

## PHẦN 11 — Security findings

| Severity | Finding | Phạm vi |
|---|---|---|
| High | Comment list/replies không JWT và không lesson access; confirmed read IDOR | UC29/30 |
| High | Free nhận optimized fix qua `issues[].fix` và SSE/cache/history | UC46/47 |
| Medium | Comment reply/delete và edit/delete race | UC30-32 |
| Medium | Bookmark toggle race và deleted-state inconsistency | UC34 |
| Medium | Judge0 request không timeout; size là char không byte | UC44 |
| Medium | Invalid ObjectId gây 500 ở execution/AI/notification | UC45/47/53 |
| Medium | SSE có thể giữ quota khi kết thúc không result; UI false success | UC46 |
| Medium | AI SSE và Socket không đồng bộ access-token refresh | UC46/53 |
| Medium | Retention không xét expiry/feature | UC47 |
| Medium | Unread badge không phải global total | UC53 |
| Low | Notification link không whitelist internal route | UC53 |
| Low | Alias controllers dùng body/param thô, error contract không nhất quán | UC29/34/35 |
| Low | Admin moderation không có audit log | UC31/32 |

JWT verification và Socket room derivation đúng; owner query cho bookmark/note/execution/AI/notification đúng; daily quota dùng atomic update. Không thấy command injection/local eval. NoSQL injection được giảm nhờ DTO ở endpoint chuẩn, nhưng các compatibility alias vẫn cần đóng schema.

## PHẦN 12 — Bug list và phương án sửa

### BUG-DEV3-001 — Public comment read bypasses authentication/lesson access

- **UC/Severity/Status:** UC29/30 — High — Confirmed.
- **Reproduce:** gọi `GET /api/v1/comments?targetType=LESSON&targetId=6a5f93faa091f408ac4478b3` không JWT.
- **Expected/Actual:** 401/403; actual 200 và 2 rows.
- **Files:** `comment.controller.ts:49-64`; list services/repository.
- **Root cause/impact:** GET routes không guard và không gọi LearningAccess; lộ discussion premium/locked/unpublished.
- **Fix:** JWT cho list/replies; truyền viewer vào list service; resolve parent/target rồi `assertLessonViewAccess` hoặc course access; endpoint public chỉ được phép nếu requirements định nghĩa riêng.
- **Tests:** controller e2e no-JWT, Free/Premium, non-enrolled, locked, Admin, foreign target.
- **Breaking/migration:** API auth behavior thay đổi; không migration.

### BUG-DEV3-002 — Free tier receives Premium optimized fix

- **UC/Severity/Status:** UC46/47 — High — Confirmed.
- **Expected/Actual:** Free không thấy optimized code; actual `issues[].fix` vẫn có ở sync, SSE, cache, history.
- **Files:** request service 119-126; stream service 202-209; history presenters 29-32.
- **Root cause/impact:** chỉ redact field top-level; cùng dữ liệu tồn tại trong nested issue. Bypass monetization/authorization.
- **Fix:** presenter tier-aware redact `optimizedCode` và `issues[].fix`; SSE không forward upstream trực tiếp—parse và transform result theo tier; cache có thể giữ canonical server data nhưng response/history phải redact.
- **Tests:** Free/Premium/Admin cho sync, cache-hit, SSE, list, detail.
- **Breaking/migration:** response Free mất field; history cũ không cần migration nếu presenter redacts.

### BUG-DEV3-003 — Comment mutations are not concurrency-safe

- **UC/Severity:** UC30-32 — Medium — Confirmed by code.
- **Actual:** parent can delete between check/create; edit/delete can overwrite each other.
- **Fix:** transaction or atomic create with parent predicate; update/delete `findOneAndUpdate({_id,status:'active',__v})`, increment version, return 409 on conflict.
- **Tests:** parallel integration tests with real Mongo.

### BUG-DEV3-004 — Comment API errors render as empty

- **UC/Severity:** UC29/30 — Medium.
- **File:** `CommentsSection.tsx`.
- **Fix:** consume `isError/error/refetch`; render retry and distinguish 401/403/404/network.
- **Tests:** React Query rejected promise component tests.

### BUG-DEV3-005 — Bookmark toggle is non-linearizable

- **UC/Severity:** UC34 — Medium.
- **File:** bookmark repository 11-24.
- **Fix:** replace ambiguous toggle for mutation-heavy UI with idempotent `PUT bookmark`/`DELETE bookmark`; or transaction/versioned state. Debounce/disable FE only as secondary defense.
- **Tests:** 2/3/20 parallel requests, final parity/idempotency.

### BUG-DEV3-006 — Soft-deleted bookmark can report bookmarked

- **UC/Severity:** UC33/34 — Medium.
- **File:** repository `exists` 39-41 and toggle delete query.
- **Fix:** consistently filter active or remove status/soft-delete concept; migrate legacy deleted rows; unique partial index only if soft-delete retained.
- **Migration:** possibly clean legacy deleted rows/index.

### BUG-DEV3-007 — Bookmark page can trap user on empty later page

- **UC/Severity:** UC33 — Medium.
- **File:** `BookmarksPage.tsx:104-144`.
- **Fix:** after mutation, if page>1 and current count becomes zero, decrement page; render navigation independent of item count; expose type filter/stale-target state.

### BUG-DEV3-008 — Note anchor offset can point to wrong text

- **UC/Severity:** UC35 — Medium.
- **Files:** `LessonReader.tsx:119-143`; note DTO.
- **Fix:** map DOM selection to source using stable source offsets/data attributes; verify selected substring against normalized source; reject unresolved/duplicate anchor; require start/end pair.
- **Tests:** duplicate text, Markdown emphasis/link/code, stripped title, multi-node selection, Unicode.

### BUG-DEV3-009 — Lesson runner advertises unsupported languages

- **UC/Severity:** UC44 — Medium.
- **File:** `pages.tsx:50,344-346`; DTO JS/Python.
- **Fix:** derive one shared supported-language contract; render runner only JS/Python or add a separately approved public mapping for more languages.

### BUG-DEV3-010 — Judge0 request has no timeout and byte-size validation

- **UC/Severity:** UC44 — Medium.
- **File:** `code-execution.service.ts:45-53,89-91`.
- **Fix:** AbortController with configured deadline; map timeout to stable code; validate `Buffer.byteLength(sourceCode,'utf8') <= 50*1024`; cap stdin/output.
- **Tests:** hanging/malformed/huge/Unicode Judge0 mock.

### BUG-DEV3-011 — Execution history cannot reopen full output

- **UC/Severity:** UC45 — Medium.
- **File:** `IDEPage.tsx:128-131`; FE service.
- **Fix:** add `getById`, set selected execution/result on click, loading/error state and route/query persistence.

### BUG-DEV3-012 — Invalid IDs return HTTP 500

- **UC/Severity:** UC45/47/53 — Medium — Runtime confirmed.
- **Files:** code, AI and notification repositories/controllers.
- **Fix:** shared object-id param Zod before Mongoose; use 400 or 404 consistently.
- **Tests:** every `:id` endpoint with malformed 12/24/nonhex values.

### BUG-DEV3-013 — SSE normal end without result leaks quota and may show success

- **UC/Severity:** UC46 — Medium.
- **Files:** stream service 115-179; `AIPage.tsx:54-62`.
- **Fix:** await exactly-one persistence; on `end` without result release reservation and send SSE error; guard duplicate result; FE success only when `result != null`.

### BUG-DEV3-014 — AI streaming bypasses token refresh

- **UC/Severity:** UC46 — Medium.
- **File:** `useAnalyzeStream.ts:85-100`.
- **Fix:** shared authenticated fetch wrapper that performs one refresh/retry, or issue short stream ticket through axios first.

### BUG-DEV3-015 — AI Free retention uses stale planType

- **UC/Severity:** UC47 — Medium.
- **File:** AI repository 59-66.
- **Fix:** determine entitlement with expiry/features at purge time; preferably store tier-at-analysis and explicit `retentionExpiresAt` TTL/partial cleanup policy.

### BUG-DEV3-016 — Notification counts/reconnect/pagination inconsistent

- **UC/Severity:** UC53 — Medium.
- **Files:** Topbar 47-54; useSocket 32-77; apiClient 119-124; Admin page 11.
- **Fix:** topbar use unread-count; socket event update both caches; refresh interceptor update Zustand or socket read current token on reconnect; Admin page use page=1,limit=20 and pager.

### BUG-DEV3-017 — Notification links are not restricted

- **UC/Severity:** UC53 — Low.
- **Fix:** server allowlist internal route patterns and FE helper accepting only strings beginning `/` but not `//`; otherwise show notification without navigation.

### BUG-DEV3-018 — Compatibility aliases bypass canonical DTO

- **UC/Severity:** UC29/34/35 — Low.
- **Fix:** delegate aliases through the same Zod DTO/param validators; deprecate/remove after client migration.

## PHẦN 13 — Báo cáo nghiệm thu cuối

### 1. Executive summary

- Tổng: 12 UC.
- Accepted: 0.
- Accepted – Environment pending: 0.
- Partial: 9.
- Rejected: 3 (UC29, UC30, UC46).
- External environment pending chồng lấp: UC44, UC45, UC46.
- Bugs: 2 High, 14 Medium, 2 Low; không thấy Critical.

### 2. Code-flow map rút gọn

| UC | Flow |
|---|---|
| 29 | Lesson/CommentsSection → comments service → POST comments → JWT/Zod → access → entity/repo → Comment → invalidate |
| 30 | Reply UI → POST replies → parent/root/access → create → notification → thread |
| 31 | Edit UI → PATCH → owner/Admin → edit metadata → update → invalidate |
| 32 | Delete UI → DELETE → owner/Admin → tombstone → retained replies |
| 33 | BookmarksPage → GET mine/filter/page → owner query/sort → cards |
| 34 | Bookmark button → check/toggle → access/snapshot → unique index → cache refresh |
| 35 | Lesson selection → NotesPanel → notes API → Student access/owner → Note |
| 44 | Monaco → run API → JWT/Zod/access/quota → Judge0 → execution history |
| 45 | execution response/history → owner query → output/history UI |
| 46 | AIPage → SSE/sync → JWT/tier/execution owner/quota/cache → AI → history |
| 47 | AI list/detail → owner query/tier presenter → history UI |
| 53 | page/topbar/socket → JWT/owner/admin scope → Notification → cache/navigation |

### 3. Student journey

Luồng sử dụng có mặt từ login → enroll → lesson → comment/bookmark/note → IDE → AI → notifications. Chi tiết và failure/recovery nằm ở Phần 6. Các blocker chính cho Student là comment read IDOR, language mismatch, không mở lại output cũ, AI Free/Premium leak và badge/reconnect notification.

### 4. Admin management journey

Admin moderate comment đúng role nhưng thiếu audit log; xem và xử lý notification Admin riêng; không có quyền xem dữ liệu riêng Student. Admin được dùng IDE/AI theo implementation và không cần enrollment khi comment. Chi tiết evidence ở Phần 7.

### 5. Test results

Regression compile/unit đều xanh, nhưng test coverage không đủ acceptance. API runtime đã xác nhận public comment read và malformed-id 500. Browser xác nhận deployment local đang chạy FE cũ; đúng commit chưa E2E do CORS/runtime. Xem Phần 8–9.

### 6. Bug list theo severity

- **High:** BUG-001 comment IDOR; BUG-002 Premium fix bypass.
- **Medium:** BUG-003 đến BUG-016.
- **Low:** BUG-017 đến BUG-018.

### 7. UC acceptance table

| UC | Business | BE | FE | Authorization | Tests | Final status | Remaining work |
|---|---|---|---|---|---|---|---|
| 29 | Fail read rule | Partial | Partial | High IDOR | sparse | Rejected | BUG-001/004 + e2e |
| 30 | Race/read fail | Partial | Partial | High IDOR | sparse | Rejected | BUG-001/003/004 |
| 31 | Mostly | Partial | Good | owner/Admin good | unit only | Partial | optimistic conflict/audit |
| 32 | Mostly | Partial | Good | owner/Admin good | unit only | Partial | atomic delete/audit |
| 33 | Mostly | Good | Partial | owner good | none | Partial | filter/stale/page |
| 34 | Race fail | Partial | Partial | access good | none | Partial | idempotent API |
| 35 | Offset fail | Partial | Partial | owner/access good | unit only | Partial | source mapping/pair DTO |
| 44 | Env + timeout/lang | Partial | Partial | JWT/access/quota good | limited | Partial | BUG-009/010 + Judge0 smoke |
| 45 | History detail fail | Partial | Partial | owner good | none e2e | Partial | BUG-011/012 + smoke |
| 46 | Tier bypass | Rejected | Partial | owner/quota good, tier bad | limited | Rejected | BUG-002/013/014 + AI smoke |
| 47 | Retention/tier | Partial | Good | owner good | none e2e | Partial | BUG-002/012/015 |
| 53 | Count/reconnect/page | Partial | Partial | owner/room good | service only | Partial | BUG-012/016/017 |

### 8. Recommended fixes

- **P0:** BUG-001; BUG-002.
- **P1:** BUG-003, 005, 006, 008, 009, 010, 011, 012, 013, 014, 015, 016.
- **P2:** BUG-004, 007, 017; controller/component/integration/E2E tests.
- **P3:** BUG-018, Admin moderation audit log, output retention/index tuning, migrate `next lint`.

### 9. Implementation plan

1. Khóa comment read bằng JWT + lesson access; redact AI nested/SSE theo tier.
2. Chuẩn hóa ObjectId/DTO; quyết định bookmark soft-delete và migration/index.
3. Atomic comment/bookmark/quota-stream transitions; retention entitlement.
4. Chốt API contracts/error codes và shared language contract.
5. Sửa UI history-detail, page recovery, error/retry, unread, token refresh, safe link.
6. Thêm BE controller/integration và FE component/hook tests.
7. E2E hai actor + cross-user + concurrency với Mongo thật.
8. Chạy regression hiện có.
9. Deploy đúng worktree/version; smoke Judge0/AI/Redis/Socket và kiểm tra CORS.

### 10. Final conclusion

DEV3 **chưa đủ điều kiện merge/release theo tiêu chí Accepted**, dù build/lint/unit regression đều xanh. Comment create/edit/delete, bookmark/note, Monaco/Judge0 adapter, AI/history và notification đã có implementation thực; nhưng:

- UC29/30 bị lỗi read-access mức High.
- UC46 bị bypass Premium mức High.
- UC31/32/33/34/35/44/45/47/53 còn thiếu nghiệp vụ hoặc test quan trọng.
- Judge0, AI và realtime production chưa được smoke-test.
- Runtime local hiện chạy FE cũ ở cổng 3001, cần đồng bộ đúng commit trước khi UAT.

Không có business code nào được sửa trong audit này. Chỉ file báo cáo này được tạo.
