/**
 * PORT: tự tạo exercise mẫu khi tạo lesson dạng coding/mixed.
 * Adapter (infrastructure) là nơi DUY NHẤT chạm model Exercise của module code-execution.
 */
export interface SeedExerciseInput {
  lessonId: string;
  lessonTitle: string;
  courseLanguage: string;
}

export interface IExerciseSeederPort {
  seedStarter(input: SeedExerciseInput): Promise<void>;
}

export const EXERCISE_SEEDER_PORT = Symbol('EXERCISE_SEEDER_PORT');
