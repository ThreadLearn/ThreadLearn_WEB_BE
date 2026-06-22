export interface ExerciseUpsertPayload {
  lessonId: string;
  title: string;
  description?: string;
  starterCode?: string;
  language: string;
  testCases?: { input?: string; expectedOutput: string; isHidden?: boolean; points?: number }[];
  timeLimitMs?: number;
}
