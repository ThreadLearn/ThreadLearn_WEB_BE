# DEV4 Subscription Payment E2E Guide

Mục tiêu của phase này là nghiệm thu đầy đủ UC51-UC52 từ góc nhìn thật của hệ thống:

- Admin quản lý gói dịch vụ.
- Student mua gói.
- Backend tạo purchase và payment URL.
- Payment gateway callback/webhook kích hoạt subscription.
- Frontend hiển thị trạng thái gói hiện tại.

Guide này dùng được cho hai luồng:

- **Mock payment**: phù hợp demo local, không cần tài khoản PayOS.
- **PayOS payment**: phù hợp kiểm thử tích hợp gateway thật/sandbox.

## 1. Điều Kiện Trước Khi Test

### 1.1. Pull Code Mới Nhất

```powershell
cd "D:\FPT\Project WDP301\ThreadLearn_WEB_BE"
git checkout develop
git pull --ff-only origin develop

cd "D:\FPT\Project WDP301\ThreadLearn_WEB_FE"
git checkout develop
git pull --ff-only origin develop
```

### 1.2. Backend `.env`

Với mock payment local:

```env
PORT=5000
FRONTEND_URL=http://localhost:3001
PAYMENT_GATEWAY_MODE=mock
VNP_RETURN_URL=http://localhost:3001/pricing/callback
VNP_IPN_URL=http://localhost:5000/api/v1/subscription/webhook/payment
```

Nếu dùng MongoDB Atlas SRV và máy local bị lỗi DNS:

```env
DNS_SERVERS=8.8.8.8,1.1.1.1
```

Chỉ dùng `DNS_SERVERS` khi kết nối `mongodb+srv://`. Nếu dùng Atlas Private Endpoint/VPC, ưu tiên DNS nội bộ thay vì public DNS.

Với PayOS:

```env
PAYMENT_GATEWAY_MODE=payos
PAYOS_CLIENT_ID=<client-id>
PAYOS_API_KEY=<api-key>
PAYOS_CHECKSUM_KEY=<checksum-key>
PAYOS_RETURN_URL=http://localhost:3001/pricing/callback
PAYOS_CANCEL_URL=http://localhost:3001/pricing/callback?status=cancelled
PAYOS_WEBHOOK_URL=http://localhost:5000/api/v1/subscription/webhook/payment
```

### 1.3. Frontend `.env.local`

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
```

### 1.4. Seed Dữ Liệu

Seed sẽ tạo sẵn user, subscription plans, purchase mẫu, quiz, leaderboard data.

```powershell
cd "D:\FPT\Project WDP301\ThreadLearn_WEB_BE"
npm run db:seed
```

Tài khoản seed:

```text
Admin:
admin@threadlearn.com / Admin@123

Student premium:
student@threadlearn.com / Student@123

Student free:
bob@threadlearn.com / Student@123
```

Nên dùng `bob@threadlearn.com` để test mua gói vì đây là tài khoản Free.

## 2. Chạy Ứng Dụng

Terminal backend:

```powershell
cd "D:\FPT\Project WDP301\ThreadLearn_WEB_BE"
npm run start:dev
```

Backend pass khi thấy:

```text
Successfully connected to MongoDB database.
```

Kiểm tra health:

```powershell
Invoke-RestMethod http://localhost:5000/api/v1/health
```

Terminal frontend:

```powershell
cd "D:\FPT\Project WDP301\ThreadLearn_WEB_FE"
npm run dev
```

Frontend mặc định chạy ở:

```text
http://localhost:3001
```

## 3. Luồng Test Bằng UI

### 3.1. Admin Kiểm Tra Gói Dịch Vụ

1. Mở `http://localhost:3001/login`.
2. Login admin:

```text
admin@threadlearn.com
Admin@123
```

3. Mở `/admin/plans`.
4. Kiểm tra có các plan seed:
   - Free
   - Premium Monthly
   - Premium Semester
5. Tạo một plan test mới nếu cần:
   - Name: `E2E Premium Test`
   - Price: `99000`
   - Currency: `VND`
   - Duration days: `30`
   - Features: `Premium lessons`, `AI recommendations`

Pass khi plan xuất hiện trong danh sách admin và không bị lỗi toast/API.

### 3.2. Student Tạo Purchase

1. Logout admin.
2. Login student Free:

```text
bob@threadlearn.com
Student@123
```

