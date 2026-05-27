# API Routes by Feature

Base URL:

- <http://localhost:5000>

Conventions:

- All API routes below are under /api/v1 unless stated otherwise.
- Protected routes require header: Authorization: Bearer <access_token>
- Admin-only routes require role ADMIN.

Authentication (custom)

- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/auth/logout
- POST /api/v1/auth/refresh
- GET  /api/v1/auth/session (protected)

Authentication (NextAuth)

- GET  /api/auth/[...nextauth]
- POST /api/auth/[...nextauth]

Users

- GET  /api/v1/users/profile (protected)
- POST /api/v1/users/avatar (protected)

Courses

- GET  /api/v1/courses
- POST /api/v1/courses (protected, ADMIN)
- GET  /api/v1/courses/:id

Lessons

- GET  /api/v1/lessons/:id
- POST /api/v1/lessons/:id/attachment (protected, ADMIN)

Quiz

- POST /api/v1/quiz/submit (protected)

Notifications

- GET   /api/v1/notifications (protected)
  - Query: unread=true
- PATCH /api/v1/notifications/:id (protected)

Leaderboard

- GET /api/v1/leaderboard
  - Query: limit=10

AI

- POST /api/v1/ai/recommendation (protected)
- GET  /api/v1/ai/recommendation (protected)

Admin

- GET  /api/v1/admin/stats (protected, ADMIN)
- POST /api/v1/admin/execute (protected)

System

- GET /api/v1/health
- GET /api/v1/docs
