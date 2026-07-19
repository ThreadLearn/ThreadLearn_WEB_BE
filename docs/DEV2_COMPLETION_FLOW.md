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
