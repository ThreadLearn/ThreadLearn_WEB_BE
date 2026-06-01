/**
 * Seed a course + lesson as ADMIN, then run a Student journey end-to-end:
 *   Register Student → Browse → Enroll → View lesson → Complete → Get notif.
 *
 * Promotes the seed user to ADMIN by directly setting role in the DB after
 * register (since no admin exists initially). Uses raw `fetch` only.
 */
import * as assert from 'node:assert/strict';
import { MongoClient } from 'mongodb';

const BASE = 'http://localhost:5000/api/v1';
const MONGO = process.env.DATABASE_URL ?? 'mongodb://localhost:27017/threadlearn';

async function api<T = any>(
  method: string, path: string, body?: unknown, token?: string,
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

async function promoteToAdmin(email: string) {
  const client = await MongoClient.connect(MONGO);
  try {
    await client.db().collection('users').updateOne(
      { email }, { $set: { role: 'ADMIN' } },
    );
  } finally { await client.close(); }
}

const stamp = Date.now();
const admin   = `admin+${stamp}@threadlearn.dev`;
const student = `student+${stamp}@threadlearn.dev`;

async function main() {
  console.log('═══ Full-journey smoke (seeded course → enroll → complete) ═══\n');

  // ── Bootstrap admin ──────────────────────────────────────────────────────
  const adminReg = await api('POST', '/auth/register', {
    email: admin, password: 'pass1234', firstName: 'Quản', lastName: 'Trị',
  });
  assert.equal(adminReg.status, 201);
  await promoteToAdmin(admin);
  const adminLogin = await api('POST', '/auth/login', { email: admin, password: 'pass1234' });
  assert.equal(adminLogin.status, 200);
  const adminToken = adminLogin.body.data.accessToken;
  console.log('  ✓ Admin bootstrapped');

  // ── UC15: create course ─────────────────────────────────────────────────
  const courseCreate = await api('POST', '/courses', {
    title:       'Lập trình đa luồng Java',
    description: 'Khóa học về concurrency, threading và race conditions trong Java cho sinh viên CNTT.',
    level:       'INTERMEDIATE',
    category:    'concurrency',
    tags:        ['java', 'threading', 'concurrency'],
    price:       0,
    durationMinutes: 240,
    isPublished: true,
  }, adminToken);
  assert.equal(courseCreate.status, 201, `course create ${courseCreate.status}`);
  const courseId = courseCreate.body.data._id;
  console.log(`  ✓ UC15 created course "${courseCreate.body.data.title}"`);

  // ── UC17: publish ───────────────────────────────────────────────────────
  await api('PATCH', `/courses/${courseId}/publish`, { isPublished: true }, adminToken);
  console.log('  ✓ UC17 published');

  // ── UC19: add 2 lessons ─────────────────────────────────────────────────
  const lesson1 = await api('POST', '/lessons', {
    courseId, title: 'Bài 1: Giới thiệu Thread',
    content: '# Thread cơ bản\n\nThread là đơn vị thực thi nhỏ nhất trong CPU...',
    durationMinutes: 20, isFreePreview: true,
  }, adminToken);
  assert.equal(lesson1.status, 201);
  const lesson1Id = lesson1.body.data._id;
  console.log(`  ✓ UC19 created lesson 1 (free preview)`);

  const lesson2 = await api('POST', '/lessons', {
    courseId, title: 'Bài 2: Race Condition',
    content: '# Race condition\n\nXảy ra khi 2 thread truy cập biến chia sẻ...',
    durationMinutes: 25,
  }, adminToken);
  assert.equal(lesson2.status, 201);
  const lesson2Id = lesson2.body.data._id;
  console.log(`  ✓ UC19 created lesson 2`);

  // ── Student journey ─────────────────────────────────────────────────────
  const studReg = await api('POST', '/auth/register', {
    email: student, password: 'pass1234', firstName: 'Sinh', lastName: 'Viên',
  });
  assert.equal(studReg.status, 201);
  const studToken = studReg.body.data.accessToken;
  console.log(`  ✓ Student registered`);

  // UC23 detail (as enrolled=false initially)
  const detail0 = await api('GET', `/courses/${courseId}`, undefined, studToken);
  assert.equal(detail0.status, 200);
  assert.equal(detail0.body.data.isEnrolled, false);
  assert.equal(detail0.body.data.lessons.length, 2);
  console.log(`  ✓ UC23 detail (isEnrolled=false, 2 lessons)`);

  // UC25 free-preview lesson 1: works without enroll
  const view1 = await api('GET', `/lessons/${lesson1Id}`, undefined, studToken);
  assert.equal(view1.status, 200, `free preview should pass, got ${view1.status}`);
  console.log(`  ✓ UC25 free preview viewable`);

  // UC25 locked lesson 2: should 403 before enroll
  const view2 = await api('GET', `/lessons/${lesson2Id}`, undefined, studToken);
  assert.equal(view2.status, 403, `non-preview lesson should 403, got ${view2.status}`);
  console.log(`  ✓ UC25 lesson 2 blocked before enroll (403)`);

  // UC26 enroll
  const enroll = await api('POST', '/enrollments', { courseId }, studToken);
  assert.equal(enroll.status, 201);
  console.log(`  ✓ UC26 enrolled`);

  // Now lesson 2 should work
  const view2b = await api('GET', `/lessons/${lesson2Id}`, undefined, studToken);
  assert.equal(view2b.status, 200);
  console.log(`  ✓ UC25 lesson 2 viewable after enroll`);

  // UC27 complete lesson 1 (progress should jump to 50%)
  const c1 = await api('POST', `/lessons/${lesson1Id}/complete`, {}, studToken);
  assert.equal(c1.status, 201);
  assert.equal(c1.body.data.progress, 50, `progress after 1/2 = 50, got ${c1.body.data.progress}`);
  console.log(`  ✓ UC27 lesson 1 complete → 50%`);

  // Idempotency
  const c1b = await api('POST', `/lessons/${lesson1Id}/complete`, {}, studToken);
  assert.equal(c1b.status, 201);
  assert.equal(c1b.body.data.progress, 50);
  console.log(`  ✓ UC27 idempotent re-complete`);

  // Complete lesson 2 → 100% → COURSE_COMPLETED
  const c2 = await api('POST', `/lessons/${lesson2Id}/complete`, {}, studToken);
  assert.equal(c2.body.data.progress, 100);
  assert.equal(c2.body.data.courseCompleted, true);
  console.log(`  ✓ UC27 lesson 2 complete → 100% + courseCompleted`);

  // UC28 progress
  const prog = await api('GET', `/enrollments/me/progress/${courseId}`, undefined, studToken);
  assert.equal(prog.body.data.completed, true);
  assert.equal(prog.body.data.completedCount, 2);
  console.log(`  ✓ UC28 progress detail (2/2 lessons)`);

  // UC53 notifications should now contain enrolled + lesson_completed + course_completed
  await new Promise((r) => setTimeout(r, 300));
  const notifs = await api('GET', '/notifications', undefined, studToken);
  const types = (notifs.body.data ?? []).map((n: any) => n.type);
  console.log(`  ✓ UC53 notifications received: [${types.join(', ')}]`);
  assert.ok(types.includes('COURSE_ENROLLED'),  'COURSE_ENROLLED fired');
  assert.ok(types.includes('LESSON_COMPLETED'), 'LESSON_COMPLETED fired');
  assert.ok(types.includes('COURSE_COMPLETED'), 'COURSE_COMPLETED fired');

  // UC34 bookmark course
  const bm = await api('POST', '/bookmarks/toggle', {
    targetType: 'COURSE', targetId: courseId, title: 'Lập trình đa luồng Java',
  }, studToken);
  assert.equal(bm.body.data.bookmarked, true);
  console.log(`  ✓ UC34 bookmarked`);

  // UC29 comment on lesson
  const cm = await api('POST', '/comments', {
    targetType: 'LESSON', targetId: lesson1Id, content: 'Bài học rất dễ hiểu!',
  }, studToken);
  assert.equal(cm.status, 201);
  console.log(`  ✓ UC29 comment posted`);

  // UC35 note on lesson
  const note = await api('POST', '/notes', {
    lessonId: lesson1Id, anchorText: 'Thread là',
    anchorStart: 0, anchorEnd: 9, noteContent: 'Ghi nhớ định nghĩa này',
  }, studToken);
  assert.equal(note.status, 201);
  console.log(`  ✓ UC35 note saved`);

  // UC58 — after 100% completion, certificate auto-issued
  await new Promise((r) => setTimeout(r, 400));
  const certs = await api('GET', '/certificates/me', undefined, studToken);
  assert.equal(certs.status, 200);
  assert.ok(certs.body.data.length >= 1, 'at least 1 certificate issued');
  const cert = certs.body.data[0];
  console.log(`  ✓ UC58 certificate auto-issued (code=${cert.certificateCode})`);

  // UC58 public verify
  const verify = await api('GET', `/certificates/verify/${cert.certificateCode}`);
  assert.equal(verify.status, 200);
  console.log(`  ✓ UC58 public verify: ${verify.body.data.holderName}`);

  // UC56 — leave a review (must have ≥50% progress — we have 100%)
  const review = await api('POST', `/courses/${courseId}/reviews`, {
    rating: 5, content: 'Khoá học rất hay, dễ hiểu cho người mới',
  }, studToken);
  assert.equal(review.status, 201, `review create ${review.status}`);
  console.log(`  ✓ UC56 review created (rating=${review.body.data.rating})`);

  // UC57 — list reviews
  const reviews = await api('GET', `/courses/${courseId}/reviews`);
  assert.equal(reviews.status, 200);
  assert.equal(reviews.body.meta.averageRating, 5);
  console.log(`  ✓ UC57 reviews list (avg=${reviews.body.meta.averageRating}, n=${reviews.body.meta.total})`);

  // UC18 admin deletes course → cascade
  await api('DELETE', `/courses/${courseId}`, undefined, adminToken);
  console.log(`  ✓ UC18 course deleted (cascade)`);

  // Verify bookmark removed in cascade
  const check = await api('GET', `/bookmarks/check?targetType=COURSE&targetId=${courseId}`, undefined, studToken);
  assert.equal(check.body.data.bookmarked, false, 'bookmark should be cascaded');
  console.log(`  ✓ Cascade: bookmark removed after course delete`);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  ✓ Full IT-learning journey passed end-to-end             ');
  console.log('═══════════════════════════════════════════════════════════');
}

main().catch((e) => { console.error('\n✗', e); process.exit(1); });
