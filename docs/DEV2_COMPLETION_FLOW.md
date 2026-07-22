# DEV2 Enrollment Completion Flow

This document records the architecture, behavior, verification, and handoff of the DEV2 completion-event work.

## Objective

Move enrollment completion side effects onto the application-wide EventEmitter2 bus while preserving the API response contract.

+## Acceptance criteria

A first-time lesson completion awards lesson XP; a final lesson also awards course XP, issues one certificate, and sends one course notification.

+## Event payloads

`lesson.completed` carries lesson identity, course identity, progress, first-completion state, and final-lesson state. `course.completed` carries the completed course summary.

+## Module ownership

Enrollments publishes facts. Gamification owns rewards, Certificates owns issuance, Notifications owns user messages, and Leaderboard owns cache invalidation.

+## Response compatibility

`CompleteLessonService` continues returning enrollment progress plus `xpRewarded` and `stats`; event transport is an internal implementation detail.

+## Publisher orchestration

The publisher ignores repeat completions, emits the lesson event first, emits the course event only for the final lesson, and combines listener results.

+## Completion effects

Numeric XP from listeners is summed. The latest non-null stats snapshot wins so the API returns the state after all completion rewards.

+## Consumer topology

Nest providers subscribe through `@OnEvent`; the publisher does not import or construct downstream feature services.

+## Notification policy

A normal lesson emits a lesson notification. The final lesson suppresses that message and delegates the single completion message to `course.completed`.

+## Certificate policy

Certificate issuance listens only to `course.completed`, preventing lesson handlers from duplicating course side effects.

+## Provider registration

The publisher and enrollment-owned event handlers are registered in `EnrollmentsModule` so Nest can inject EventEmitter2 and discover decorators.

+## Dependency isolation

Enrollment application code depends only on EventEmitter2 and event contracts, not on gamification or leaderboard implementations.

+## Legacy cleanup

Static enrollment-side bridges are removed after all side effects gain event subscribers in their owning modules.

+## Dependency inversion

The completion use case publishes domain facts and no longer reaches across module boundaries to invoke reward or cache services.

+## Migration compatibility

Event names remain `lesson.completed` and `course.completed`, matching existing gamification and leaderboard subscribers.

+## Reward source identity

Lesson rewards use `lesson_completion:<lessonId>:<userId>` and course rewards use `course_completion:<courseId>:<userId>` through the repository claim contract.

+## Idempotency

Repeated delivery returns zero newly awarded XP and does not emit another realtime reward update.

+## Realtime behavior

Each successfully claimed reward emits one XP payload and one leaderboard update signal using the saved stats snapshot.

+## Streak behavior

Streak updates occur only after a reward source is successfully claimed; duplicate deliveries do not touch the streak.

+## Eventual consistency

Reward-handler failures return empty effects and are logged, avoiding rollback of an enrollment or quiz action that has already persisted.

+## Reward calculation

A newly completed normal lesson returns 100 XP. A newly completed final lesson combines 100 lesson XP and 500 course XP for 600 XP.

+## Final lesson ordering

The lesson event completes before the course event, ensuring the returned stats snapshot includes both rewards in deterministic order.

+## Handler error behavior

Gamification failures are logged with the event name and user identity; the handler returns `{ xpRewarded: 0, stats: null }`.

+## Verification

Publisher, enrollment handlers, gamification idempotency, and the shared regression suite are covered; the Nest production build must also pass.

+## Merge strategy

Use **Create a merge commit** so the individual authored and committed timestamps remain intact on the default branch.

+## Rollout checks

After merge, verify one notification and certificate for a final lesson, 600 combined XP, and no additional XP after replaying the same completion.

+## Handoff

DEV2 completion events are isolated, idempotent, tested, buildable, and ready for pull-request review.