3. Mở `/pricing`.
4. Chọn plan Premium.
5. Bấm purchase.

Pass khi:

- API `POST /api/v1/subscription/purchase` trả `success=true`.
- Response có:
  - `id`
  - `planId`
  - `status=pending`
  - `transactionId`
  - `paymentUrl`
- FE redirect sang `paymentUrl`.

### 3.3. Mock Payment Callback

Khi `PAYMENT_GATEWAY_MODE=mock`, `paymentUrl` có dạng:

```text
/mock-payment/vnpay?...purchaseId=<purchaseId>&transactionId=<transactionId>
```

Mock page sẽ tự xác nhận webhook giả lập từ browser, chỉ dành cho local/demo.

Pass khi:

- Callback hiển thị payment success.
- Quay lại `/pricing`, current subscription của Bob chuyển sang active.
- API `GET /api/v1/subscription/my-subscription` trả `status=active`.

### 3.4. PayOS Callback

Khi `PAYMENT_GATEWAY_MODE=payos`:

1. FE redirect sang PayOS checkout.
2. Thanh toán thành công trên PayOS.
3. PayOS redirect browser về:

```text
http://localhost:3001/pricing/callback?purchaseId=...&transactionId=...&gateway=payos
```

4. FE callback thật **không gọi webhook từ browser**.
5. FE chỉ poll `GET /api/v1/subscription/my-subscription`.

Pass khi:

- Nếu webhook PayOS đã gọi backend: FE hiển thị success/current plan active.
- Nếu webhook chưa tới: FE hiển thị `Processing`, không báo fail sai.
- Backend webhook `POST /api/v1/subscription/webhook/payment` xử lý xong thì subscription active.

## 4. Luồng Test Bằng API PowerShell

Phần này giúp nghiệm thu nhanh khi không muốn thao tác UI.

### 4.1. Khai Báo Base URL

```powershell
$base = "http://localhost:5000/api/v1"
```

### 4.2. Login Admin

```powershell
$adminLogin = Invoke-RestMethod `
  -Method Post `
  -Uri "$base/auth/login" `
  -ContentType "application/json" `
  -Body (@{
    email = "admin@threadlearn.com"
    password = "Admin@123"
  } | ConvertTo-Json)

$adminToken = $adminLogin.data.accessToken
```

### 4.3. Login Student Free

```powershell
$studentLogin = Invoke-RestMethod `
  -Method Post `
  -Uri "$base/auth/login" `
  -ContentType "application/json" `
  -Body (@{
    email = "bob@threadlearn.com"
    password = "Student@123"
  } | ConvertTo-Json)

$studentToken = $studentLogin.data.accessToken
```

### 4.4. Lấy Danh Sách Plan

```powershell
$plans = Invoke-RestMethod `
  -Method Get `
  -Uri "$base/subscription/plans" `
  -Headers @{ Authorization = "Bearer $studentToken" }

$plans.data | Select-Object id,name,price,currency,durationDays,isActive
```

Chọn plan trả phí:

```powershell
$planId = ($plans.data | Where-Object { $_.price -gt 0 -and $_.isActive -eq $true } | Select-Object -First 1).id
$planId
```

### 4.5. Tạo Purchase

```powershell
$purchase = Invoke-RestMethod `
  -Method Post `
  -Uri "$base/subscription/purchase" `
  -Headers @{ Authorization = "Bearer $studentToken" } `
  -ContentType "application/json" `
  -Body (@{ planId = $planId } | ConvertTo-Json)

$purchase.data | Select-Object id,planId,amount,currency,status,transactionId,paymentUrl
```

Expected:

```text
status = pending
paymentUrl != empty
```

### 4.6. Mock Webhook Thành Công

Chỉ dùng bước này khi `PAYMENT_GATEWAY_MODE=mock`.

```powershell
$purchaseId = $purchase.data.id
$transactionId = $purchase.data.transactionId
$amount = $purchase.data.amount

$webhook = Invoke-RestMethod `
  -Method Post `
  -Uri "$base/subscription/webhook/payment" `
  -ContentType "application/json" `
  -Body (@{
    purchaseId = $purchaseId
    transactionId = $transactionId
    status = "success"
    amount = "$amount"
  } | ConvertTo-Json)

$webhook.data | Select-Object id,status,paidAt
```

Expected:

```text
status = succeeded
paidAt != null
```

### 4.7. Kiểm Tra Subscription Active

