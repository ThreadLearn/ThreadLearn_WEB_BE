import { SeedCourse } from './types';
import { jsFundamentalsCourse } from './course-js-fundamentals';
import { javaFundamentalsCourse } from './course-java-fundamentals';
import { parallelJsCourse } from './course-parallel-js';
import { advancedJavaCourse } from './course-advanced-java';
import { aiDraftCourse } from './course-ai-draft';
import { sumEstimatedMinutes } from './helpers';
import { SYLLABUS, printSyllabusSummary } from './syllabus';

export * from './types';
export * from './helpers';
export * from './syllabus';
export * from './lesson-builder';

function withDuration(course: SeedCourse): SeedCourse {
  return {
    ...course,
    estimatedDuration: sumEstimatedMinutes(course.sections),
  };
}

/** Complete curriculum — syllabus-aligned, full lesson bodies via buildLesson. */
export const CURRICULUM: SeedCourse[] = [
  jsFundamentalsCourse,
  javaFundamentalsCourse,
  parallelJsCourse,
  advancedJavaCourse,
  aiDraftCourse,
].map(withDuration);

export function countCurriculum() {
  let sections = 0;
  let lessons = 0;
  let quizzes = 0;
  let exercises = 0;
  let chars = 0;
  let thin = 0;
  for (const c of CURRICULUM) {
    sections += c.sections.length;
    for (const s of c.sections) {
      lessons += s.lessons.length;
      for (const l of s.lessons) {
        if (l.quiz) quizzes += 1;
        exercises += l.exercises?.length ?? 0;
        const len = l.contentMarkdown?.length ?? 0;
        chars += len;
        if (l.lessonType !== 'quiz' && len < 800) thin += 1;
      }
    }
  }
  return {
    courses: CURRICULUM.length,
    sections,
    lessons,
    quizzes,
    exercises,
    totalContentChars: chars,
    avgCharsPerLesson: lessons ? Math.round(chars / lessons) : 0,
    thinNonQuizLessons: thin,
    syllabusLines: printSyllabusSummary(),
  };
}

/** Ensure every published course has a syllabus entry (dev assert). */
export function assertSyllabusCoverage(): void {
  const slugs = new Set(SYLLABUS.map((s) => s.slug));
  for (const c of CURRICULUM) {
    if (!slugs.has(c.slug)) {
      throw new Error(`Course ${c.slug} missing from SYLLABUS`);
    }
  }
}
