# NestJS Migration Status

Last reviewed: 2026-05-28

## Verdict

The backend framework migration is complete for the current runtime surface.

The application no longer uses the previous framework runtime, route handlers, custom HTTP server, or framework-specific dependencies. The server boots through NestJS, exposes controllers under `/api/v1`, serves Swagger at `/api/docs`, and builds to `dist/main.js`.

## Verified Checks

Commands run successfully:

```bash
npm run build
npm run lint
npm test
```

Additional checks:

- No runtime imports of framework-specific request/response objects remain.
- No framework-specific dependencies remain in `package.json`.
- No API route handler files remain under `src/app/api`.
- Docker runs `node dist/main.js`.
- All feature folders under `src/modules` have a NestJS module, controller, and service layer.

## NestJS Runtime Flow

1. `src/main.ts` calls `NestFactory.create(AppModule)`.
2. MongoDB is initialized through `connectToDatabase()`.
3. Global middleware and application concerns are configured:
   - global prefix: `/api`
   - CORS
   - Helmet
   - compression
   - static uploads from `UPLOAD_DIR`
   - global `ValidationPipe`
   - global `GlobalExceptionFilter`
   - Swagger at `/api/docs`
4. `AppModule` imports every feature module.
5. `RateLimitMiddleware` runs for all routes.
6. Controllers receive requests and call service classes.
7. Services keep business logic and access existing Mongoose models.
8. Responses are formatted through `ApiResponse`.

## Authentication Flow

Current supported flow:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/session`

Plus Google OAuth and email flows:

- `GET /api/v1/auth/google`
- `GET /api/v1/auth/google/callback`
- `POST /api/v1/auth/verify-email`
- `POST /api/v1/auth/resend-verification`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`

Protected endpoints use `JwtAuthGuard`. Admin-only endpoints use `@Roles('ADMIN')`.

Google OAuth 2.0 is implemented directly in `AuthService` (authorization URL + code exchange). GitHub login is no longer supported.

## Important Files

- `src/main.ts`: NestJS bootstrap.
- `src/app/app.module.ts`: root module and global middleware registration.
- `src/common/guards/jwt-auth.guard.ts`: JWT and role authorization.
- `src/common/filters/global-exception.filter.ts`: unified error response.
- `src/common/pipes/zod-validation.pipe.ts`: Zod validation adapter.
- `src/socket/index.ts`: Socket.IO gateway.
- `src/swagger/config.ts`: Swagger document setup.
- `Dockerfile`: production image build and runtime command.
