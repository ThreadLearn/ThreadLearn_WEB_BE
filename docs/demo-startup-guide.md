# Demo Startup Guide — ThreadLearn

Trình tự khởi động các service trước khi demo. Có 4 phần: DB/Cache, AI service, Backend, Frontend.

## 0. Trước khi bắt đầu — checklist

- [ ] Không có process nào khác đang giữ port `5000` (BE), `3001` (FE), `8001` (AI server) — xem mục "Lỗi thường gặp" nếu dính port conflict.
- [ ] DNS máy resolve được `*.mongodb.net` (nếu mạng chặn port 53, xem `DATABASE_URL` trong `.env` đã dùng connection string dạng standard `mongodb://...` chưa, không phải `mongodb+srv://`).
- [ ] `.env` các repo đã điền đủ secret cần thiết (`JWT_ACCESS_SECRET` phải **khớp** giữa `ThreadLearn_WEB_BE/.env` và `ThreadLearn-AI-Trainning/server/server/.env` — biến `JWT_SECRET` bên AI server).

---

## 1. Khởi động AI service (port 8001)

```bash
cd ThreadLearn-AI-Trainning/server/server
python -m uvicorn main:app --reload --port 8001
```

Verify:
```bash
curl http://localhost:8001/health
# → {"status":"ok","retriever_docs":2050}
```

**Vì sao chạy trước:** BE gọi AI service đồng bộ khi user bấm "Analyze" — nếu AI service chưa lên, request `/ai/recommendation` từ BE sẽ timeout/lỗi (không chặn BE start, nhưng demo tính năng AI sẽ fail).

---

## 2. Khởi động Backend (port 5000)

```bash
cd ThreadLearn_WEB_BE
npm run start:dev
```

Verify — đợi log:
```
[Nest] ... Nest application successfully started
ThreadLearn NestJS server is running at http://localhost:5000
```

Swagger: http://localhost:5000/api/docs

**Lưu ý quan trọng:** nếu log dừng ở `🔌 Connecting to MongoDB...` quá 10 giây rồi crash với `querySrv ECONNREFUSED` → DNS SRV lookup bị mạng chặn. Fix: đổi `DATABASE_URL` trong `.env` sang standard connection string với `directConnection=true` (xem comment trong `.env`), không dùng `+srv`.

---

## 3. Khởi động Frontend (port 3001)

```bash
cd ThreadLearn_WEB_FE
npm run dev
```

Mở: http://localhost:3001

---

## 4. Trình tự demo tính năng (thứ tự thao tác trên UI)

1. **Register** (`/register`) — tạo tài khoản mới. Dùng email **chưa từng đăng ký** (email đã tồn tại sẽ báo "Email may already be in use" — không phải bug, kiểm tra Mongo trước nếu nghi ngờ).
2. Verify OTP (dev mode: OTP hiển thị thẳng trong response `Registration successful. OTP sent (dev: xxxxxx)`, không cần đọc email thật).
3. **Login** (`/login`).
4. Vào **AI Advisor / Code Analyzer** (`/ai`) — dán code JS/TS/Python có vấn đề concurrency, bấm "Analyze". Xem kết quả trả về từ AI service thật (port 8001) qua BE.
5. Xem **AI history** — danh sách các lần phân tích trước đó, hiển thị dưới form.

---

## Lỗi thường gặp

### `EADDRINUSE: address already in use 0.0.0.0:5000`
Có process cũ vẫn giữ port. Kiểm tra và dừng trước khi start lại:
```powershell
Get-NetTCPConnection -LocalPort 5000 -State Listen | Select-Object -ExpandProperty OwningProcess
Stop-Process -Id <PID> -Force
```
Nếu có **2 PID cùng lúc** trả về — nghĩa là 2 instance backend đang chạy song song, request sẽ bị route ngẫu nhiên giữa 2 process (có thể trả 404 dù route tồn tại ở instance kia). Luôn đảm bảo chỉ 1 instance BE chạy tại một thời điểm trước khi demo.

### `querySrv ECONNREFUSED _mongodb._tcp.<cluster>.mongodb.net`
DNS SRV lookup bị mạng/router chặn (thường ở mạng công ty/trường ép DNS riêng). Cách xác nhận:
```bash
nslookup -type=SRV _mongodb._tcp.<cluster>.mongodb.net
nslookup google.com   # nếu domain thường cũng fail → toàn bộ port 53 UDP bị chặn, không riêng Mongo
```
Nếu trình duyệt vẫn vào web bình thường (dùng DNS-over-HTTPS ngầm) nhưng `nslookup`/Node fail → xác nhận đúng nguyên nhân. Fix tạm: đổi `DATABASE_URL` sang standard connection string, connect trực tiếp 1 shard host với `directConnection=true` (xem `.env`).

### AI Analyze trả kết quả nhưng `fix` field là message lỗi tiếng Việt (vd "Loi ket noi toi HF Space")
AI service (`ThreadLearn-AI-Trainning/server`) đang cấu hình `LLM_PROVIDER` gọi ra HuggingFace Space ngoài nhưng kết nối thất bại (Space sleep/xoá, hoặc mạng chặn). Request vẫn trả `200 OK` (đây là hạn chế thiết kế hiện tại, không phải bug mới) nhưng nội dung fix không dùng được cho demo. Kiểm tra Space còn "Running" trên huggingface.co/spaces trước khi demo, hoặc đổi `LLM_PROVIDER=mock` để demo an toàn không phụ thuộc mạng ngoài.

### "Email already registered" / "Email may already be in use" khi Register
Email đã tồn tại trong Mongo. Không phải lỗi — dùng email khác, hoặc "Sign in" / "Forgot password" nếu tài khoản là của bạn.