```powershell
$mySub = Invoke-RestMethod `
  -Method Get `
  -Uri "$base/subscription/my-subscription" `
  -Headers @{ Authorization = "Bearer $studentToken" }

$mySub.data | Select-Object id,planId,status,startedAt,expiresAt
```

Expected:

```text
status = active
expiresAt > now
```

### 4.8. Retry Webhook Không Được Tạo Side-Effect Lặp

Gọi lại đúng webhook cũ:

```powershell
$retry = Invoke-RestMethod `
  -Method Post `
  -Uri "$base/subscription/webhook/payment" `
  -ContentType "application/json" `
  -Body (@{
    purchaseId = $purchaseId
    transactionId = $transactionId
    status = "success"
    amount = "$amount"
  } | ConvertTo-Json)

$retry.data | Select-Object id,status,paidAt
```

Expected:

```text
status vẫn là succeeded
không tạo thêm subscription trùng cho cùng purchase
```

## 5. PayOS Webhook Checklist

PayOS webhook thật cần public URL hoặc tunnel về máy local.

Ví dụ dùng ngrok:

```powershell
ngrok http 5000
```

Sau đó cập nhật:

```env
PAYOS_WEBHOOK_URL=https://<ngrok-domain>/api/v1/subscription/webhook/payment
```

Trong PayOS dashboard:

1. Đăng nhập PayOS.
2. Chọn kênh thanh toán.
3. Cấu hình webhook URL trỏ tới backend.
4. Đảm bảo Client ID/API Key/Checksum Key trong `.env` đúng.
5. Restart backend sau khi đổi `.env`.

Expected backend log khi PayOS webhook hợp lệ:

```text
Payment webhook processed successfully
```

Nếu webhook signature sai:

```text
Payment webhook verification failed
```

## 6. Tiêu Chí PASS Cuối Cùng

Một lượt nghiệm thu được coi là pass khi đủ các điểm:

- Admin xem/tạo/update/deactivate plan được.
- Student Free tạo purchase được.
- Purchase ban đầu có `status=pending`.
- Payment success webhook đổi purchase sang `succeeded`.
- `payment.succeeded` kích hoạt subscription active.
- `GET /subscription/my-subscription` trả active subscription.
- FE `/pricing` hiển thị current subscription.
- FE `/pricing/callback` không tự gọi webhook thật đối với PayOS.
- Retry webhook không tạo side-effect lặp.

## 7. Troubleshooting

### 7.1. FE báo `ERR_CONNECTION_REFUSED`

Backend chưa chạy hoặc crash.

```powershell
Invoke-RestMethod http://localhost:5000/api/v1/health
```

### 7.2. Login 400 Bad Request

Sai email/password hoặc user không tồn tại trong DB hiện tại.

Dùng seed account:

```text
admin@threadlearn.com / Admin@123
bob@threadlearn.com / Student@123
```

### 7.3. MongoDB `querySrv ECONNREFUSED`

Nếu dùng Atlas public SRV:

```env
DNS_SERVERS=8.8.8.8,1.1.1.1
```

Nếu dùng Mongo local:

```env
DATABASE_URL=mongodb://localhost:27017/threadlearn
DNS_SERVERS=
```

### 7.4. Purchase API 401

Thiếu header:

```text
Authorization: Bearer <studentToken>
```

### 7.5. Plan API 403 Khi Tạo/Sửa/Xóa

User không phải admin. Dùng:

```text
admin@threadlearn.com / Admin@123
```

### 7.6. PayOS Callback Về FE Nhưng Subscription Chưa Active

Đây là trạng thái hợp lệ nếu webhook server-to-server chưa tới backend.

Kiểm tra:

- Webhook URL trên PayOS có đúng backend public URL không.
- Backend có nhận request `POST /api/v1/subscription/webhook/payment` không.
- `PAYOS_CHECKSUM_KEY` có đúng không.
- Backend đã restart sau khi đổi `.env` chưa.

FE nên hiển thị `Processing`, không phải fail ngay.

## 8. Lệnh Nghiệm Thu Code Phase

Trước khi merge các thay đổi liên quan Dev4 payment/subscription, chạy:

```powershell
cd "D:\FPT\Project WDP301\ThreadLearn_WEB_BE"
npx tsc --noEmit
npm run lint
npm test -- --runInBand
npm run build

cd "D:\FPT\Project WDP301\ThreadLearn_WEB_FE"
npm run lint
npm run build
npx tsc --noEmit
```

