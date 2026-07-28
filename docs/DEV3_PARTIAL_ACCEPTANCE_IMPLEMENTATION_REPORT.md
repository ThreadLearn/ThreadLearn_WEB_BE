# DEV3 Partial UC - Implementation and Acceptance Report

Date: 2026-07-28

## 1. Scope and baselines

- Backend repository: `C:\ThreadLearn\course-management-be`
- Backend branch: `feature/dev3-completion`
- Backend baseline: `18a7066` (`origin/develop`)
- Frontend repository: `C:\ThreadLearn\course-management-fe`
- Frontend branch: `feature/dev3-completion`
- Frontend baseline: `88d5f94` (`upstream/develop`)
- Duplicate, dirty worktrees `ThreadLearn_WEB_BE` and `ThreadLearn_WEB_FE` were inspected but not modified.
- Sources reviewed: `DEV3_CODE_FLOW_AND_QA_AUDIT.md`, `_requirements_text.txt`, architecture/routes/acceptance documents, current BE/FE implementation, and current automated tests.

This report records the result after re-verifying the old audit against the current `develop` baselines. The old audit is evidence, not the acceptance source of truth.

## 2. Acceptance summary

| UC | Result | Accepted behavior |
|---|---|---|
| UC31 Edit Comment | Accepted | Owner/Admin rules remain enforced; content is validated; conditional update prevents stale edit/delete resurrection and returns HTTP 409 on a write conflict. |
| UC32 Delete Comment | Accepted | Owner/Admin rules remain enforced; deletion remains a tombstone so reply trees are not corrupted; edit/delete conflicts are detected rather than silently overwritten. |
| UC33 View Lesson Bookmarks | Accepted | Authenticated, owner-scoped pagination; ALL/LESSON/COURSE filters; correct course/lesson navigation; loading/error/empty states. |
| UC34 Save Lesson Bookmark | Accepted | Lesson access is checked; toggle is an atomic MongoDB state transition; duplicate-key races are retried; direct removal works even when the old target is unavailable. |
| UC35 Add Note in Lesson | Accepted | Lesson access and ownership are enforced; length and anchor invariants are validated; duplicate text and multi-node DOM selection calculate the correct offsets; anchors can be explicitly cleared. |
| UC44 Run Code in IDE | Accepted with external integration pending | Only JavaScript/Python are exposed; UTF-8 source bytes are limited; Judge0 calls time out; provider output is capped and records truncation. A live Judge0 success requires a reachable configured provider. |
| UC45 View Code Execution Output | Accepted with external integration pending | History has loading/error states; selecting an item loads its full detail and restores language/source/stdin/output; truncated output is identified. Live Judge0 output remains an environment-level smoke test. |
| UC47 View AI Analysis History | Accepted | Owner-scoped list/detail, validated paging/IDs, consistent entitlement projection, and Free histories never expose Premium fixes. The product model is analysis history, not a multi-turn conversational chat thread. |
| UC53 View Notifications | Accepted | JWT/ownership/RBAC remain enforced; validated pagination and IDs; unread count is synchronized after HTTP and Socket.IO events; token refresh updates the store and socket; notification links only permit safe internal paths; Admin pagination is supported. |

## 3. P0 shared blockers

### Comment read authorization (UC29/UC30 dependency)

- Comment and reply list endpoints now require JWT.
- Lesson comments verify enrollment/lesson interaction access; course targets verify course access.
- Compatibility aliases use the same guards and Zod validation.
- Runtime smoke test: requests without an Authorization header return HTTP 401 for comments, notification unread count, and code history.

### Free AI Premium fix leak (UC46/UC47 dependency)

- One tier presenter is used for synchronous result, cache result, SSE events, history list, and history detail.
- Free output strips `optimizedCode`, `optimized_code`, `issues[].fix`, and streaming `issue.fix`.
- Free history persistence is also sanitized; premium entitlement preserves fixes.
- An incomplete/aborted stream releases its quota reservation instead of consuming quota without a result.

## 4. Important implementation details

### Comments

- Added optimistic concurrency using the expected `updatedAt` value.
- Updates require `status != DELETED`; an existing but stale target produces `COMMENT_WRITE_CONFLICT` (409).
- Frontend invalidates/reloads comment state after a 409 and presents list/reply failures.

### Bookmarks

- Replaced read-delete-create with a single aggregation-pipeline state flip.
- The unique-key upsert race handles MongoDB E11000 and retries without upsert.
- `exists` consistently means active bookmark.

### Notes

- Note and code snapshot limits are 10,000 and 50,000 characters.
- Anchors must be supplied as a valid pair with `start < end`.
- Frontend offsets come from the actual DOM Range, not the first matching text occurrence.
- Clearing anchors uses explicit nullable input and MongoDB `$unset`.

### Code execution

- Public language contract is JavaScript/Python and aliases are normalized.
- Source is limited to 50,000 UTF-8 bytes.
- Judge0 timeout is configured by `JUDGE0_TIMEOUT_MS` (default 10 seconds).
- stdout, stderr, and compile output are capped at 64 KiB each; `outputTruncated` is persisted.

### AI history

- IDs and paging are schema validated.
- Retention uses the active feature entitlement policy rather than plan name alone.
- Frontend retries an SSE analysis once after centralized JWT refresh.

### Notifications

- Student and Admin queries share explicit Zod contracts.
- Admin list includes pagination metadata.
- Topbar reads the dedicated unread-count endpoint.
- Mutation/socket events invalidate both list and unread-count queries.
- External, protocol-relative, backslash, and scheme-based notification links are rejected.

## 5. Verification evidence

Backend:

- `npm test -- --runInBand`: 33 suites passed, 111 tests passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- Runtime bootstrap against the configured MongoDB: passed.
- Unauthenticated DEV3 protected API smoke requests: HTTP 401 as expected.

Frontend:

- `npm test`: 3 files passed, 12 tests passed.
- `npm run lint`: passed with no warnings/errors.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed; all 30 pages generated/validated.

New focused coverage includes AI tier projection, Free/Premium recommendation behavior, comment read access and concurrent writes, bookmark race recovery, note anchor validation and DOM offsets, code language/UTF-8 limits, safe notification navigation, and issue-fix UI gating.

## 6. Security and operational residuals

- Dependency review updated Mongoose, Next.js, Axios, and the `ws` resolution without using forced breaking upgrades.
- Remaining production dependency audit:
  - Backend: 27 findings (1 low, 11 moderate, 15 high, 0 critical).
  - Frontend: 8 findings (2 low, 1 moderate, 5 high, 0 critical).
- Those remaining findings are inherited framework/transitive upgrade work and require a separate regression-tested dependency modernization task; no `npm audit fix --force` was used.
- Live Judge0 and AI provider success/error matrices require reachable provider credentials and are not reproducible solely from unit/build verification.
- Full signed-in browser E2E still needs deterministic Student/Admin fixtures and provider stubs in CI.

## 7. Follow-up recommendations

1. Add CI containers/stubs for MongoDB, Redis, Judge0, and the AI provider, then run authenticated Student/Admin E2E on every pull request.
2. Add lesson content version/hash to note anchors if notes must survive edited lesson content with exact positional fidelity.
3. If product scope truly requires an AI chat rather than analysis history, define conversation/thread/message schemas and a separate acceptance contract.
4. Plan controlled NestJS/transitive and Monaco sanitization upgrades to close remaining dependency advisories.

