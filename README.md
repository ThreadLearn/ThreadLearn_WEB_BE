# ThreadLearn Backend

ThreadLearn Backend is a NestJS API server for a learning platform. The project uses MongoDB/Mongoose for persistence, Redis for leaderboard and rate limiting, JWT for authentication, Socket.IO for realtime notifications, and Swagger for API documentation.

## Migration Status

The backend runtime has been migrated from Next.js API Routes to NestJS.

- Entry point: `src/main.ts`
- Root module: `src/app/app.module.ts`
- API base path: `/api/v1`
- Swagger UI: `/api/docs`
- Build output: `dist/main.js`
- Removed framework dependencies: `next`, `react`, `react-dom`, `next-auth`

OAuth login/register formerly handled by `next-auth` is not available after the migration. The current supported authentication flow is email/password with JWT access and refresh tokens under `/api/v1/auth/*`.

## Architecture Overview

Request flow:

1. `src/main.ts` boots NestJS, connects MongoDB, enables CORS, Helmet, compression, global validation, global error formatting, static upload serving, and Swagger.
2. `AppModule` imports all feature modules and applies `RateLimitMiddleware` globally.
3. A request enters a controller method, for example `AuthController`, `CoursesController`, or `QuizController`.
4. Protected endpoints use `JwtAuthGuard`; role-restricted endpoints additionally use `@Roles('ADMIN')`.
5. Controllers call service classes that hold business logic and use existing Mongoose models.
6. Responses use the shared `ApiResponse` shape:

```json
{
  "success": true,
  "message": "Success",
  "data": {},
  "meta": {}
}
```

Error responses are formatted by `GlobalExceptionFilter`:

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": []
}
```

## Main Folders

- `src/app`: root NestJS module and health/docs redirect controller.
- `src/common`: shared response helpers, decorators, guards, pipes, filters, and custom errors.
- `src/configs`: environment validation, MongoDB connection, Redis client, logger, upload helper.
- `src/database`: model re-exports.
- `src/middlewares`: Nest middleware, currently global rate limiting.
- `src/modules`: feature modules. Each feature has a Nest module, controller, service, and models where needed.
- `src/socket`: Socket.IO gateway using `@WebSocketGateway()`.
- `src/swagger`: Swagger document configuration.
- `src/types` and `src/utils`: shared types and utilities.

## Prerequisites

- Node.js 20.x
- MongoDB running locally or a MongoDB Atlas connection string
- Redis running locally or a Redis connection string

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
cp .env.example .env
```

3. Update `.env` with your local MongoDB and JWT secrets.

4. Start development server:

```bash
npm run start:dev
```

The default backend URL is:

```text
http://localhost:3000
```

Swagger UI:

```text
http://localhost:3000/api/docs
```

Health check:

```text
http://localhost:3000/api/v1/health
```

## Scripts

- `npm run build`: compile NestJS to `dist/`.
- `npm run start`: run NestJS using the Nest CLI.
- `npm run start:dev`: run in watch mode.
- `npm run start:debug`: run in debug watch mode.
- `npm run start:prod`: run compiled output from `dist/main.js`.
- `npm run lint`: run ESLint.
- `npm test`: run Jest.

## Docker

Start the full stack:

```bash
docker compose up --build
```

The app container runs:

```bash
node dist/main.js
```

## Contribution Workflow

- Branch from `develop`.
- Use branch names such as `feature/add-quiz-timer`, `fix/login-crash`, or `refactor/auth-service`.
- Use Conventional Commits, for example `feat: [Auth] add email verification`.
- Before opening a pull request, run:

```bash
npm run lint
npm run build
npm test
```
