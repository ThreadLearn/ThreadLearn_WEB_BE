// src/modules/quiz/constants/quiz.constant.ts

// ─── Ràng buộc field (dùng chung DTO ↔ Mongoose Schema) ────────
export const QUIZ_LIMITS = {
  TITLE_MAX: 255,
  PASSING_SCORE_MIN: 0,
  PASSING_SCORE_MAX: 100,
  XP_REWARD_MIN: 1,
  QUESTIONS_MIN: 1,
  OPTIONS_MIN: 2,
  OPTIONS_MAX: 6,
  CORRECT_ANSWER_INDEX_MIN: 0,
} as const;

// ─── Giá trị mặc định khi client không gửi ─────────────────────
export const QUIZ_DEFAULTS = {
  PASSING_SCORE_PERCENT: 80,
  XP_REWARD: 100,
} as const;

// ─── Pagination defaults (list quiz – UC36-5) ──────────────────
export const QUIZ_PAGINATION = {
  PAGE_DEFAULT: 1,
  LIMIT_DEFAULT: 20,
  LIMIT_MAX: 100,
} as const;
