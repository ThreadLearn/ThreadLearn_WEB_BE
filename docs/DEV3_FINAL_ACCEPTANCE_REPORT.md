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
- Student notifications now paginate at 20 per page and use navigation links after marking a notification read.
- Socket.IO authenticates a JWT handshake and derives the room from its verified user id; the client no longer sends a room-selecting user id.
- Jest now has test-only environment defaults so unit tests are independent of developer secrets.

## Verification

| Check | Result |
| --- | --- |
| Backend type-check/build | Passed |
| Backend Jest | Passed: 23 suites, 90 tests |
| Frontend type-check | Passed |
| Frontend production build | Passed |
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
| UC44 Run Code | Partial | Monaco IDE and protected public payload are implemented; daily quota is not yet an atomic Redis/Mongo counter. |
| UC45 View Output | Partial | Output details and recent history UI are implemented; history API paging and execution integration tests remain. |
| UC46 AI Recommendation | Partial | Execution ownership, size, quota response and Premium optimized-code rule are implemented; SHA-256 shared cache and atomic quota remain. |
| UC47 AI History | Partial | Per-user history and retention service already exist; history pagination/chat-thread acceptance tests remain. |
| UC53 Notifications | Partial | HTTP paging/link behavior and JWT socket room authorization are implemented; Socket.IO integration tests remain. |

## Blocking items before merging to develop

1. Complete the remaining endpoint/component/Socket integration tests for the partial UC rows.
2. Replace count-then-create code/AI quota checks with an atomic counter (Redis or MongoDB conditional update).
3. Add the SHA-256 one-hour AI recommendation cache required by the SRS.
4. Add pagination metadata and UI paging for code execution and AI history.
5. Configure GitHub credentials for the execution environment. Both feature pushes failed with `SEC_E_NO_CREDENTIALS`; no remote branch or `develop` was changed.

## Environment notes

- Live Judge0 and AI-provider verification was not performed. Automated tests use local/mocked behavior; production requires `JUDGE0_*` and `AI_API_*` configuration.
- No force push, reset, or direct commit to `develop` was performed.
