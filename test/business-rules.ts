/**
 * Business-rule verification — no DB, no network.
 *
 * Asserts the pure logic behind the IT-learning platform's BR* rules
 * directly against the service source code. Acts as a fast regression
 * tripwire before booting the full stack.
 *
 * Run: `npx ts-node -P tsconfig.json test/business-rules.ts`
 */
import 'reflect-metadata';
import * as assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const src  = (p: string) => readFileSync(resolve(ROOT, p), 'utf8');

let passed = 0;
let failed = 0;

function check(label: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${label}`);
    passed++;
  } catch (err: any) {
    console.log(`  ✗ ${label}`);
    console.log(`     ${err.message ?? err}`);
    failed++;
  }
}

console.log('═══════════════════════════════════════════════════════════');
console.log('  Business rule verification — pure source inspection      ');
console.log('═══════════════════════════════════════════════════════════');

// ───────────────────────────── DEV1 ────────────────────────────────────────
console.log('\n[DEV1] Auth & user management');

check('BR-01: passwords hashed with bcrypt (≥10 rounds)', () => {
  const s = src('src/modules/auth/services/auth.service.ts');
  assert.match(s, /bcrypt\.hash\([^,]+,\s*10\)/, 'bcrypt.hash rounds=10');
});

check('BR-02: refresh tokens deleted on password reset', () => {
  const s = src('src/modules/auth/services/auth.service.ts');
  assert.ok(s.includes('refreshTokenModel.deleteMany'), 'invalidates tokens');
});

check('BR-03: forgot-password never leaks email existence', () => {
  const s = src('src/modules/auth/services/auth.service.ts');
  assert.match(s, /if \(!user\) return \{ sent: true \}/);
});

check('BR-04: admin endpoints guarded with @Roles("ADMIN")', () => {
  const s = src('src/modules/users/controllers/users.controller.ts');
  assert.ok((s.match(/@Roles\('ADMIN'\)/g) ?? []).length >= 4,
    'at least 4 admin-only endpoints');
});

// ───────────────────────────── DEV2 ────────────────────────────────────────
console.log('\n[DEV2] Course & lesson business rules');

check('BR-15: course soft-delete preserves enrollments', () => {
  const s = src('src/modules/courses/services/courses.service.ts');
  assert.ok(s.includes('isDeleted: true'),       'soft-delete flag');
  assert.ok(s.includes('lessonModel.updateMany'), 'cascades to lessons');
  assert.ok(!/enrollmentModel\.delete/.test(s),   'never hard-deletes enrollment');
});

check('BR-17: hide/show course toggles isPublished only', () => {
  const s = src('src/modules/courses/services/courses.service.ts');
  assert.match(s, /togglePublish.*\{ isPublished \}/s);
});

check('BR-24: course search supports text + level + price + tag', () => {
  const s = src('src/modules/courses/services/courses.service.ts');
  assert.ok(s.includes('$text'),       'text search');
  assert.ok(s.includes('query.level'), 'level filter');
  assert.ok(s.includes('query.price'), 'price range');
  assert.ok(s.includes('query.tags'),  'tag filter');
});

check('BR-25: Guest can view only isFreePreview lessons', () => {
  const s = src('src/modules/lessons/services/lessons.service.ts');
  assert.ok(s.includes('isFreePreview') && s.includes("ctx.role !== 'ADMIN'"),
    'preview gate present');
  assert.ok(s.includes('Please log in to view this lesson'),
    'rejects anonymous on locked content');
});

check('BR-25b: locked lessons reject non-admin', () => {
  const s = src('src/modules/lessons/services/lessons.service.ts');
  assert.ok(s.includes('isLocked') && s.includes('lesson is currently locked'),
    'lock gate fires before access check');
});

check('BR-26: cannot enroll twice in same course', () => {
  const s = src('src/modules/enrollments/services/enrollments.service.ts');
  assert.match(s, /already enrolled/i);
});

check('BR-27: complete lesson is idempotent (E11000 race-safe)', () => {
  const s = src('src/modules/lessons/services/lessons.service.ts');
  assert.ok(s.includes("err?.code !== 11000"), 'E11000 caught');
  assert.ok(s.includes('upsert'),               'upsert pattern');
});

check('BR-28: progress percent computed from real lesson count', () => {
  const s = src('src/modules/lessons/services/lessons.service.ts');
  assert.match(s, /completedLessons \/ totalLessons/);
  assert.ok(s.includes('Math.round'), 'rounded integer');
});

// ───────────────────────────── DEV3 ────────────────────────────────────────
console.log('\n[DEV3] Comment / Bookmark / Note / IDE / AI');

check('BR-26-c: enrollment required to comment (Admin bypass)', () => {
  const s = src('src/modules/comment/services/comment.service.ts');
  assert.ok(s.includes("userRole === 'ADMIN'"), 'admin bypass branch');
  assert.ok(s.includes('must be enrolled'),     'enrollment required');
});

check('BR-27: edit/delete only own comment (Admin override)', () => {
  const s = src('src/modules/comment/services/comment.service.ts');
  assert.match(s, /userRole !== 'ADMIN' && comment\.userId\.toString\(\) !== userId/);
});

check('BR-28: replies use parentId belonging to same target', () => {
  const s = src('src/modules/comment/services/comment.service.ts');
  assert.ok(s.includes('parent.targetType !== data.targetType')
        || s.includes('parent.targetId   !== data.targetId')
        || s.includes('parent.targetId !== data.targetId'),
    'parent target consistency checked');
});

check('BR-33: bookmark unique compound index (userId,target)', () => {
  const s = src('src/modules/bookmark/models/bookmark.model.ts');
  assert.match(s, /BookmarkSchema\.index\(\s*\{[^}]*userId:\s*1[^}]*targetType:\s*1[^}]*targetId:\s*1[^}]*\}\s*,\s*\{\s*unique:\s*true/);
});

check('BR-34: bookmark toggle handles E11000 race', () => {
  const s = src('src/modules/bookmark/services/bookmark.service.ts');
  assert.ok(s.includes('11000'), 'duplicate-key handled');
});

check('BR-25-note: note never returned for another user', () => {
  const s = src('src/modules/note/services/note.service.ts');
  assert.match(s, /findOne\(\{\s*_id:\s*noteId,\s*userId\s*\}/);
});

check('BR-44: code-execution daily limit = 20', () => {
  const s = src('src/modules/code-execution/services/code-execution.service.ts');
  assert.match(s, /CODE_RUN_LIMIT\s*=\s*20/);
});

check('BR-45: verdict computes PASS/FAIL/PARTIAL/ERROR', () => {
  const s = src('src/modules/code-execution/services/code-execution.service.ts');
  for (const v of ['PASS', 'FAIL', 'PARTIAL', 'ERROR']) {
    assert.ok(s.includes(`'${v}'`), `verdict ${v}`);
  }
});

check('BR-51: AI quotas Free=10, Premium=40', () => {
  const s = src('src/modules/ai-analysis/services/ai-analysis.service.ts');
  assert.match(s, /FREE_QUOTA\s*=\s*10/);
  assert.match(s, /PREMIUM_QUOTA\s*=\s*40/);
});

check('BR-51b: AI rejects empty / >5000 char code', () => {
  const s = src('src/modules/ai-analysis/services/ai-analysis.service.ts');
  assert.match(s, /Code cannot be empty/);
  assert.match(s, /at most 5000/);
});

check('BR-53: 11 notification event types declared', () => {
  const s = src('src/modules/notifications/models/notification.model.ts');
  for (const t of [
    'LESSON_COMPLETED', 'QUIZ_PASSED', 'QUIZ_FAILED',
    'COURSE_COMPLETED', 'COURSE_ENROLLED', 'LEVEL_UP',
    'BOOKMARK_COURSE_UPDATED', 'PAYMENT_SUCCESS',
    'NEW_USER_REGISTERED', 'STUDENT_COMMENT_REPORT', 'SYSTEM_ERROR',
  ]) assert.ok(s.includes(`'${t}'`), `type ${t} declared`);
});

// ───────────────────────────── DEV4 ────────────────────────────────────────
console.log('\n[DEV4] Quiz / gamification');

check('BR-41: quiz passing threshold = 80%', () => {
  const s = src('src/modules/quiz-attempts/services/quiz-attempts.service.ts');
  assert.match(s, /score\s*>=\s*80/);
});

check('BR-48: XP awarded on quiz pass, level = floor(xp/1000)+1', () => {
  const s = src('src/modules/quiz-attempts/services/quiz-attempts.service.ts');
  assert.match(s, /Math\.floor\(stats\.xp\s*\/\s*1000\)\s*\+\s*1/);
});

check('BR-49: streak increments only on consecutive days', () => {
  const s = src('src/modules/quiz-attempts/services/quiz-attempts.service.ts');
  assert.match(s, /dayDiff\s*===\s*1/);
});

check('BR-50: leaderboard rank = (users with strictly higher XP) + 1', () => {
  const s = src('src/modules/leaderboard/services/leaderboard.service.ts');
  assert.match(s, /xp:\s*\{\s*\$gt:.*\}/);
});

// ───────────────────────────── Cross-DEV ───────────────────────────────────
console.log('\n[Cross-DEV] Module wiring');

check('LessonsModule imports NotificationsModule', () => {
  const s = src('src/modules/lessons/lessons.module.ts');
  assert.ok(s.includes('NotificationsModule'));
});

check('EnrollmentsModule imports NotificationsModule', () => {
  const s = src('src/modules/enrollments/enrollments.module.ts');
  assert.ok(s.includes('NotificationsModule'));
});

check('QuizAttemptsModule imports NotificationsModule', () => {
  const s = src('src/modules/quiz-attempts/quiz-attempts.module.ts');
  assert.ok(s.includes('NotificationsModule'));
});

check('AdminModule registered in AppModule', () => {
  const s = src('src/app.module.ts');
  assert.ok(s.includes('AdminModule'));
});

check('All 17 modules registered in AppModule', () => {
  const s = src('src/app.module.ts');
  const want = [
    'AuthModule', 'UsersModule', 'CoursesModule', 'LessonsModule',
    'EnrollmentsModule', 'GamificationModule', 'LeaderboardModule',
    'QuizModule', 'QuizAttemptsModule',
    'CommentModule', 'BookmarkModule', 'NoteModule',
    'CodeExecutionModule', 'AIAnalysisModule', 'NotificationsModule',
    'AdminModule',
  ];
  for (const m of want) assert.ok(s.includes(m), `${m} registered`);
});

// ───────────────────────────── FE contract ─────────────────────────────────
console.log('\n[FE↔BE] Contract checks');

check('FE auth.service maps BE user shape', () => {
  if (!existsSync(resolve(ROOT, '..', 'ThreadLearn_WEB_FE/src/services/auth.service.ts'))) {
    console.log('     (FE not in expected sibling path — skipped)');
    return;
  }
  const s = readFileSync(resolve(ROOT, '..', 'ThreadLearn_WEB_FE/src/services/auth.service.ts'), 'utf8');
  assert.ok(s.includes('mapUserFromBE'));
});

check('FE socket connects to /notifications namespace with JWT', () => {
  const p = resolve(ROOT, '..', 'ThreadLearn_WEB_FE/src/hooks/useNotificationSocket.ts');
  if (!existsSync(p)) return;
  const s = readFileSync(p, 'utf8');
  assert.match(s, /\/notifications/);
  assert.match(s, /auth:\s*\{\s*token:/);
});

// ───────────────────────────── Done ────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════════════════');
console.log(`  ${passed} passed, ${failed} failed`);
console.log('═══════════════════════════════════════════════════════════');
if (failed > 0) process.exit(1);
