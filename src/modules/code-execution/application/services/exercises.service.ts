import { Inject, Injectable } from '@nestjs/common';
import { BadRequestError, NotFoundError } from '../../../../common/custom-error';
import {
  ILearningAccess,
  LEARNING_ACCESS,
} from '../../../../shared/domain/interfaces/learning-access.port';
import { ExerciseEntity } from '../../domain/entities/exercise.entity';
import { EXERCISE_REPOSITORY, IExerciseRepository } from '../../domain/interfaces/exercise.repository';
import { ExerciseUpsertPayload } from '../dto/exercise.dto';
import { CodeExecutionService } from './code-execution.service';

export type Verdict = 'PASS' | 'PARTIAL' | 'FAIL' | 'ERROR';

@Injectable()
export class ExercisesService {
  constructor(
    @Inject(EXERCISE_REPOSITORY) private readonly exercises: IExerciseRepository,
    @Inject(LEARNING_ACCESS) private readonly learningAccess: ILearningAccess,
    private readonly codeExecution: CodeExecutionService,
  ) {}

  async listByLesson(lessonId: string) {
    return this.exercises.listByLesson(lessonId);
  }

  async getById(id: string) {
    const exercise = await this.exercises.findViewById(id);
    if (!exercise) throw new NotFoundError('Exercise not found.');
    return exercise;
  }

  async create(payload: ExerciseUpsertPayload) {
    return this.exercises.create(ExerciseEntity.createNew(payload));
  }

  async update(id: string, payload: Partial<ExerciseUpsertPayload>) {
    const exercise = await this.exercises.findById(id);
    if (!exercise) throw new NotFoundError('Exercise not found.');
    exercise.applyPatch(payload);
    return this.exercises.update(exercise);
  }

  async remove(id: string) {
    const exercise = await this.exercises.findById(id);
    if (!exercise) throw new NotFoundError('Exercise not found.');
    await this.exercises.remove(id);
    return { id };
  }

  async grade(userId: string, exerciseId: string, sourceCode: string) {
    const exercise = await this.exercises.findById(exerciseId);
    if (!exercise) throw new NotFoundError('Exercise not found.');
    if (!sourceCode?.trim()) throw new BadRequestError('sourceCode is required.');
    const props = exercise.toProps();

    await this.learningAccess.assertLessonInteractionAccess(props.lessonId, { id: userId, role: 'STUDENT' });

    const results: Array<{
      index: number;
      passed: boolean;
      isHidden: boolean;
      input?: string;
      expectedOutput?: string;
      actualOutput?: string;
      points: number;
      runtime?: string;
      stderr?: string;
    }> = [];
    let earnedPoints = 0;
    let passedCases = 0;

    for (let i = 0; i < props.testCases.length; i++) {
      const tc = props.testCases[i];
      let result: any;
      let crashed = false;
      try {
        result = await this.codeExecution.executeCode(userId, {
          sourceCode,
          language: props.language,
          stdin: tc.input,
          lessonId: props.lessonId,
          exerciseId: props.id,
        });
      } catch (err) {
        crashed = true;
        result = { stdout: '', stderr: (err as Error).message, status: { description: 'ERROR' } };
      }
      const actual = (result.stdout ?? '').replace(/\s+$/g, '');
      const expected = (tc.expectedOutput ?? '').replace(/\s+$/g, '');
      const passed = !crashed && !result.stderr && actual === expected;
      if (passed) {
        passedCases += 1;
        earnedPoints += tc.points || 0;
      }
      results.push({
        index: i,
        passed,
        isHidden: tc.isHidden,
        ...(tc.isHidden ? {} : { input: tc.input, expectedOutput: tc.expectedOutput, actualOutput: actual }),
        points: tc.points || 0,
        runtime: result.runtime,
        stderr: result.stderr || undefined,
      });
    }

    const totalCases = props.testCases.length;
    const totalPoints = props.totalPoints || totalCases;
    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    let verdict: Verdict;
    if (results.some((r) => r.stderr)) verdict = 'ERROR';
    else if (passedCases === 0) verdict = 'FAIL';
    else if (passedCases === totalCases) verdict = 'PASS';
    else verdict = 'PARTIAL';

    return { exerciseId: props.id, verdict, passedCases, totalCases, earnedPoints, totalPoints, score, testResults: results };
  }
}
