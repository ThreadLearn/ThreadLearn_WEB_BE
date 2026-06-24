import { ExerciseEntity } from '../entities/exercise.entity';

export interface IExerciseRepository {
  listByLesson(lessonId: string): Promise<unknown[]>;
  findById(id: string): Promise<ExerciseEntity | null>;
  findViewById(id: string): Promise<any | null>;
  create(exercise: ExerciseEntity): Promise<unknown>;
  update(exercise: ExerciseEntity): Promise<unknown>;
  remove(id: string): Promise<void>;
}

export const EXERCISE_REPOSITORY = Symbol('EXERCISE_REPOSITORY');
