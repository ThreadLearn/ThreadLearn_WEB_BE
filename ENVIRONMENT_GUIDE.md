# Hướng Dẫn Cấu Hình Biến Môi Trường (Environment Variables Guide)

Tài liệu này hướng dẫn cách cấu hình chi tiết các biến môi trường cho dự án **ThreadLearn Backend** trong các môi trường khác nhau: **Local Development**, **GitHub Actions (CI/CD)**, và **Production Deployment (Docker / VPS / Cloud)**.

---

## 1. Danh Sách Các Biến Môi Trường (Environment Variables)

Dưới đây là chi tiết các biến môi trường được định nghĩa trong hệ thống validation Zod (`src/configs/env.ts`):

| Tên Biến | Bắt Buộc | Giá Trị Mặc Định | Mô Tả & Khuyên Dùng |
| :--- | :---: | :---: | :--- |
| `PORT` | Không | `3000` (đã chỉnh thành `5000` ở server) | Cổng chạy của backend server. |
| `NODE_ENV` | Không | `development` | Môi trường chạy (`development`, `production`, `test`). |
| `DATABASE_URL` | **Có** | - | Chuỗi kết nối MongoDB (ví dụ: `mongodb://localhost:27017/threadlearn`). |
| `REDIS_URL` | Không | `redis://localhost:6379` | Chuỗi kết nối Redis dùng cho Leaderboard & Rate Limiting. |
| `RATE_LIMIT_LIMIT` | Không | `100` | Số lượng request tối đa trong một chu kỳ rate limit. |
| `RATE_LIMIT_WINDOW_MS`| Không | `900000` (15 phút) | Khoảng thời gian chu kỳ rate limit tính bằng mili-giây. |
| `JWT_ACCESS_SECRET` | **Có** | - | Chuỗi bí mật dùng để mã hóa Access Token (nên dùng chuỗi ngẫu nhiên dài). |
| `JWT_REFRESH_SECRET`| **Có** | - | Chuỗi bí mật dùng để mã hóa Refresh Token. |
| `JWT_ACCESS_EXPIRES_IN`| Không| `15m` | Thời gian hết hạn của Access Token (ví dụ: `15m`, `1h`). |
| `JWT_REFRESH_EXPIRES_IN`| Không| `7d` | Thời gian hết hạn của Refresh Token (ví dụ: `7d`, `30d`). |
| `NEXTAUTH_URL` | Không | `http://localhost:3000` | URL trang chủ của ứng dụng NextAuth (Production: đổi thành domain thật). |
| `NEXTAUTH_SECRET` | Không | `your_nextauth_jwt_secret` | Chuỗi bí mật dùng mã hóa session JWT của NextAuth. |
| `GOOGLE_CLIENT_ID` | Không | - | OAuth Client ID của Google (dùng cho đăng nhập Google). |
| `GOOGLE_CLIENT_SECRET`| Không| - | OAuth Client Secret của Google. |
| `GITHUB_CLIENT_ID` | Không | - | OAuth Client ID của GitHub. |
| `GITHUB_CLIENT_SECRET`| Không| - | OAuth Client Secret của GitHub. |
| `JUDGE0_API_URL` | Không | `https://api.judge0.com`| URL API của Judge0 phục vụ chấm bài/chạy thử code IDE. |
| `JUDGE0_API_KEY` | Không | - | API Key của Judge0 nếu sử dụng bản Cloud trả phí. |
| `UPLOAD_DIR` | Không | `./public/uploads` | Thư mục lưu trữ file upload (avatar, attachments). |
| `MAX_FILE_SIZE_MB` | Không | `10` | Kích thước file tối đa được phép upload (MB). |

---

## 2. Cấu Hình Cho Từng Môi Trường (Environments)

### A. Môi Trường Local Development (Chạy trên máy cá nhân)
Để chạy dự án local, bạn chỉ cần tạo file `.env` ở thư mục gốc của dự án:
1. Copy từ file mẫu:
   ```bash
   cp .env.example .env
   ```
2. Mở file `.env` ra và điền các giá trị thật phù hợp với máy cá nhân của bạn (ví dụ: cài đặt MongoDB Compass và lấy URL kết nối điền vào `DATABASE_URL`).

---

