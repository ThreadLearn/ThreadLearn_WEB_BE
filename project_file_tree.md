# ThreadLearn Backend — Bố Cục Dự Án (Full File Tree)

```
ThreadLearn_WEB_BE/
│
│── Root Configuration ─────────────────────────────────
├── .env                          # Biến môi trường (local)
├── .env.example                  # Template biến môi trường
├── .eslintrc.json                # Cấu hình ESLint + @typescript-eslint
├── .prettierrc                   # Cấu hình Prettier
├── .gitignore                    # Git ignore rules
├── Dockerfile                    # Multi-stage Docker build
├── docker-compose.yml            # Docker Compose (app + MongoDB + Redis)
├── next.config.js                # Cấu hình Next.js
├── next-env.d.ts                 # Next.js TypeScript declarations
├── package.json                  # Dependencies & scripts
├── package-lock.json             # Lock file
├── README.md                     # Tài liệu dự án
├── server.ts                     # Custom HTTP Server (Next.js + Socket.IO)
├── tsconfig.json                 # TypeScript config chính
└── tsconfig.server.json          # TypeScript config cho server build
│
│── src/ ────────────────────────────────────────────────
│
├── app/                          # ═══ NEXT.JS APP ROUTER ═══
│   └── api/
│       │
│       ├── auth/
│       │   └── [...nextauth]/
│       │       └── route.ts              # NextAuth OAuth (Google/GitHub)
│       │
│       └── v1/                           # ═══ API v1 ROUTES ═══
│           │
│           ├── admin/
│           │   ├── execute/
│           │   │   └── route.ts          # POST — Code execution (Judge0)
│           │   └── stats/
│           │       └── route.ts          # GET  — Admin dashboard stats
│           │
│           ├── ai/
│           │   └── recommendation/
│           │       └── route.ts          # POST — AI recommendations
│           │                             # GET  — AI history logs
│           │
│           ├── auth/
│           │   ├── login/
│           │   │   └── route.ts          # POST — Email/password login
│           │   ├── register/
│           │   │   └── route.ts          # POST — User registration
│           │   ├── refresh/
│           │   │   └── route.ts          # POST — Refresh JWT tokens
│           │   ├── logout/
│           │   │   └── route.ts          # POST — Invalidate refresh token
│           │   └── session/
│           │       └── route.ts          # GET  — Current user session
│           │
│           ├── courses/
│           │   ├── route.ts              # GET  — List courses (paginated)
│           │   │                         # POST — Create course (Admin)
│           │   └── [id]/
│           │       └── route.ts          # GET  — Course detail + lessons
│           │
│           ├── docs/
│           │   └── route.ts              # GET  — Swagger JSON spec
│           │
│           ├── health/
│           │   └── route.ts              # GET  — Health check
│           │
│           ├── leaderboard/
│           │   └── route.ts              # GET  — Top XP rankings
│           │
│           ├── lessons/
│           │   └── [id]/
│           │       ├── route.ts          # GET  — Lesson detail
│           │       └── attachment/
│           │           └── route.ts      # POST — Upload lesson attachment
│           │
│           ├── notifications/
│           │   ├── route.ts              # GET  — User notifications
│           │   └── [id]/
│           │       └── route.ts          # PATCH — Mark notification as read
│           │
│           ├── quiz/
│           │   └── submit/
│           │       └── route.ts          # POST — Submit quiz attempt
│           │
│           └── users/
│               ├── avatar/
│               │   └── route.ts          # POST — Upload avatar
│               └── profile/
│                   └── route.ts          # GET  — User profile + stats
│                                         # PUT  — Update profile
│
├── common/                       # ═══ SHARED UTILITIES ═══
│   ├── api-handler.ts                    # Unified route wrapper (auth, validation, errors)
│   ├── api-response.ts                   # Standardized JSON response format
│   └── custom-error.ts                   # AppError classes (400, 401, 403, 404, 500)
│
├── configs/                      # ═══ APPLICATION CONFIG ═══
│   ├── db.ts                             # Mongoose connection (cached singleton)
│   ├── env.ts                            # Zod-validated environment variables
│   ├── logger.ts                         # Winston logger (console + file)
│   ├── redis.ts                          # Redis client (ioredis)
│   └── upload.ts                         # Multer disk storage config
│
├── database/                     # ═══ DATABASE LAYER ═══
│   └── models/
│       └── index.ts                      # Central model re-exports
│
├── middlewares/                  # ═══ MIDDLEWARE ═══
│   └── rate-limit.middleware.ts          # Redis sliding-window rate limiter
│
├── modules/                      # ═══ FEATURE MODULES (15) ═══
│   │
│   ├── admin/
│   │   └── services/
│   │       └── admin.service.ts          # User mgmt, course publishing, user deletion
│   │
│   ├── ai/
│   │   ├── models/
│   │   │   └── ai-history.model.ts       # Mongoose: AIHistory schema
│   │   └── services/
│   │       └── ai.service.ts             # Mock AI recommendations, history logs
│   │
│   ├── analytics/
│   │   └── services/
│   │       └── analytics.service.ts      # Enrollment/quiz aggregation pipelines
│   │
│   ├── auth/
│   │   ├── controllers/
│   │   │   └── auth.controller.ts        # Login, register, refresh, logout, session
│   │   ├── models/
│   │   │   ├── user.model.ts             # Mongoose: User schema
│   │   │   └── refresh-token.model.ts    # Mongoose: RefreshToken schema
│   │   ├── services/
│   │   │   └── auth.service.ts           # JWT generation, password hashing, token mgmt
│   │   └── validators/
│   │       └── auth.validator.ts         # Zod: login, register, refresh schemas
│   │
│   ├── code-execution/
│   │   └── services/
│   │       └── code-execution.service.ts # Judge0 API wrapper (submit + poll)
│   │
│   ├── courses/
│   │   ├── controllers/
│   │   │   └── courses.controller.ts     # getCourses, getCourseById, createCourse
│   │   ├── models/
│   │   │   └── course.model.ts           # Mongoose: Course schema
│   │   └── services/
│   │       └── courses.service.ts        # CRUD, search, pagination, filtering
│   │
│   ├── enrollments/
│   │   ├── models/
│   │   │   └── enrollment.model.ts       # Mongoose: Enrollment schema
│   │   └── services/
│   │       └── enrollments.service.ts    # Enroll, update lesson progress
│   │
│   ├── gamification/
│   │   ├── models/
│   │   │   └── user-stats.model.ts       # Mongoose: UserStats (XP, streaks, level)
│   │   └── services/
│   │       └── gamification.service.ts   # Streak checks, level calculations
│   │
│   ├── ide/
│   │   └── services/
│   │       └── ide.service.ts            # Language list, code templates
│   │
│   ├── leaderboard/
│   │   └── services/
│   │       └── leaderboard.service.ts    # Redis Sorted Set rankings
│   │
│   ├── lessons/
│   │   ├── controllers/
│   │   │   └── lessons.controller.ts     # getLessonById
│   │   ├── models/
│   │   │   └── lesson.model.ts           # Mongoose: Lesson schema
│   │   └── services/
│   │       └── lessons.service.ts        # Lesson queries, attachment handling
│   │
│   ├── notifications/
│   │   ├── models/
│   │   │   └── notification.model.ts     # Mongoose: Notification schema
│   │   └── services/
│   │       └── notifications.service.ts  # Create, fetch, mark-as-read
│   │
│   ├── quiz/
│   │   ├── models/
│   │   │   └── quiz.model.ts             # Mongoose: Quiz schema (questions array)
│   │   └── services/
│   │       └── quiz.service.ts           # Quiz CRUD operations
│   │
│   ├── quiz-attempts/
│   │   ├── models/
│   │   │   └── quiz-attempt.model.ts     # Mongoose: QuizAttempt schema
│   │   └── services/
│   │       └── quiz-attempts.service.ts  # Submit, score, XP reward, streak update
│   │
│   └── users/
│       ├── controllers/
│       │   └── users.controller.ts       # getProfile, updateProfile, uploadAvatar
│       └── services/
│           └── users.service.ts          # Profile queries, avatar update
│
├── socket/                       # ═══ REALTIME ═══
│   └── index.ts                          # Socket.IO namespace & event handlers
│
├── swagger/                      # ═══ API DOCS ═══
│   └── config.ts                         # swagger-jsdoc OpenAPI spec
│
├── types/                        # ═══ TYPE DEFINITIONS ═══
│   ├── index.ts                          # JWTPayload, PaginationQuery, PaginatedResult
│   └── next-auth.d.ts                    # NextAuth Session/JWT augmentation
│
└── utils/                        # ═══ UTILITY FUNCTIONS ═══
    └── index.ts                          # hashPassword, signToken, verifyToken, parsePagination
```

## Tổng kết

| Thành phần | Số lượng |
|---|---|
| Root config files | 14 |
| API route files | 21 |
| Common utilities | 3 |
| Config files | 5 |
| Middleware files | 1 |
| Feature modules | 15 |
| Module source files | 30 |
| Socket / Swagger / Types / Utils | 5 |
| **Tổng source files** | **66** |
