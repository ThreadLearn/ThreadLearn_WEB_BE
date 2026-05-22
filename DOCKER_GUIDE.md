# Hướng Dẫn Sử Dụng Docker (Docker Deployment Guide)

Tài liệu này cung cấp toàn bộ hướng dẫn đóng gói, biên dịch và chạy dự án **ThreadLearn Backend** dưới dạng Docker Container phục vụ cho việc kiểm thử cục bộ (local testing) và triển khai thực tế (production deployment).

---

## 1. Kiến Trúc Dockerfile của Dự Án

Dự án sử dụng cơ chế **Multi-Stage Build (4 Giai Đoạn)** để đảm bảo quá trình build đầy đủ tính năng nhưng Ảnh Docker đầu ra (Production Image) vẫn siêu nhẹ, bảo mật và hiệu năng cao:

1. **Stage 1 (deps)**: Cài đặt toàn bộ dependencies (bao gồm cả `devDependencies` phục vụ cho việc biên dịch TypeScript và Next.js).
2. **Stage 2 (builder)**: Sao chép mã nguồn và biên dịch dự án (`npm run build`). Giai đoạn này sử dụng các biến môi trường giả lập (dummy) để vượt qua bước tĩnh phân giải API routes.
3. **Stage 3 (prod-deps)**: Tạo một môi trường tạm cài đặt duy nhất các thư viện chạy thực tế ở môi trường production (`--omit=dev`).
4. **Stage 4 (runner)**: Tạo ảnh Docker cuối cùng siêu gọn bằng cách gom các tệp đã được compile từ Stage 2 và thư viện rút gọn từ Stage 3. Ảnh chạy dưới quyền user bảo mật `nextjs` (non-root).

---

## 2. Hướng Dẫn Đóng Gói Docker Image (Build)

Để tiến hành đóng gói dự án thành một Docker Image, bạn hãy đứng ở thư mục gốc của dự án (nơi có chứa file `Dockerfile`) và chạy các lệnh tương ứng:

### A. Đóng gói thông thường (Khuyên dùng khi lập trình)
Lệnh này sẽ sử dụng bộ nhớ đệm (Cache) của Docker đối với những phần thư viện không thay đổi để tăng tốc quá trình build:
```bash
docker build -t threadlearn-backend .
```

### B. Đóng gói sạch từ đầu (Khuyên dùng khi cập nhật thư viện lớn hoặc sửa Dockerfile)
Lệnh này bỏ qua toàn bộ cache cũ, ép Docker tải mới thư viện và build lại hoàn chỉnh từ đầu nhằm tránh lỗi xung đột cache:
```bash
docker build --no-cache -t threadlearn-backend .
```

---

## 3. Hướng Dẫn Chạy Docker Container (Run)

Sau khi build thành công, bạn có thể khởi chạy ứng dụng bằng các cách sau:

### Cách 1: Sử dụng tệp cấu hình `.env` có sẵn (Tiện lợi nhất)
Nếu bạn đã có sẵn tệp cấu hình môi trường `.env` ở local, bạn chỉ cần chạy lệnh sau để truyền toàn bộ cấu hình vào Docker Container:
```bash
docker run -d \
  -p 5000:3000 \
  --name threadlearn-backend-instance \
  --env-file .env \
  threadlearn-backend
```
*Giải thích cờ lệnh:*
- `-d`: Chạy ngầm container dưới nền (detached mode).
- `-p 5000:3000`: Ánh xạ cổng `3000` bên trong container ra cổng `5000` của máy thật (Host).
- `--name`: Đặt tên dễ nhớ cho container đang chạy.
- `--env-file .env`: Nạp trực tiếp tệp biến môi trường `.env` vào container.

### Cách 2: Truyền biến môi trường trực tiếp từ dòng lệnh
Nếu bạn muốn cấu hình nhanh một số tham số mà không cần file `.env`:
```bash
docker run -d \
  -p 5000:3000 \
  --name threadlearn-backend-instance \
  -e NODE_ENV=production \
  -e DATABASE_URL="mongodb://localhost:27017/threadlearn" \
  -e JWT_ACCESS_SECRET="your_access_secret_here" \
  -e JWT_REFRESH_SECRET="your_refresh_secret_here" \
  threadlearn-backend
```

---

## 4. Chạy Đồng Bộ Bằng Docker Compose (Khuyên dùng cho Local Dev / VPS)

Để chạy dự án bao gồm đầy đủ hệ sinh thái: **Backend + Database MongoDB + Redis Cache** mà không cần cài đặt lẻ tẻ trên máy tính của bạn, hãy tạo một tệp tin tên là `docker-compose.yml` ở thư mục gốc với nội dung mẫu như sau:

```yaml
version: '3.8'

services:
  # 1. MongoDB Database Service
  mongodb:
    image: mongo:6.0
    container_name: threadlearn-mongodb
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    restart: always

  # 2. Redis Cache Service
  redis:
    image: redis:7-alpine
    container_name: threadlearn-redis
    ports:
      - "6379:6379"
    restart: always

  # 3. Backend Service
  backend:
    build: .
    container_name: threadlearn-backend-app
    ports:
      - "5000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=mongodb://mongodb:27017/threadlearn
      - REDIS_URL=redis://redis:6379
      - JWT_ACCESS_SECRET=your_super_jwt_access_secret_key_9999
      - JWT_REFRESH_SECRET=your_super_jwt_refresh_secret_key_9999
      - NEXTAUTH_SECRET=your_nextauth_secret_key_9999
    depends_on:
      - mongodb
      - redis
    restart: always

volumes:
  mongo_data:
```

### Các câu lệnh quản lý Docker Compose:
- **Khởi động toàn bộ hệ thống ngầm:**
  ```bash
  docker-compose up -d
  ```
- **Xem nhật ký hoạt động (Logs) trực tiếp:**
  ```bash
  docker-compose logs -f backend
  ```
- **Dừng và xóa bỏ các Container đang chạy:**
  ```bash
  docker-compose down
  ```

---

## 5. Các Lệnh Quản Trị Docker Tiện Ích

Khi vận hành ứng dụng qua Docker, bạn sẽ thường xuyên sử dụng các dòng lệnh sau:

- **Xem danh sách các Container đang chạy:**
  ```bash
  docker ps
  ```
- **Xem logs hoạt động của Backend:**
  ```bash
  docker logs -f threadlearn-backend-instance
  ```
- **Dừng Container Backend:**
  ```bash
  docker stop threadlearn-backend-instance
  ```
- **Khởi động lại Container Backend:**
  ```bash
  docker start threadlearn-backend-instance
  ```
- **Xóa bỏ Container Backend sau khi dừng:**
  ```bash
  docker rm threadlearn-backend-instance
  ```
- **Dọn dẹp hệ thống Docker (Xóa bỏ các ảnh/logs thừa không sử dụng để giải phóng ổ cứng):**
  ```bash
  docker system prune -f
  ```
