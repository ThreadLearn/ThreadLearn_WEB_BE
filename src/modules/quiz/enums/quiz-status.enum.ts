// src/modules/quiz/enums/quiz-status.enum.ts

export enum QuizStatus {
  DRAFT = 'draft',           // đang soạn, chưa phát hành
  PUBLISHED = 'published',   // đã phát hành cho student làm
  ARCHIVED = 'archived',     // ẩn đi, không cho làm nữa
}