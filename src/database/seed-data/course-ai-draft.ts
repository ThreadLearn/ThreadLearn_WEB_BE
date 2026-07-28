import { SeedCourse } from './types';
import { buildLesson, makeQuiz, mcq } from './lesson-builder';

/** DRAFT Premium — AI concurrency debugging */
export const aiDraftCourse: SeedCourse = {
  title: 'AI-Assisted Concurrency Debugging',
  slug: 'ai-assisted-concurrency-debugging',
  shortDescription: 'Draft: pipeline AST→BM25→LLM, pattern catalog, IDE+AI workflow.',
  description:
    'Khóa Premium draft: kiến trúc AI ThreadLearn, pattern race/deadlock, hybrid BM25+LLM, workflow IDE. ' +
    'Prerequisite: JS + Java foundations. status=draft (chưa publish học viên).',
  thumbnailPhotoId: 'photo-1677442136019-21780ecad995',
  language: 'javascript',
  level: 'ADVANCED',
  tags: ['ai', 'race-condition', 'ast', 'llm', 'premium', 'draft'],
  category: 'Concurrent Programming',
  isPremium: true,
  price: 299000,
  status: 'draft',
  estimatedDuration: 360,
  prerequisiteSlugs: ['js-concurrency-fundamentals', 'java-multithreading-foundations'],
  sections: [
    {
      title: 'Module 1 — AI analysis pipeline (Draft)',
      description: 'Arch, patterns, BM25/LLM, workflow, quiz.',
      lessons: [
        buildLesson({
          title: 'Kiến trúc AI microservice ThreadLearn',
          slug: 'ai-arch-overview',
          description: 'BE gateway, quota, AI service, Redis, history.',
          estimatedTime: 30,
          lessonType: 'article',
          status: 'hidden',
          objectives: [
            'Vẽ flow IDE→BE→AI→history',
            'Biết quota FREE 10 / PREMIUM ~40',
            'Vai trò Redis cache',
          ],
          sections: [
            {
              heading: 'Pipeline',
              body:
                '```\nIDE → BE /api/v1/ai/* (JWT + daily quota)\n    → AI /api/v1/ai/analyze\n         AST → rules → BM25 → LLM\n    → AIHistory (+ stream optional)\n```\n\n' +
                'BE không chạy Babel/LangChain — BFF + quota + persist.',
            },
          ],
          nextUp: 'AST patterns.',
        }),
        buildLesson({
          title: 'AST & static patterns cho race/deadlock',
          slug: 'ai-ast-patterns',
          description: 'Catalog pattern_id.',
          estimatedTime: 35,
          lessonType: 'article',
          status: 'hidden',
          objectives: ['Thuộc 4 pattern_id chính', 'Map sang bài FREE JS/Java'],
          sections: [
            {
              heading: 'Catalog',
              body:
                '| ID | Ngôn ngữ | Dấu hiệu |\n|---|---|---|\n' +
                '| async-rmw-race | JS | read→await→write |\n' +
                '| sab-data-race | JS | SAB RMW không Atomics |\n' +
                '| java-non-atomic-increment | Java | count++ unsync |\n' +
                '| lock-order-risk | Java | lock order khác nhau |',
            },
          ],
          nextUp: 'BM25 + LLM.',
        }),
        buildLesson({
          title: 'BM25 knowledge + LLM explanation',
          slug: 'ai-bm25-llm',
          description: 'Hybrid retrieval + wording.',
          estimatedTime: 30,
          lessonType: 'article',
          status: 'hidden',
          objectives: [
            'Rules = signal chắc',
            'BM25 = docs',
            'LLM = explanation — human review',
          ],
          sections: [
            {
              heading: 'Hybrid',
              body: 'Cache Redis theo hash(code+lang). Không tin LLM mù quáng cho security/concurrency fix.',
            },
          ],
          nextUp: 'IDE workflow.',
        }),
        buildLesson({
          title: 'Workflow IDE: analyze → fix → re-run tests',
          slug: 'ai-ide-workflow',
          description: 'Feedback rating loop.',
          estimatedTime: 30,
          lessonType: 'mixed',
          status: 'hidden',
          objectives: [
            'Thực hiện 5 bước workflow',
            'Rate feedback 1–5',
            'Gắn exercise sau khi fix',
          ],
          sections: [
            {
              heading: '5 bước',
              body:
                '1. Viết lab có race cố ý\n2. AI analyze (stream optional)\n' +
                '3. Đọc issues[].severity + fix\n4. Apply → chạy tests\n5. Rate history feedback',
            },
          ],
          nextUp: 'Draft quiz.',
        }),
        buildLesson({
          title: 'Draft checkpoint: AI concurrency concepts',
          slug: 'ai-draft-quiz',
          description: 'Internal draft quiz.',
          estimatedTime: 20,
          lessonType: 'quiz',
          status: 'hidden',
          showIdeNote: false,
          objectives: ['Đạt ≥ 70% draft quiz'],
          sections: [{ heading: 'Phạm vi', body: 'Arch + pattern catalog.' }],
          quiz: makeQuiz(
            'Draft — AI Concurrency Pipeline',
            'Internal',
            [
              mcq('BE gọi AI service để?', ['Render CSS', 'Analyze + quota/history', 'Replace Mongo', 'Compile only'], 1),
              mcq('SAB increment thiếu Atomics?', ['style-bug', 'sab-data-race', 'css-race', 'dns'], 1),
            ],
            { passingScorePercent: 70, timeLimitSeconds: 400, xpReward: 50 },
          ),
        }),
      ],
    },
  ],
};
