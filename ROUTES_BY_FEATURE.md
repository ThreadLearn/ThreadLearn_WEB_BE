# API Routes by Feature

Base URL:

- `http://localhost:5000`

Conventions:

- All API routes below are under `/api/v1` unless stated otherwise.
- Protected routes require `Authorization: Bearer <access_token>`.
- Admin-only routes require authenticated user role `ADMIN`.
- Swagger UI is served at `/api/docs`.

## Authentication

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/session` protected

### Email verification & password reset

- `POST /api/v1/auth/verify-email`
- `POST /api/v1/auth/resend-verification`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`

### Google OAuth

- `GET /api/v1/auth/google` redirects to Google consent screen
- `GET /api/v1/auth/google/callback` exchanges the code and redirects to the frontend

GitHub login is not supported.

## Users

- `GET /api/v1/users/profile` protected
- `POST /api/v1/users/avatar` protected, multipart field: `avatar`

## Courses

- `GET /api/v1/courses`
  - Query: `page=1`, `limit=10`, `search=keyword`
- `POST /api/v1/courses` protected, ADMIN
- `GET /api/v1/courses/:id`

## Lessons

- `GET /api/v1/lessons/:id`
- `POST /api/v1/lessons/:id/attachment` protected, ADMIN, multipart field: `attachment`

## Quiz

- `POST /api/v1/quiz/submit` protected

## Notifications

- `GET /api/v1/notifications` protected
  - Query: `unread=true`
- `PATCH /api/v1/notifications/:id` protected

## Leaderboard

- `GET /api/v1/leaderboard`
  - Query: `limit=10`

## AI

- `POST /api/v1/ai/recommendation` protected
- `GET /api/v1/ai/recommendation` protected

## Admin

- `GET /api/v1/admin/stats` protected, ADMIN
- `POST /api/v1/admin/execute` protected, ADMIN

### Admin — Student management

- `POST /api/v1/admin/students` protected, ADMIN
- `GET /api/v1/admin/students` protected, ADMIN
  - Query: `page=1`, `limit=20`, `search`, `isActive`, `isVerified`
- `PATCH /api/v1/admin/students/:id` protected, ADMIN
- `PATCH /api/v1/admin/students/:id/lock` protected, ADMIN
- `PATCH /api/v1/admin/students/:id/unlock` protected, ADMIN

### Admin — Dashboard statistics

- `GET /api/v1/admin/dashboard/statistics` protected, ADMIN
  - Query: `from`, `to`, `months=6`

## System

- `GET /api/v1/health`
- `GET /api/docs`
- `GET /api/v1/docs` redirects to `/api/docs`