### B. Môi Trường GitHub Actions (CI/CD Pipeline)
Khi chạy CI/CD, GitHub Actions cần biên dịch Next.js (`next build`) và kiểm tra kiểu dữ liệu. Vì Next.js biên dịch tĩnh các API routes, Zod sẽ kiểm tra các biến môi trường bắt buộc.

Chúng ta sử dụng **GitHub Secrets** để bảo mật và truyền các biến này:
1. Truy cập vào Repo GitHub của bạn.
2. Vào **Settings** -> **Secrets and variables** -> **Actions**.
3. Nhấp chọn **New repository secret** và thêm các biến thử nghiệm (fake/dummy values) dưới đây để vượt qua bước kiểm tra biên dịch:
   - `DATABASE_URL`: `mongodb://localhost:27017/threadlearn` (hoặc chuỗi kết nối thực tế nếu chạy test tích hợp)
   - `JWT_ACCESS_SECRET`: `test-access-secret-key-12345`
   - `JWT_REFRESH_SECRET`: `test-refresh-secret-key-12345`
   - `NEXTAUTH_SECRET`: `test-nextauth-secret-key-12345`

*Lưu ý: Các biến này đã được cấu hình tự động trỏ đến GitHub Secrets trong tệp `.github/workflows/ci.yml`.*

---

### C. Môi Trường Production Deployment (Triển khai thực tế qua Docker)
Khi bạn đóng gói ứng dụng bằng Docker và triển khai lên VPS hoặc máy chủ Production:

#### 1. Biên dịch Docker Image (Build-time)
Chúng ta đã cấu hình sẵn trong `Dockerfile` để tự động chèn các biến môi trường **giả lập (dummy values)** phục vụ riêng cho bước biên dịch code (`npm run build`). Bạn **không cần làm gì cả** ở bước build này vì các biến giả lập đã được cô lập an toàn trong lệnh build của `Dockerfile`:
```dockerfile
RUN DATABASE_URL="mongodb://localhost:27017/dummy" \
    JWT_ACCESS_SECRET="dummy_access" \
    JWT_REFRESH_SECRET="dummy_refresh" \
    NEXTAUTH_SECRET="dummy_nextauth_secret" \
    npm run build
```

#### 2. Khởi chạy Docker Container (Runtime - Cực kỳ quan trọng)
Khi chạy container, bạn **bắt buộc phải truyền các biến môi trường THỰC TẾ** để backend kết nối tới database thật và hoạt động chính xác.

##### Cách 1: Sử dụng Docker Compose (Khuyên dùng)
Chỉnh sửa file `docker-compose.yml` của bạn, khai báo các biến thật dưới phần `environment`:
```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "5000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=mongodb+srv://<username>:<password>@cluster.mongodb.net/threadlearn?retryWrites=true&w=majority # MongoDB Atlas/Real URL
      - REDIS_URL=redis://redis:6379
      - JWT_ACCESS_SECRET=your-super-secure-production-access-key-here-999
      - JWT_REFRESH_SECRET=your-super-secure-production-refresh-key-here-999
      - NEXTAUTH_SECRET=your-production-nextauth-secret-here
      - NEXTAUTH_URL=https://api.threadlearn.com # Domain thật của BE
      - GOOGLE_CLIENT_ID=google-id-real
      - GOOGLE_CLIENT_SECRET=google-secret-real
    depends_on:
      - redis
```

##### Cách 2: Chạy trực tiếp bằng dòng lệnh Docker
Chạy lệnh `docker run` kèm theo cờ `-e` để truyền các giá trị thật:
```bash
docker run -d \
  -p 5000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL="mongodb+srv://real-mongodb-url" \
  -e JWT_ACCESS_SECRET="real-access-secret" \
  -e JWT_REFRESH_SECRET="real-refresh-secret" \
  -e NEXTAUTH_SECRET="real-nextauth-secret" \
  --name threadlearn-backend-container \
  threadlearn-backend
```

---

## 3. Một Số Lưu Ý Bảo Mật
1. **Không commit file `.env` lên GitHub**: File `.env` chứa mật khẩu và khóa bí mật thực tế. Luôn đảm bảo `.env` nằm trong danh sách `.gitignore`.
2. **Thay đổi khóa định kỳ**: `JWT_ACCESS_SECRET` và `JWT_REFRESH_SECRET` trên Production nên được tạo ngẫu nhiên bằng công cụ bảo mật (ví dụ: chạy lệnh `openssl rand -base64 32` trong terminal) để đảm bảo độ an toàn cao nhất.
