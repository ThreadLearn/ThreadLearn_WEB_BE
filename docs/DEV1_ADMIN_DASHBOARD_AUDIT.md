# DEV1.8A Admin Dashboard / Statistics Baseline Audit

- Date/time: 2026-06-30 15:18:41 +07:00
- Branch: `refactor/dev1-clean-architecture`
- Scope: audit-only for UC14 dashboard/statistics. No runtime source files changed.

## Endpoints Found

### `GET /api/v1/admin/stats`

- Controller: `AdminController.getStats`
- Decorators: class-level `@Controller('v1/admin')`, `@UseGuards(JwtAuthGuard)`, `@Roles('ADMIN')`, `@ApiBearerAuth('BearerAuth')`; method-level `@Get('stats')`.
- Swagger: no method-level `@ApiOperation`.
- Params/body/query: none.
- Validator/pipe: none.
- Active-admin re-check: yes, `ensureAdminCanManageStudents(admin)` -> `AdminService.ensureActiveAdmin(admin.id)`.
- Service/model calls: direct controller DB calls with `User.countDocuments()`, `Course.countDocuments()`, `Enrollment.countDocuments()`, `QuizAttempt.countDocuments()`.
- Response wrapper: `ApiResponse.success`.
- Message: `Admin dashboard statistics retrieved.`
- HTTP status: Nest default `200`.
- Response data shape:

```ts
{
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  totalQuizAttempts: number;
}
```

### `GET /api/v1/admin/dashboard/statistics`

- Controller: `AdminController.getDashboardStatistics`
- Decorators: class-level `@Controller('v1/admin')`, `@UseGuards(JwtAuthGuard)`, `@Roles('ADMIN')`, `@ApiBearerAuth('BearerAuth')`; method-level `@Get('dashboard/statistics')`, `@ApiOperation({ summary: 'Get admin dashboard statistics and chart data.' })`.
- Query: `{ from?: string; to?: string; months: number }`.
- Validator/pipe: `@Query(new ZodValidationPipe(dashboardStatisticsQuerySchema))`.
- Query defaults/limits: `months` defaults to `6`, must be positive integer, max `24`; `from`/`to` must parse as dates; if both exist, `from <= to`.
- Active-admin re-check: yes, `ensureAdminCanManageStudents(admin)` -> `AdminService.ensureActiveAdmin(admin.id)`.
- Service/model calls: controller calls `AnalyticsService.getAdminDashboardStatistics(query)`.
- Response wrapper: `ApiResponse.success`.
- Message: `Admin dashboard statistics retrieved.`
- HTTP status: Nest default `200`.
- Response data shape:

```ts
{
  summary: {
    totalUsers: number;
    totalStudents: number;
    totalAdmins: number;
    activeStudents: number;
    lockedStudents: number;
    verifiedUsers: number;
    unverifiedUsers: number;
    newUsersThisMonth: number;
    totalCourses: number;
    totalLessons: number;
    totalEnrollments: number;
    totalQuizAttempts: number;
    totalAiRequests: number;
    totalNotifications: number;
    averageQuizScore: number;
    quizPassRate: number;
    activeUsersThisMonth: number;
  };
  charts: {
    newUsersByMonth: { month: string; count: number }[];
    enrollmentsByMonth: { month: string; count: number }[];
    quizAttemptsByMonth: { month: string; count: number }[];
    coursesCreatedByMonth: { month: string; count: number }[];
    lessonsCreatedByMonth: { month: string; count: number }[];
  };
}
```

### `AnalyticsController`

- Controller path: `/api/v1/analytics`.
- Current routes: none. `AnalyticsController` is empty.
- `AnalyticsModule` registers and exports `AnalyticsService`, but no HTTP analytics endpoints exist today.

## Legacy Behavior

- Dashboard/statistics-related admin routes found: two.
- `/stats` is entirely controller-driven and queries models directly.
- `/dashboard/statistics` delegates to static `AnalyticsService`.
- Both routes use class-level admin guard/role decorators and active-admin re-check.
- No cache was found.
- Time filtering exists only for `/dashboard/statistics` charts through `from`, `to`, and `months`.
- Empty chart months are filled with `{ month: 'YYYY-MM', count: 0 }`.
- Empty quiz aggregate defaults to `{ averageQuizScore: 0, quizPassRate: 0 }`.
- `ApiResponse.success` wraps both responses with `success`, `message`, `data`, and no `meta`.
- Validation errors come from `ZodValidationPipe` for `/dashboard/statistics`; auth errors come from `JwtAuthGuard` or `AdminService.ensureActiveAdmin`.

## Data Sources

### `User`

- Imported directly in `AdminController` for `/stats`.
- Imported directly in `AnalyticsService` for `/dashboard/statistics`.
- Operations:
  - `countDocuments()` -> `totalUsers`
  - `countDocuments({ role: 'STUDENT' })` -> `totalStudents`
  - `countDocuments({ role: 'ADMIN' })` -> `totalAdmins`
  - `countDocuments({ role: 'STUDENT', isActive: true, lockedAt: { $exists: false } })` -> `activeStudents`
  - `countDocuments({ role: 'STUDENT', $or: [{ isActive: false }, { lockedAt: { $exists: true, $ne: null } }] })` -> `lockedStudents`
  - `countDocuments({ isVerified: true })` -> `verifiedUsers`
  - `countDocuments({ isVerified: { $ne: true } })` -> `unverifiedUsers`
  - `countDocuments({ createdAt: { $gte: firstDayOfCurrentMonth } })` -> `newUsersThisMonth`
  - `countDocuments({ lastLoginAt: { $gte: firstDayOfCurrentMonth } })` -> `activeUsersThisMonth`
  - `aggregateMonthlyCounts(User, 'createdAt', range.start, range.end)` -> `charts.newUsersByMonth`

