# AI Integration — Test Report

Ngày: 2026-07-10 (cập nhật: đã fix mục 1-4 bên dưới, trừ HF Space — cần bạn thao tác thủ công, xem "Hướng dẫn fix HF Space" ở cuối)
Phạm vi: `ThreadLearn_WEB_BE`, `ThreadLearn_WEB_FE`, `ThreadLearn-AI-Trainning/server`

## Tóm tắt

| Hạng mục | Kết quả |
|---|---|
| BE type-check (`tsc --noEmit`) | ✅ Pass |
| BE unit tests (`npm test`) | ✅ 22/22 pass |
| FE type-check | ✅ Pass |
| FE lint | ✅ Pass |
| AI server unit tests (`pytest`) | ❌ 84/90 pass, **6 failed** |
| End-to-end smoke (`POST /api/v1/ai/analyze`) | ⚠️ Chạy được (200 OK) nhưng **LLM call thất bại ngầm** |

Không phát hiện lỗi mới do code vừa merge (BE/FE). Các lỗi tìm thấy đều **có sẵn từ trước** trong `ThreadLearn-AI-Trainning/server`, lộ ra khi chạy thử end-to-end thật.

---

## 1. Lỗi: `LLM_PROVIDER=local_with_hf_api` không kết nối được HF Space

**Mức độ: Cao — ảnh hưởng trực tiếp chất lượng kết quả trả về cho người dùng.**

Log khi gọi `/api/v1/ai/analyze`:
```
[hf_inference] Error: <urlopen error [Errno 11001] getaddrinfo failed>
Loi goi HF Space: HTTP Error 503: Service Unavailable
```

