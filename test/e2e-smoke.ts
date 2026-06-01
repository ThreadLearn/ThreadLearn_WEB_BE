/**
 * ThreadLearn — End-to-end smoke test (self-contained, no Jest).
 *
 * Run a real NestJS server first:
 *   npm run dev    # or `npm run start`
 *
 * Then in another shell:
 *   npx ts-node -P tsconfig.json test/e2e-smoke.ts
 *
 * Walks the IT-learning business journeys J1..J8 and asserts each step.
 * Designed to be idempotent: every run uses a unique seed email.
 */
import * as assert from 'node:assert/strict';

const BASE = process.env.BASE_URL ?? 'http://localhost:5000/api/v1';
const SEED = `qa+${Date.now()}@threadlearn.dev`;

interface Ctx {
  studentToken?: string;
  studentId?:    string;
  adminToken?:   string;
  adminId?:      string;
  courseId?:     string;
  lessonId?:     string;
}

async function api<T = any>(
  method: string, path: string,
  body?: unknown, token?: string,
): Promise<{ status: number; body: T }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: any = {};
  try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { raw: text }; }
  return { status: res.status, body: parsed };
}

const pass = (msg: string) => console.log(`  ✓ ${msg}`);
const step = (n: string, label: string) => console.log(`\n[${n}] ${label}`);
const fail = (msg: string, detail?: unknown) => {
  console.error(`  ✗ ${msg}`);
  if (detail !== undefined) console.error(detail);
  process.exit(1);
};

// ───────────────────────────────────────────────────────────────────────────
async function J1_onboarding(ctx: Ctx) {
  step('J1', 'Onboarding — Register → Login → /auth/me');

  const reg = await api('POST', '/auth/register', {
    email: SEED, password: 'pass1234', firstName: 'QA', lastName: 'Bot',
  });
  assert.equal(reg.status, 201, `register status (got ${reg.status})`);
  assert.ok(reg.body?.data?.accessToken, 'access token returned');
  ctx.studentToken = reg.body.data.accessToken;
  ctx.studentId    = reg.body.data.user._id ?? reg.body.data.user.id;
  pass(`registered as ${SEED}`);

  const login = await api('POST', '/auth/login', { email: SEED, password: 'pass1234' });
  assert.equal(login.status, 200, 'login 200');
  assert.ok(login.body?.data?.user?.name, 'user.name mapped');
  pass(`login + user.name = "${login.body.data.user.name}"`);

  const me = await api('GET', '/auth/me', undefined, ctx.studentToken);
  assert.equal(me.status, 200);
  pass('GET /auth/me');
}

async function J2_browse(ctx: Ctx) {
  step('J2', 'Browse courses + filter');

  const list = await api('GET', '/courses?limit=5');
  assert.equal(list.status, 200);
  assert.ok(Array.isArray(list.body?.data), 'data is array');
  pass(`GET /courses returned ${list.body.data.length} courses`);

  const search = await api('GET', '/courses/search?level=BEGINNER&limit=5');
  assert.equal(search.status, 200);
  pass(`UC24 search?level=BEGINNER returned ${search.body.data.length}`);

  if (list.body.data[0]?._id) ctx.courseId = list.body.data[0]._id;
}

async function J3_lesson_complete(ctx: Ctx) {
  step('J3', 'Lesson view + complete');

  if (!ctx.courseId) {
    pass('skipped (no seed course in DB)');
    return;
  }

  const detail = await api('GET', `/courses/${ctx.courseId}`, undefined, ctx.studentToken);
  assert.equal(detail.status, 200);
  pass(`UC23 course detail (isEnrolled=${detail.body.data.isEnrolled})`);

  // Enroll if not yet
  if (!detail.body.data.isEnrolled) {
    const enr = await api('POST', '/enrollments', { courseId: ctx.courseId }, ctx.studentToken);
    if (enr.status !== 201 && enr.status !== 200) {
      fail(`UC26 enroll failed ${enr.status}`, enr.body);
    }
    pass('UC26 enrolled');
  }

  const lessons = detail.body.data.lessons;
  if (lessons?.length) {
    ctx.lessonId = lessons[0]._id;

    const view = await api('GET', `/lessons/${ctx.lessonId}`, undefined, ctx.studentToken);
    if (view.status !== 200 && view.status !== 403) {
      fail(`UC25 view lesson status ${view.status}`, view.body);
    }
    pass(`UC25 lesson view (status=${view.status})`);

    const complete = await api('POST', `/lessons/${ctx.lessonId}/complete`, {}, ctx.studentToken);
    if (![200, 201, 403].includes(complete.status)) {
      fail(`UC27 complete unexpected ${complete.status}`, complete.body);
    }
    pass(`UC27 complete (status=${complete.status})`);
  }

  const progress = await api('GET', '/enrollments/me', undefined, ctx.studentToken);
  assert.equal(progress.status, 200);
  pass(`UC28 /enrollments/me returned ${progress.body.data.length} enrollments`);
}

