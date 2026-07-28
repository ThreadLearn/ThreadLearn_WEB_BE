# DEV 3 Acceptance Report

Date: 2026-07-28

## Branches and commits

| Repository | Base develop | Feature branch | Commit |
| --- | --- | --- | --- |
| Backend | `2508bfd` (includes PR #113) | `feature/dev3-completion` | Final acceptance follow-up |
| Frontend | `55b009d` (includes PR #72) | `feature/dev3-completion` | Final acceptance follow-up |

## Delivered changes

- Comment replies are normalized to the root comment, maintaining the two-level discussion rule.
- Soft-deleted comments and replies remain in read queries as tombstones, preserving thread context while all further mutations remain blocked.
- Bookmark target metadata is resolved on the server, bookmark state uses the check endpoint, and the bookmark page supports paging.
- Notes validate `anchorEnd > anchorStart` and reject offsets beyond the current lesson content during create and update.
- Selecting lesson text now opens the note composer with `anchorText`, `anchorStart`, and `anchorEnd`; manually changing the excerpt safely clears stale offsets.
- The public code-run API only accepts JavaScript or Python and no longer accepts a caller-controlled Judge0 language ID or exercise ID. Daily execution exhaustion returns `429 CODE_RUN_LIMIT`.
- `/ide` now uses Monaco through `@monaco-editor/react`, persists a local draft, runs through the protected execution API, renders stdout/stderr/compiler output/runtime/memory, and displays recent execution history.
- The AI page runs code through the execution API rather than a browser iframe and forwards its execution id to analysis. AI input is limited to 5,000 characters, validates execution ownership, enforces a 429 quota response, and only persists optimized code for Premium users.
- Code execution and AI quota now reserve a slot through an atomic MongoDB conditional update backed by a unique `(userId, scope, day)` index. Failed Judge0/AI-provider requests release their reservation.
- AI analysis responses are cached by a SHA-256 key of normalized request inputs for one hour. Cache hits create user-owned history while not consuming AI quota.
- Code-execution and AI history now return paginated `items` plus `page`, `limit`, `total`, `totalPages`, and `hasMore`. AI history/detail redact `optimizedCode` for users without the Premium feature.
- Student notifications now paginate at 20 per page, display the server-wide unread/total counters, provide previous/next navigation, and use notification links after marking a record read.
- AI history now exposes previous/next navigation over the paginated history contract.
- Socket.IO authenticates a JWT handshake and derives the room from its verified user id; the client no longer sends a room-selecting user id.
- Jest now has test-only environment defaults so unit tests are independent of developer secrets.

## Verification

| Check | Result |
| --- | --- |
| Backend type-check/build | Passed |
| Backend Jest | Passed: 28 suites, 98 tests |
| Backend ESLint | Passed: 0 errors, 0 warnings |
| Frontend type-check | Passed |
| Frontend production build | Passed |
| Frontend ESLint | Passed: 0 errors, 0 warnings |
| Added note anchor bounds regression tests | Passed |
| Added deleted-comment tombstone repository test | Passed |
| Added/updated AI quota and tier assertions | Passed |

## UC acceptance status

| UC | Status | Evidence / remaining work |
| --- | --- | --- |
| UC29 Add Comment | Accepted (code/regression) | Enrollment/access checks, validation, author rendering and API/UI flow are present. |
| UC30 Reply Comment | Accepted (code/regression) | Reply-of-reply normalizes to the root; deleted parents cannot receive new replies. |
| UC31 Edit Comment | Accepted (code/regression) | Owner/Admin policy, validation and edited metadata/UI are present. |
| UC32 Delete Comment | Accepted (code/regression) | Soft delete blocks future mutations and retains tombstones/reply context. |
| UC33 View Bookmarks | Accepted (code/regression) | Server paging and FE previous/next navigation are present. |
| UC34 Save Bookmark | Accepted (code/regression) | Server-owned snapshot, access checks, unique index and check/toggle UI are present. |
| UC35 Add Note | Accepted (code/regression) | Private multi-note flow, selected-text capture and content-bound anchor validation are present. |
| UC44 Run Code | Accepted (environment pending) | Monaco, protected payload, supported-language mapping and atomic quota are present; live Judge0 smoke requires deployment credentials. |
| UC45 View Output | Accepted (environment pending) | Output details, runtime/memory and paginated execution history are present; live Judge0 smoke requires deployment credentials. |
| UC46 AI Recommendation | Accepted (environment pending) | Atomic quota, one-hour cache, execution ownership, input size and Premium persistence rule are present; live provider smoke requires credentials. |
| UC47 AI History | Accepted (code/regression) | Per-user history, retention, pagination navigation and Free-tier redaction are present. |
| UC53 Notifications | Accepted (environment pending) | HTTP paging/counters/link behavior and verified JWT socket rooms are present; live Socket.IO/Redis smoke requires configured infrastructure. |

## Deployment acceptance gates

The implementation and local regression gates are green. Deployment acceptance still requires:

1. Configure and smoke-test Redis/Socket.IO, Judge0 and the AI provider in the target environment.
2. Run authenticated browser E2E against that environment for the twelve UC happy paths and authorization failures.
3. Preserve the feature-branch-to-PR workflow because both authoritative `develop` branches are protected.

## Environment notes

- Live Judge0 and AI-provider verification was not performed. The code-run endpoint deliberately returns `503 JUDGE0_NOT_CONFIGURED` rather than silently executing a local sandbox when Judge0 is not configured.
- Baseline DEV3 PRs were merged as Backend PR #113 and Frontend PR #72 before this final acceptance pass.
- No force push or reset was performed, and dirty `package-lock.json` files in the separate develop worktrees were not modified.