Response vẫn trả **200 OK** nhưng field `fix` chứa thông báo lỗi thay vì code đã sửa:
```json
"fix": "```javascript\n// Loi ket noi toi HF Space\nfor(var i=0;...);}\n```"
```

**Nguyên nhân:** `getaddrinfo failed` là lỗi DNS/network — không resolve được domain HF Space, không phải lỗi cold-start bình thường (cold-start sẽ trả `503` timeout, không phải DNS error). Cần kiểm tra:
- HF Space có đang chạy không (có thể đã bị sleep/xóa do free tier).
- URL trong `.env` có đúng không.
- Máy chạy server có access internet ra ngoài không (firewall/proxy).

**Vấn đề thiết kế phụ:** Request vẫn trả `200 OK` dù LLM call thất bại. Nên trả status khác (vd `502`/`503`) hoặc field riêng báo lỗi (`llm_error: true`) để BE/FE phân biệt được "phân tích thành công nhưng không có issue" với "gọi LLM thất bại".

---

## 2. 6 test unit tại `ThreadLearn-AI-Trainning/server/tests/unit/` fail

```
FAILED tests/unit/test_main.py::test_analyze_no_auth - assert 403 == 401
FAILED tests/unit/test_race_detector.py::test_global_var_thread
FAILED tests/unit/test_race_detector.py::test_shared_list_no_lock
FAILED tests/unit/test_race_detector.py::test_missing_join
FAILED tests/unit/test_race_detector.py::test_singleton_lazy_init
FAILED tests/unit/test_race_detector.py::test_counter_no_atomic_python
```

**a) `test_analyze_no_auth`** — expect `401 Unauthorized` khi thiếu token, nhưng thực tế trả `403 Forbidden`. Không chặn tích hợp (BE luôn gửi kèm token) nhưng sai theo đúng chuẩn HTTP semantics; test đang mô tả đúng behavior mong muốn, code chưa khớp.

**b) 5 test còn lại đều thuộc `race_detector.py`, pattern cho Python** (`global_var_thread`, `shared_list_no_lock`, `missing_join`, `singleton_lazy_init`, `counter_no_atomic`) — detector không nhận diện được các pattern race-condition cơ bản trong code Python dùng `threading`. Coi bằng regex/pattern detector cho JS/TS hoạt động tốt (test JS pass), nhưng **phần hỗ trợ Python đang thiếu/hỏng**.

→ Nếu sản phẩm có ý định hỗ trợ phân tích code Python (FE hiện có option chọn `python` trong dropdown ngôn ngữ), tính năng này **chưa dùng được thực tế**.

---

## 3. README hướng dẫn chạy test sai đường dẫn

`ThreadLearn-AI-Trainning/server/README.md` dòng 254:
```bash
cd ThreadLearn-AI-Trainning/server/server
pytest ../tests/ -v
```
Path `../tests/` từ `server/server` trỏ tới `ThreadLearn-AI-Trainning/server/tests` — **đúng thực ra**, nhưng lệnh `cd` ở dòng trước lại dùng full path `ThreadLearn-AI-Trainning/server/server` tính từ root repo, nên nếu người dùng đã ở trong `ThreadLearn-AI-Trainning/` rồi chạy đúng path này sẽ report "No such directory". Cách chạy đúng đã verify:
```bash
cd ThreadLearn-AI-Trainning/server/server   # (từ root D:\FPT\WDP301\WDP-Code)
python -m pytest ../tests/ -v
```
→ README chỉ cần làm rõ path là tính từ đâu (từ root repo hay từ `ThreadLearn-AI-Trainning/`).

---

## 4. Không có test riêng cho module `ai` (BE, TypeScript)

`ThreadLearn_WEB_BE/src/modules/ai/` không có file `.spec.ts` nào. 22 test hiện có (`quiz`, `subscription`, `bugfix-regression`) không đụng tới module AI. Nghĩa là:
- Thay đổi vừa merge (gọi HTTP thật, ký JWT, map response) **chưa có test tự động bảo vệ** — nếu ai đó sửa lại service này sau này, không có gì báo lỗi regression.

Khuyến nghị (không tự làm, để bạn quyết định có muốn thêm không): viết `request-recommendation.service.spec.ts` mock `HttpService`, verify:
- JWT được ký đúng payload/secret.
- Request gửi đúng shape `{code, language, user_id}`.
- Map response `issues[]` → `suggestions`/`raceConditions`/`optimizedCode` đúng logic.
- Daily limit vẫn chặn đúng khi vượt quota.

---

## Việc đã verify OK

- BE gọi đúng endpoint `POST {AI_API_URL}/api/v1/ai/analyze` với JWT ký bằng `JWT_ACCESS_SECRET`, secret khớp với `JWT_SECRET` phía AI server (đã kiểm tra tên biến, không in giá trị thật).
- Response shape từ AI server (`user_id, language, issues[], docs_used[], cached`) khớp với `AnalyzeResponse` interface trong `request-recommendation.service.ts`.
- `GET /health` AI server hoạt động bình thường, model + retriever load thành công (`retriever_docs: 2050`).
- FE (`AIPage.tsx`, `aiService.analyzeCode`) type-check và lint sạch, form input code+language khớp DTO BE.

## Đã fix (2026-07-10)

1. **`auth.py`** — `HTTPBearer()` → `HTTPBearer(auto_error=False)` + tự raise `401` khi thiếu header. Trước đó FastAPI mặc định trả `403` khi thiếu token hoàn toàn, sai với `test_analyze_no_auth`.
2. **`race_detector.py`** — thêm 4 detector Python: `global_var_thread`, `shared_list_no_lock`, `missing_join`, `singleton_lazy_init`. Trước đó `detectRaceConditions()` early-return `[]` cho mọi ngôn ngữ khác JS/TS, nên toàn bộ input `language="python"` không phân tích gì cả.
3. **README.md** (AI-Trainning/server) — làm rõ lệnh `pytest ../tests/ -v` chạy từ `server/server` (tính từ root repo).
4. **BE**: thêm `request-recommendation.service.spec.ts` (7 test) — cover: gọi đúng endpoint/payload/JWT header, map issues→suggestions/raceConditions/optimizedCode, reject khi thiếu inputCode/user không tồn tại, daily-limit free/premium, propagate lỗi khi AI service down.

**Kết quả sau fix:**
- AI server pytest: **90/90 pass** (trước: 84/90).
- BE jest: **29/29 pass** (trước: 22/22, +7 test mới cho module ai).
- Type-check BE/FE: sạch.

## Còn lại — cần bạn tự thao tác

**HF Space (`threadlearn-ai2-api`) không kết nối được** — xem hướng dẫn fix ngay bên dưới. Đây là vấn đề hạ tầng/config ngoài phạm vi sửa code được.

---

## Hướng dẫn fix HF Space (threadlearn-ai2-api)

Lỗi gặp phải khi test: `[hf_inference] Error: <urlopen error [Errno 11001] getaddrinfo failed>` rồi `Loi goi HF Space: HTTP Error 503`.

`getaddrinfo failed` nghĩa là máy chạy AI server **không resolve được DNS** của domain HF Space — khác với lỗi timeout/503 do cold-start. Kiểm tra theo thứ tự:

1. **Xác nhận Space còn tồn tại và đang chạy**
   - Vào https://huggingface.co/spaces → tìm Space `threadlearn-ai2-api` (hoặc tên bạn đặt).
   - Nếu Space "Sleeping" (do free tier tự sleep sau không dùng) → bấm vào Space để nó tự wake up, đợi 1-2 phút rồi thử lại.
   - Nếu Space báo lỗi build/crash → xem tab "Logs" trong Space để biết lý do (thường do thiếu `HF_TOKEN` secret hoặc lỗi cài đặt Dockerfile).

2. **Lấy đúng URL Space và kiểm tra biến `HF_API_URL`/tương đương trong `ThreadLearn-AI-Trainning/server/server/.env`**
   - URL chuẩn dạng: `https://<username>-<space-name>.hf.space`
   - Mở Space trên trình duyệt, copy URL từ thanh địa chỉ (không phải link `huggingface.co/spaces/...`, mà link dạng `.hf.space` khi Space đã "Running").
   - Cập nhật đúng biến env dùng để gọi HF Space (`grep -rn "hf.space\|HF_" server/server/config.py` để biết tên biến chính xác — không dán giá trị bí mật ra ngoài khi làm việc này).

3. **Kiểm tra `HF_TOKEN`**
   - Token bạn dán vào chat trước đó (`hf_hbD...`) **phải được revoke ngay** nếu chưa làm (huggingface.co/settings/tokens) vì đã lộ trong lịch sử chat.
   - Tạo token mới, set làm secret **trên chính Space đó** (Space Settings → Variables and secrets → `HF_TOKEN`), không đặt trong `.env` của `ThreadLearn-AI-Trainning/server/server` trừ khi code AI server cần nó để tự gọi tiếp ra ngoài.

4. **Test lại kết nối thủ công** (không qua BE, gọi thẳng Space):
   ```bash
   curl https://<username>-<space-name>.hf.space/health
   ```
   Nếu lệnh này cũng fail DNS → vấn đề nằm ở mạng máy bạn (firewall/proxy chặn `*.hf.space`) hoặc Space đã bị xoá/đổi tên, không phải lỗi code.

5. Sau khi curl thành công, chạy lại smoke test `/api/v1/ai/analyze` như report này đã làm để xác nhận field `fix` trả về code sửa thật, không còn message lỗi.