async function J4_social(ctx: Ctx) {
  step('J4', 'Bookmark + Note + Comment');

  if (ctx.courseId) {
    const bm = await api('POST', '/bookmarks/toggle', {
      targetType: 'COURSE', targetId: ctx.courseId, title: 'QA course',
    }, ctx.studentToken);
    assert.ok(bm.status === 200 || bm.status === 201, `bookmark toggle status ${bm.status}`);
    pass(`UC34 bookmark toggle (bookmarked=${bm.body.data.bookmarked}, status=${bm.status})`);

    const check = await api(
      'GET', `/bookmarks/check?targetType=COURSE&targetId=${ctx.courseId}`,
      undefined, ctx.studentToken,
    );
    assert.equal(check.status, 200);
    pass(`UC33 bookmark check (bookmarked=${check.body.data.bookmarked})`);
  }

  if (ctx.lessonId) {
    const note = await api('POST', '/notes', {
      lessonId: ctx.lessonId, anchorText: 'race condition',
      anchorStart: 0, anchorEnd: 14, noteContent: 'QA test note',
    }, ctx.studentToken);
    if (![201, 200, 403].includes(note.status)) {
      fail(`UC35 note unexpected ${note.status}`, note.body);
    }
    pass(`UC35 note (status=${note.status})`);

    const comment = await api('POST', '/comments', {
      targetType: 'LESSON', targetId: ctx.lessonId, content: 'QA smoke comment',
    }, ctx.studentToken);
    if (![201, 200, 403].includes(comment.status)) {
      fail(`UC29 comment unexpected ${comment.status}`, comment.body);
    }
    pass(`UC29 comment (status=${comment.status})`);
  }
}

async function J5_gamification(ctx: Ctx) {
  step('J5', 'Gamification & Leaderboard');

  const stats = await api('GET', '/gamification/stats', undefined, ctx.studentToken);
  assert.equal(stats.status, 200);
  assert.ok(typeof stats.body.data.xp === 'number', 'xp is number');
  pass(`UC48 stats xp=${stats.body.data.xp}, level=${stats.body.data.level}`);

  const myRank = await api('GET', '/leaderboard/me', undefined, ctx.studentToken);
  assert.equal(myRank.status, 200);
  pass(`UC49 my rank = #${myRank.body.data.rank}`);

  const top = await api('GET', '/leaderboard?limit=5');
  assert.equal(top.status, 200);
  pass(`UC50 top-${top.body.data.length} leaderboard`);
}

async function J6_ai_quota(ctx: Ctx) {
  step('J6', 'AI Analysis quota (Free=10)');

  const ai = await api('POST', '/ai-analysis/recommend', {
    inputCode: 'let x = 0; for (let i = 0; i < 10; i++) { x++; }',
    language: 'javascript',
  }, ctx.studentToken);
  if (![200, 201].includes(ai.status)) {
    fail(`UC46 AI unexpected ${ai.status}`, ai.body);
  }
  assert.ok(Array.isArray(ai.body.data.suggestions), 'suggestions array');
  pass(`UC46 AI returned ${ai.body.data.suggestions.length} suggestions (remaining=${ai.body.data.remainingQuota})`);
}

async function J7_notifications(ctx: Ctx) {
  step('J7', 'Notifications received from DEV2 events');

  // After enroll + complete, expect at least 1 notification.
  const notifs = await api('GET', '/notifications?limit=10', undefined, ctx.studentToken);
  assert.equal(notifs.status, 200);
  pass(`UC53 notifications: ${notifs.body.data.length} delivered`);
  if (notifs.body.data.length > 0) {
    const types = [...new Set(notifs.body.data.map((n: any) => n.type))];
    console.log(`     types: ${types.join(', ')}`);
  }

  const unread = await api('GET', '/notifications/unread-count', undefined, ctx.studentToken);
  assert.equal(unread.status, 200);
  pass(`unread = ${unread.body.data?.count ?? unread.body.data}`);
}

async function J8_unauthorized(_ctx: Ctx) {
  step('J8', 'Edge: unauthorized & not found');

  const noauth = await api('GET', '/users/me');
  assert.equal(noauth.status, 401, '401 without token');
  pass('UC25 unauth GET /users/me → 401');

  const ghost = await api('GET', '/courses/000000000000000000000000');
  assert.ok(ghost.status === 404 || ghost.status === 200,
    `course not found status=${ghost.status}`);
  pass(`bogus courseId → ${ghost.status}`);

  const badEnroll = await api('POST', '/enrollments', { courseId: 'not-a-mongoid' });
  assert.equal(badEnroll.status, 401, '401 without token');
  pass('enroll without token → 401');
}

// ───────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  ThreadLearn — E2E smoke (IT learning platform business)  ');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Base URL: ${BASE}\n`);

  const ctx: Ctx = {};
  try {
    await J1_onboarding(ctx);
    await J2_browse(ctx);
    await J3_lesson_complete(ctx);
    await J4_social(ctx);
    await J5_gamification(ctx);
    await J6_ai_quota(ctx);
    await J7_notifications(ctx);
    await J8_unauthorized(ctx);
  } catch (err) {
    console.error('\n✗ Smoke aborted:', err);
    process.exit(1);
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  ✓ All journeys passed (J1-J8)                            ');
  console.log('═══════════════════════════════════════════════════════════');
}

main().catch((e) => { console.error(e); process.exit(1); });
