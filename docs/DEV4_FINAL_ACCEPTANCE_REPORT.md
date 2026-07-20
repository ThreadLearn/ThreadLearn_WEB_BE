# DEV4 Final Acceptance Report

**Date:** 2026-07-20  
**Scope:** UC36-UC43, UC48-UC52  
**Decision:** **Accepted with tracked repository-level follow-ups.** The DEV4 implementation is ready to merge and demonstrate with the mock payment flow. A live PayOS/MongoDB/Redis run remains a release-readiness check, not evidence completed in this report.

## 1. Scope and Evidence

| Use case | Status | Evidence |
| --- | --- | --- |
| UC36-UC39 Quiz and question administration | Accepted | Quiz controller/services, admin quiz UI, and merged FE validation polish PR #42. |
| UC40-UC43 Take, grade, result, and history | Accepted | Submit/grading services; merged history pagination PR #39, result detail PR #40, and result navigation PR #41. |
| UC48-UC49 XP and user level | Accepted | Event-driven XP award with duplicate-attempt protection, gamification stats API, and merged leaderboard/level UI PR #43. |
| UC50 Leaderboard | Accepted | Top and personal-rank APIs plus merged leaderboard UI PR #43. |
| UC51 Service-plan management | Accepted | Admin-only plan CRUD controller and admin plan UI. |
| UC52 Purchase and payment | Accepted for mock/demo | Purchase flow, verified gateway adapters, PayOS adapter, secure callback UI, and merged FE purchase UX PR #44. |

## 2. Current Contract Map

### Quiz and attempts

| Capability | Backend route | Frontend outcome |
| --- | --- | --- |
| Manage quizzes/questions | `POST/GET /api/v1/quiz`, `PUT/DELETE /api/v1/quiz/:quizId`, question subroutes | Admin form validates question options and correct-answer index. |
| Take and grade quiz | `GET /api/v1/quiz/lesson/:lessonId`, `POST /api/v1/quiz/submit` | Countdown, submission result, XP result, and a direct attempt-detail link. |
| Attempt result/history | `GET /api/v1/quiz/attempts/:attemptId`, `GET /api/v1/quiz/attempts/me?page=&limit=` | Detail screen and paginated history. The history route keeps the legacy array response when pagination is omitted. |

### XP and leaderboard

| Capability | Backend route | Frontend outcome |
| --- | --- | --- |
| Personal XP/level | `GET /api/v1/gamification/stats` | Profile progress widget shows level, XP, streak, lessons, and quizzes. |
| Leaderboard | `GET /api/v1/leaderboard?limit=`, `GET /api/v1/leaderboard/me` | Vietnamese leaderboard UI, current-user highlight, rank/level/XP, loading, empty, error, and retry states. |

### Subscription and payment

| Capability | Backend route | Frontend outcome |
| --- | --- | --- |
| Manage plans | `POST/GET /api/v1/subscription/plans`, `PUT/DELETE /api/v1/subscription/plans/:id` | Admin plan CRUD; write actions require `ADMIN`. |
| Start purchase | `POST /api/v1/subscription/purchase` | Login redirect for unauthenticated users, payment redirect, and renewal of the active plan. |
| Confirm activation | `POST /api/v1/subscription/webhook/payment`, `GET /api/v1/subscription/my-subscription` | The real callback never posts the webhook from the browser; it polls subscription state and permits a manual recheck. |

## 3. Automated Verification Run

Run on backend `develop` on 2026-07-20:

```text
npx jest \
  src/modules/subscription/application/services/subscription-flow.spec.ts \
  src/modules/subscription/infrastructure/payment/payos.adapter.spec.ts \
  src/modules/subscription/infrastructure/payment/vnpay.adapter.spec.ts \
  src/modules/gamification/application/event-handlers/gamification-rewards.event-handler.spec.ts \
  src/modules/quiz/application/services/delete-quiz.service.spec.ts \
  src/modules/quiz-attempts/application/services/submit-attempt.service.spec.ts \
  src/modules/quiz-attempts/application/services/get-my-attempts.service.spec.ts \
  --runInBand
```

Result: **7 suites passed, 16 tests passed**.

The checks cover plan CRUD, purchase creation, payment success/failure, duplicate payment-event prevention, PayOS and VNPay adapter verification, quiz submit/history, quiz deletion, and duplicate XP-event handling.

`npm run build` passed. `npm run lint` completed with one pre-existing warning outside DEV4 in `src/modules/ai/application/services/stream-recommendation.service.ts` for an unused `reject` argument.

The full backend suite result was **12 suites passed, 1 suite failed, 50 tests passed, 1 test failed**. The only failure is outside DEV4: `src/modules/ai/application/services/request-recommendation.service.spec.ts` expects `No concurrency issues detected.` while the service returns `No concurrency issues detected in this code.` No DEV4 test failed.

Frontend checks completed in the merged phase PRs: `npm run lint`, `npx tsc --noEmit`, and `npm run build` all passed for PRs #39 through #44.

## 4. Manual Acceptance Flow

Use an `ADMIN` account and a `STUDENT` account. Start with a clean or known test dataset.

1. As admin, create a plan at `/admin/plans` with VND price, duration, and features. Edit it once, then deactivate a disposable second plan.
2. As admin, create a quiz with at least two questions. Remove an option before the correct option and verify the selected correct answer remains valid; reject duplicate option text.
3. As student, open the quiz from its lesson. Confirm the countdown follows `timeLimitSeconds` and submit a passing attempt.
4. Confirm the result view shows score, pass state, XP, timing, and answer detail. Open it from quiz history and verify history pagination changes page without losing the selected limit.
5. Refresh profile and leaderboard. Confirm XP/level and `/leaderboard/me` agree with the current user row; the current user must be visually highlighted.
6. Submit or replay the same quiz-passed event only in a controlled test. XP must not be awarded twice for the same attempt identity.
7. As student, choose a subscription plan. A signed-out user must be sent to login; a signed-in user receives a payment URL. An active plan shows a renewal action.
8. In `mock` mode, finish the mock callback and verify `/subscription/my-subscription` becomes `active`. Retry the same successful webhook and verify no second subscription side effect occurs.
9. In PayOS mode, complete a sandbox transaction. The callback page must remain in processing until the server-to-server webhook activates the subscription, then use "Kiểm tra lại" if needed.
10. Verify non-admin plan write requests return authorization failure; frontend visibility is not the security boundary.

## 5. Release Follow-ups

| Priority | Follow-up | Owner/scope |
| --- | --- | --- |
| P1 | Fix the unrelated AI assertion mismatch so the complete backend suite is green. | AI module owner. |
| P1 | Run the manual flow above against reachable MongoDB, Redis, and PayOS sandbox credentials. | DEV4/release owner. |
| P2 | Resolve the AI lint warning for the unused `reject` parameter. | AI module owner. |
| P2 | Record the PayOS webhook URL in the provider dashboard and verify an externally reachable HTTPS endpoint before production release. | Deployment owner. |

## 6. Merge References

- Backend: quiz/XP consistency PR #78, PayOS gateway PR #79, attempt-history pagination PR #82, and DNS configuration guard PR #83.
- Frontend: quiz history #39, attempt detail #40, submit-to-detail navigation #41, admin quiz validation #42, leaderboard/level #43, and subscription/payment UX #44.

This report supersedes old DEV4 status notes that still describe earlier PRs as pending. It does not claim a live external payment verification that was not run in this workspace.