### `Course`

- Imported directly in `AdminController` for `/stats`.
- Imported directly in `AnalyticsService`.
- Operations:
  - `countDocuments()` -> `totalCourses`
  - `aggregateMonthlyCounts(Course, 'createdAt', range.start, range.end)` -> `charts.coursesCreatedByMonth`

### `Lesson`

- Imported directly in `AnalyticsService`.
- Operations:
  - `countDocuments()` -> `totalLessons`
  - `aggregateMonthlyCounts(Lesson, 'createdAt', range.start, range.end)` -> `charts.lessonsCreatedByMonth`

### `Enrollment`

- Imported directly in `AdminController` for `/stats`.
- Imported directly in `AnalyticsService`.
- Operations:
  - `countDocuments()` -> `totalEnrollments`
  - `aggregateMonthlyCounts(Enrollment, 'enrolledAt', range.start, range.end)` -> `charts.enrollmentsByMonth`
- `AnalyticsService.getPlatformStats()` also counts `{ completed: true }`, but no controller currently calls that method.

### `QuizAttempt`

- Imported directly in `AdminController` for `/stats`.
- Imported directly in `AnalyticsService`.
- Operations:
  - `countDocuments()` -> `totalQuizAttempts`
  - `aggregateMonthlyCounts(QuizAttempt, 'createdAt', range.start, range.end)` -> `charts.quizAttemptsByMonth`
  - `QuizAttempt.aggregate([{ $group: ... }])` -> `averageQuizScore`, `quizPassRate`
- Quiz model itself is not used by these dashboard endpoints.

### `AIHistory`

- Imported directly in `AnalyticsService`.
- Operations:
  - `countDocuments()` -> `totalAiRequests`

### `Notification`

- Imported directly in `AnalyticsService`.
- Operations:
  - `countDocuments()` -> `totalNotifications`

### `UserStats`, `CodeSubmission`, Payment/Plan

- Not used by current admin dashboard/statistics routes.
- `UserStats` appears elsewhere in gamification/users/auth/admin legacy student code, but not in UC14 dashboard/statistics response.
- No CodeSubmission, payment, or plan model usage was found for UC14.

## Date Range and Defaults

- `resolveDateRange(query)`:
  - `end = query.to ? new Date(query.to) : new Date()`, then set to `23:59:59.999`.
  - `start = query.from ? new Date(query.from) : new Date(end)`.
  - If `from` is missing, `start.setMonth(start.getMonth() - query.months + 1)`.
  - `start.setDate(1)` and set to `00:00:00.000`.
- Monthly labels are `YYYY-MM`.
- `fillMonthlyGaps` includes every month from start through end and uses `0` for missing rows.

## Coupling and Layer Issues

- `AdminController.getStats` queries DB models directly, which violates the target thin-controller rule. This is known legacy behavior and was not changed.
- `AdminController.getDashboardStatistics` calls static `AnalyticsService` directly instead of an injected use-case.
- `AnalyticsService` imports seven models directly: `User`, `AIHistory`, `Course`, `Enrollment`, `Lesson`, `Notification`, `QuizAttempt`.
- Aggregation logic lives inside `AnalyticsService`, not an infrastructure adapter or repository port.
- `AnalyticsService.getPlatformStats()` and `AdminController.getStats()` overlap on basic totals; `getPlatformStats()` is currently unused.
- `AnalyticsService.getUserProgress()` is currently unused by controllers.
- `AdminController.ensureAdminCanManageStudents` repeats active-admin checks for legacy routes while class-level guard/role decorators already exist.
- Shared `JwtAuthGuard`, `Roles`, `CurrentUser`, and `ApiResponse` are reused correctly.

## Proposed Clean Architecture Target

### Application

- Create `GetAdminStatsService` for `GET /api/v1/admin/stats`.
- Create `GetAdminDashboardStatisticsService` for `GET /api/v1/admin/dashboard/statistics`.
- Keep one public `execute()` method per use-case.
- Keep controller response wrapping and messages unchanged.

### DTO/Result

- Create query/result DTOs that mirror exact current shapes:
  - `AdminStatsResult` with `totalUsers`, `totalCourses`, `totalEnrollments`, `totalQuizAttempts`.
  - `AdminDashboardStatisticsInput` with `adminId`, `from?`, `to?`, `months`.
  - `AdminDashboardStatisticsResult` with current `summary` and `charts` objects.

### Ports

- Add an admin/domain or analytics/domain reader port such as `ADMIN_DASHBOARD_STATS_READER`.
- Methods could be:
  - `getAdminStats(): Promise<AdminStatsResult>`
  - `getAdminDashboardStatistics(query): Promise<AdminDashboardStatisticsResult>`
- Keep active-admin check via existing `USER_REPOSITORY` or a small shared admin-access application helper.

### Infrastructure

- Add `MongoAdminDashboardStatsReaderService` or similar in infrastructure.
- Move `countDocuments` and aggregation code there.
- Do not make application import models.
- Avoid wrapping static `AnalyticsService` as the final target; it can be a temporary bridge only if a very small migration phase needs it.

### Presentation

- Migrate `AdminController.getStats` first because it is the simplest direct-DB route.
- Then migrate `AdminController.getDashboardStatistics`.
- Keep `@Get`, `@ApiOperation`, `ZodValidationPipe`, class-level auth decorators, messages, data shape, and status behavior unchanged.
- `AnalyticsController` currently has no routes; no DEV1 presentation migration is needed there unless future endpoints are added.

## What Was Intentionally Not Changed

- No `src/**` runtime files changed.
- No route, response shape, validator, auth decorator, service behavior, model, `.env`, or package metadata changed.
- Kernel/MongoDB boot issues were not addressed because they are out of scope.

