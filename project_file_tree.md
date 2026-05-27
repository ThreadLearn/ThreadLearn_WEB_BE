# ThreadLearn Backend File Tree

This file documents the current NestJS structure after the framework migration.

```text
ThreadLearn_NestJS/
├── .env.example
├── .eslintrc.json
├── .github/
├── .prettierrc
├── Dockerfile
├── docker-compose.yml
├── jest.config.js
├── nest-cli.json
├── package.json
├── package-lock.json
├── public/
├── README.md
├── tsconfig.json
├── tsconfig.server.json
└── src/
    ├── main.ts
    ├── app/
    │   ├── app.controller.ts
    │   └── app.module.ts
    ├── common/
    │   ├── api-handler.ts
    │   ├── api-response.ts
    │   ├── custom-error.ts
    │   ├── decorators/
    │   │   ├── current-user.decorator.ts
    │   │   └── roles.decorator.ts
    │   ├── filters/
    │   │   └── global-exception.filter.ts
    │   ├── guards/
    │   │   └── jwt-auth.guard.ts
    │   └── pipes/
    │       └── zod-validation.pipe.ts
    ├── configs/
    │   ├── db.ts
    │   ├── env.ts
    │   ├── logger.ts
    │   ├── redis.ts
    │   └── upload.ts
    ├── database/
    │   └── models/
    │       └── index.ts
    ├── middlewares/
    │   └── rate-limit.middleware.ts
    ├── modules/
    │   ├── admin/
    │   │   ├── admin.module.ts
    │   │   ├── controllers/admin.controller.ts
    │   │   └── services/admin.service.ts
    │   ├── ai/
    │   │   ├── ai.module.ts
    │   │   ├── controllers/ai.controller.ts
    │   │   ├── models/ai-history.model.ts
    │   │   └── services/ai.service.ts
    │   ├── analytics/
    │   │   ├── analytics.module.ts
    │   │   ├── controllers/analytics.controller.ts
    │   │   └── services/analytics.service.ts
    │   ├── auth/
    │   │   ├── auth.module.ts
    │   │   ├── controllers/auth.controller.ts
    │   │   ├── models/
    │   │   │   ├── refresh-token.model.ts
    │   │   │   └── user.model.ts
    │   │   ├── services/auth.service.ts
    │   │   └── validators/auth.validator.ts
    │   ├── code-execution/
    │   │   ├── code-execution.module.ts
    │   │   ├── controllers/code-execution.controller.ts
    │   │   └── services/code-execution.service.ts
    │   ├── courses/
    │   │   ├── controllers/courses.controller.ts
    │   │   ├── courses.module.ts
    │   │   ├── models/course.model.ts
    │   │   └── services/courses.service.ts
    │   ├── enrollments/
    │   │   ├── controllers/enrollments.controller.ts
    │   │   ├── enrollments.module.ts
    │   │   ├── models/enrollment.model.ts
    │   │   └── services/enrollments.service.ts
    │   ├── gamification/
    │   │   ├── controllers/gamification.controller.ts
    │   │   ├── gamification.module.ts
    │   │   ├── models/user-stats.model.ts
    │   │   └── services/gamification.service.ts
    │   ├── ide/
    │   │   ├── controllers/ide.controller.ts
    │   │   ├── ide.module.ts
    │   │   └── services/ide.service.ts
    │   ├── leaderboard/
    │   │   ├── controllers/leaderboard.controller.ts
    │   │   ├── leaderboard.module.ts
    │   │   └── services/leaderboard.service.ts
    │   ├── lessons/
    │   │   ├── controllers/lessons.controller.ts
    │   │   ├── lessons.module.ts
    │   │   ├── models/lesson.model.ts
    │   │   └── services/lessons.service.ts
    │   ├── notifications/
    │   │   ├── controllers/notifications.controller.ts
    │   │   ├── models/notification.model.ts
    │   │   ├── notifications.module.ts
    │   │   └── services/notifications.service.ts
    │   ├── quiz/
    │   │   ├── controllers/quiz.controller.ts
    │   │   ├── models/quiz.model.ts
    │   │   ├── quiz.module.ts
    │   │   └── services/quiz.service.ts
    │   ├── quiz-attempts/
    │   │   ├── controllers/quiz-attempts.controller.ts
    │   │   ├── models/quiz-attempt.model.ts
    │   │   ├── quiz-attempts.module.ts
    │   │   └── services/quiz-attempts.service.ts
    │   └── users/
    │       ├── controllers/users.controller.ts
    │       ├── services/users.service.ts
    │       └── users.module.ts
    ├── socket/
    │   └── index.ts
    ├── swagger/
    │   └── config.ts
    ├── types/
    │   └── index.ts
    └── utils/
        └── index.ts
```

## Notes

- There are no framework API route files under `src/app/api`.
- `server.ts` is no longer used. The NestJS entry point is `src/main.ts`.
- Build output is `dist/main.js`.
- Feature modules that do not currently expose public endpoints still keep a controller file so every feature follows the same NestJS structure.
