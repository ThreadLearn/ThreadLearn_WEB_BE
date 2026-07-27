# DEV 3 Acceptance Report

Date: 2026-07-28

## Branches and commits

| Repository | Base develop | Feature branch | Commit |
| --- | --- | --- | --- |
| Backend | `728af94` | `feature/dev3-completion` | `669cdce` |
| Frontend | `fccbbe4` | `feature/dev3-completion` | `986e76f` |

## Delivered changes

- Comment replies are normalized to the root comment, maintaining the two-level discussion rule.
- Bookmark target metadata is resolved on the server, bookmark state uses the check endpoint, and the bookmark page supports paging.
- Notes validate `anchorEnd > anchorStart` during create and update; a domain regression test covers both cases.
- The public code-run API only accepts JavaScript or Python and no longer accepts a caller-controlled Judge0 language ID or exercise ID. Daily execution exhaustion returns `429 CODE_RUN_LIMIT`.
- `/ide` now uses Monaco through `@monaco-editor/react`, persists a local draft, runs through the protected execution API, renders stdout/stderr/compiler output/runtime/memory, and displays recent execution history.
- The AI page runs code through the execution API rather than a browser iframe and forwards its execution id to analysis. AI input is limited to 5,000 characters, validates execution ownership, enforces a 429 quota response, and only persists optimized code for Premium users.
- Code execution and AI quota now reserve a slot through an atomic MongoDB conditional update backed by a unique `(userId, scope, day)` index. Failed Judge0/AI-provider requests release their reservation.
- AI analysis responses are cached by a SHA-256 key of normalized request inputs for one hour. Cache hits create user-owned history while not consuming AI quota.
- Code-execution and AI history now return paginated `items` plus `page`, `limit`, `total`, `totalPages`, and `hasMore`. AI history/detail redact `optimizedCode` for users without the Premium feature.
- Student notifications now paginate at 20 per page and use navigation links after marking a notification read.
- Socket.IO authenticates a JWT handshake and derives the room from its verified user id; the client no longer sends a room-selecting user id.
- Jest now has test-only environment defaults so unit tests are independent of developer secrets.

## Verification

| Check | Result |
| --- | --- |
| Backend type-check/build | Passed |
| Backend Jest | Passed: 26 suites, 95 tests |
| Backend ESLint | Passed: 0 errors, 0 warnings |
| Frontend type-check | Passed |
| Frontend production build | Passed |
| Frontend ESLint | Passed: 0 errors, 0 warnings |
| Added note anchor regression test | Passed |
| Added/updated AI quota and tier assertions | Passed |

## UC acceptance status

| UC | Status | Evidence / remaining work |
| --- | --- | --- |
| UC29 Add Comment | Partial | Existing access, validation, UI and API remain; endpoint-level integration coverage still required. |
| UC30 Reply Comment | Partial | Reply-of-reply now normalizes to the root. Add controller/repository integration tests. |
| UC31 Edit Comment | Partial | Existing ownership/Admin flow present; needs API acceptance coverage. |
| UC32 Delete Comment | Partial | Existing soft delete flow present; needs subtree policy integration test. |
| UC33 View Bookmarks | Partial | Server paging exists and FE has next/previous navigation; add component/API pagination tests. |
| UC34 Save Bookmark | Partial | Server target snapshot and check endpoint state are implemented; add concurrent toggle integration test. |
| UC35 Add Note | Partial | Privacy/multi-note model exists and anchor range validation is tested; selected-text offsets still need browser E2E coverage. |
| UC44 Run Code | Partial | Monaco IDE, protected public payload and atomic daily quota are implemented. Live Judge0 smoke and endpoint/browser integration tests remain. |
| UC45 View Output | Partial | Output details, recent-history UI and paginated history API are implemented; execution integration tests remain. |
| UC46 AI Recommendation | Partial | Atomic quota, SHA-256 one-hour cache, execution ownership, size and Premium rule are implemented; provider integration and browser acceptance tests remain. |
| UC47 AI History | Partial | Per-user history, retention, pagination and Free-tier optimized-code redaction are implemented; chat-thread acceptance tests remain. |
| UC53 Notifications | Partial | HTTP paging/link behavior and JWT socket room authorization are implemented; Socket.IO integration tests remain. |

## Blocking items before merging to develop

1. Complete the remaining endpoint/component/Socket integration and browser E2E tests for the partial UC rows.
2. Configure and smoke-test Redis, Judge0 and the AI provider. This environment has MongoDB listening on port 27017 but no Redis listener on port 6379, and no usable Judge0/AI credentials were provided.
3. Complete the outstanding integration/E2E evidence before merging. Both feature branches are now pushed, but `develop` intentionally remains unchanged until the remaining acceptance rows can be proven.

## Environment notes

- Live Judge0 and AI-provider verification was not performed. The code-run endpoint deliberately returns `503 JUDGE0_NOT_CONFIGURED` rather than silently executing a local sandbox when Judge0 is not configured.
- Pushed feature branches: `ThreadLearn/ThreadLearn_WEB_BE:feature/dev3-completion` and `Curt1s167/ThreadLearn_WEB_FE:feature/dev3-completion`.
- No force push, reset, merge, or direct commit to `develop` was performed.
