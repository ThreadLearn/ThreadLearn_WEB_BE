export type LessonType = 'article' | 'video' | 'coding' | 'quiz' | 'assignment' | 'mixed';

export interface SeedSnippet {
  language: string;
  code: string;
  description?: string;
}

export interface SeedQuestion {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface SeedQuiz {
  title: string;
  description: string;
  passingScorePercent: number;
  timeLimitSeconds: number;
  xpReward: number;
  questions: SeedQuestion[];
}

export interface SeedTestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  points: number;
}

export interface SeedExercise {
  title: string;
  description: string;
  starterCode: string;
  language: string;
  timeLimitMs: number;
  testCases: SeedTestCase[];
}

export interface SeedLesson {
  title: string;
  slug: string;
  description: string;
  contentMarkdown: string;
  lessonType: LessonType;
  estimatedTime: number;
  isPreview?: boolean;
  isLocked?: boolean;
  status?: 'active' | 'locked' | 'hidden' | 'deleted';
  videoUrl?: string;
  codeSnippets?: SeedSnippet[];
  /** Attach quiz to this lesson (1 quiz per lesson max) */
  quiz?: SeedQuiz;
  /** Optional coding exercises for this lesson */
  exercises?: SeedExercise[];
}

export interface SeedSection {
  title: string;
  description: string;
  lessons: SeedLesson[];
}

export interface SeedCourse {
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  thumbnailPhotoId: string;
  language: 'javascript' | 'java' | 'python';
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  tags: string[];
  category: string;
  isPremium: boolean;
  price: number;
  status: 'draft' | 'published' | 'hidden' | 'archived' | 'deleted';
  estimatedDuration: number;
  prerequisiteThreshold?: number;
  /** index of courses created earlier in the seed batch, resolved later by slug */
  prerequisiteSlugs?: string[];
  sections: SeedSection[];
}

export function md(parts: TemplateStringsArray, ...vals: unknown[]): string {
  return parts.reduce((acc, p, i) => acc + p + (i < vals.length ? String(vals[i]) : ''), '').trim();
}
