import { SeedExercise, SeedLesson, SeedQuiz, SeedSnippet, md } from './types';

export interface LessonSection {
  heading: string;
  body: string;
  code?: { language: string; code: string; caption?: string };
}

export interface BuildLessonInput {
  title: string;
  slug: string;
  description: string;
  estimatedTime: number;
  lessonType: SeedLesson['lessonType'];
  isPreview?: boolean;
  isLocked?: boolean;
  status?: SeedLesson['status'];
  /** 3–6 learning objectives */
  objectives: string[];
  /** Main teaching sections */
  sections: LessonSection[];
  /** Common mistakes */
  pitfalls?: string[];
  /** Self-check questions */
  selfCheck?: string[];
  /** Next lesson teaser */
  nextUp?: string;
  codeSnippets?: SeedSnippet[];
  quiz?: SeedQuiz;
  exercises?: SeedExercise[];
  /** Note about IDE playground on FE */
  showIdeNote?: boolean;
}

/** Build a complete lesson markdown body (target ~2–5KB for teaching lessons). */
export function buildLesson(input: BuildLessonInput): SeedLesson {
  const {
    title,
    objectives,
    sections,
    pitfalls = [],
    selfCheck = [],
    nextUp,
    showIdeNote = true,
  } = input;

  const parts: string[] = [];
  parts.push(`# ${title}`, '');
  parts.push('## Mục tiêu học tập');
  objectives.forEach((o, i) => parts.push(`${i + 1}. ${o}`));
  parts.push('');
  parts.push(
    `> **Thời lượng gợi ý:** ~${input.estimatedTime} phút đọc + thực hành. ` +
      `Đọc hết lý thuyết trước khi chuyển IDE/quiz.`,
  );
  parts.push('');

  if (showIdeNote && input.lessonType !== 'quiz') {
    parts.push(
      '> **Về IDE trên trang học:** khung *ThreadLearn IDE* là playground luyện concurrent (FE). ' +
        'Nó **không thay** nội dung bài. Dùng để Run thử snippet sau khi đã hiểu phần markdown.',
    );
    parts.push('');
  }

  sections.forEach((s, idx) => {
    parts.push(`## ${idx + 1}. ${s.heading}`, '');
    parts.push(s.body.trim(), '');
    if (s.code) {
      if (s.code.caption) parts.push(`*${s.code.caption}*`, '');
      parts.push('```' + s.code.language, s.code.code.trim(), '```', '');
    }
  });

  if (pitfalls.length) {
    parts.push('## Cạm bẫy thường gặp', '');
    pitfalls.forEach((p) => parts.push(`- ${p}`));
    parts.push('');
  }

  if (selfCheck.length) {
    parts.push('## Tự kiểm tra', '');
    selfCheck.forEach((q, i) => parts.push(`${i + 1}. ${q}`));
    parts.push('');
  }

  parts.push('## Checklist hoàn thành bài');
  parts.push('- [ ] Đã đọc hết các mục lý thuyết');
  parts.push('- [ ] Đã hiểu ví dụ code (chạy mentally hoặc IDE)');
  if (input.exercises?.length) parts.push('- [ ] Đã làm exercise/lab gắn bài');
  if (input.quiz) parts.push('- [ ] Đã làm quiz gắn bài (nếu có)');
  parts.push('- [ ] Đánh dấu hoàn thành lesson trên platform');
  parts.push('');

  if (nextUp) {
    parts.push('## Bước tiếp theo', '');
    parts.push(nextUp, '');
  }

  let contentMarkdown = parts.join('\n').trim();

  // Guarantee teaching lessons are never "outline stubs" on the lesson page.
  if (input.lessonType !== 'quiz' && contentMarkdown.length < 900) {
    contentMarkdown += [

      '',
      '## Tóm tắt & luyện thêm',
      '',
      'Hãy giải thích lại bài này bằng lời của bạn (3–5 câu), rồi mở **IDE playground** (nếu có) ' +
        'để thử một snippet liên quan. Ghi chú (`Notes`) ít nhất một ý: định nghĩa, ví dụ code, hoặc cạm bẫy.',
      '',
      'Nếu vẫn chưa rõ, quay lại **mục tiêu học tập** ở đầu bài và đọc lại từng section. ' +
        'Đặt câu hỏi trên **Discussion** của lesson để giảng viên/bạn học hỗ trợ.',
      '',
      '### Gợi ý ôn',
      `- Viết 1 flashcard: khái niệm chính của “${title}”.`,
      '- Viết 1 ví dụ code tối thiểu (5–15 dòng) minh họa ý chính.',
      '- Liên hệ với bài trước/sau trong cùng module (syllabus ThreadLearn).',
      '',
    ].join('\n');
  }

  return {
    title: input.title,
    slug: input.slug,
    description: input.description,
    contentMarkdown,
    lessonType: input.lessonType,
    estimatedTime: input.estimatedTime,
    isPreview: input.isPreview,
    isLocked: input.isLocked,
    status: input.status,
    codeSnippets: input.codeSnippets,
    quiz: input.quiz,
    exercises: input.exercises,
  };
}

export function mcq(
  questionText: string,
  options: [string, string, string, string],
  correctAnswerIndex: 0 | 1 | 2 | 3,
) {
  return { questionText, options: [...options], correctAnswerIndex };
}

export function makeQuiz(
  title: string,
  description: string,
  questions: ReturnType<typeof mcq>[],
  opts?: Partial<Pick<SeedQuiz, 'passingScorePercent' | 'timeLimitSeconds' | 'xpReward'>>,
): SeedQuiz {
  return {
    title,
    description,
    passingScorePercent: opts?.passingScorePercent ?? 75,
    timeLimitSeconds: opts?.timeLimitSeconds ?? 600,
    xpReward: opts?.xpReward ?? 120,
    questions,
  };
}

export function codeBlock(language: string, code: string, description?: string): SeedSnippet {
  return { language, code: code.trim(), description };
}

export { md };
