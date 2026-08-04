import mongoose from 'mongoose';
import connectToDatabase from '../src/configs/db';
import { Course } from '../src/modules/courses/models/course.model';
import { User } from '../src/modules/auth/models/user.model';

const COURSE_KEY = 'QA-COURSE-20260728-COURSE-MANAGEMENT';
const INSTRUCTOR_EMAIL = 'instructor@threadlearn.com';

async function main() {
  const makeDraft = process.argv.includes('--make-draft');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('This QA assignment script refuses to run in production.');
  }

  await connectToDatabase();
  const instructor = await User.findOne({ email: INSTRUCTOR_EMAIL }).select('_id role isActive lockedAt').lean();
  if (!instructor || instructor.role !== 'INSTRUCTOR' || instructor.isActive === false || instructor.lockedAt) {
    throw new Error('The QA instructor account must exist, be active, unlocked, and have role INSTRUCTOR.');
  }

  const courses = await Course.find({ $or: [{ title: COURSE_KEY }, { slug: COURSE_KEY.toLowerCase() }] })
    .select('_id title slug instructorId status createdBy')
    .lean();
  if (courses.length !== 1) {
    throw new Error(`Expected exactly one QA course for ${COURSE_KEY}; found ${courses.length}.`);
  }

  const course = courses[0];
  const update: Record<string, unknown> = { instructorId: instructor._id };
  if (makeDraft && course.status === 'published') update.status = 'draft';
  await Course.updateOne({ _id: course._id }, { $set: update });
  const after = await Course.findById(course._id).select('_id instructorId status').lean();
  console.log(JSON.stringify({
    courseId: String(course._id),
    instructorId: String(instructor._id),
    previousStatus: course.status,
    status: after?.status,
    assigned: String(after?.instructorId) === String(instructor._id),
  }));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => mongoose.connection.readyState && mongoose.connection.close());
