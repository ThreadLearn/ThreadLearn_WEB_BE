import mongoose from 'mongoose';
import { Exercise } from '../models/exercise.model';
import { CodeExecutionService } from './code-execution.service';
import { BadRequestError, NotFoundError } from '../../../common/custom-error';
import { LearningAccessService } from '../../../shared/application/learning-access/learning-access.service';

export interface ExerciseUpsertPayload {
  lessonId: string;
  title: string;
  description?: string;
  starterCode?: string;
  language: string;
  testCases?: { input?: string; expectedOutput: string; isHidden?: boolean; points?: number }[];
  timeLimitMs?: number;
}

export type Verdict = 'PASS' | 'PARTIAL' | 'FAIL' | 'ERROR';

export class ExercisesService {
  static async listByLesson(lessonId: string) {
    if (!mongoose.isValidObjectId(lessonId)) throw new BadRequestError('Invalid lesson id.');
    return Exercise.find({ lessonId }).sort({ createdAt: 1 });
  }

  static async getById(id: string) {
    if (!mongoose.isValidObjectId(id)) throw new BadRequestError('Invalid exercise id.');
    const ex = await Exercise.findById(id);
    if (!ex) throw new NotFoundError('Exercise not found.');
    return ex;
  }

  static async create(payload: ExerciseUpsertPayload) {
    if (!mongoose.isValidObjectId(payload.lessonId)) throw new BadRequestError('Invalid lesson id.');
    const cases = (payload.testCases ?? []).map((tc) => ({
      input: tc.input ?? '',
      expectedOutput: tc.expectedOutput ?? '',
      isHidden: !!tc.isHidden,
      points: tc.points ?? 1,
    }));
    return Exercise.create({
      lessonId: payload.lessonId,
      title: payload.title,
      description: payload.description ?? '',
      starterCode: payload.starterCode ?? '',
      language: payload.language.toLowerCase(),
      testCases: cases,
      timeLimitMs: payload.timeLimitMs ?? 5000,
    });
  }

  static async update(id: string, payload: Partial<ExerciseUpsertPayload>) {
    const ex = await ExercisesService.getById(id);
    if (payload.title !== undefined) ex.title = payload.title;
    if (payload.description !== undefined) ex.description = payload.description;
    if (payload.starterCode !== undefined) ex.starterCode = payload.starterCode;
    if (payload.language !== undefined) ex.language = payload.language.toLowerCase();
    if (payload.timeLimitMs !== undefined) ex.timeLimitMs = payload.timeLimitMs;
    if (payload.testCases) {
      ex.testCases = payload.testCases.map((tc) => ({
        input: tc.input ?? '',
        expectedOutput: tc.expectedOutput ?? '',
        isHidden: !!tc.isHidden,
        points: tc.points ?? 1,
      }));
    }
    await ex.save();
    return ex;
  }

  static async remove(id: string) {
    const ex = await ExercisesService.getById(id);
    await ex.deleteOne();
    return { id };
  }

  /**
   * UC66 — submit student code, run against every test case, return verdict.
   * Hidden cases never expose input/expected to the student.
   */
  static async grade(userId: string, exerciseId: string, sourceCode: string) {
    const exercise = await ExercisesService.getById(exerciseId);
    if (!sourceCode?.trim()) throw new BadRequestError('sourceCode is required.');

    await LearningAccessService.assertLessonInteractionAccess(exercise.lessonId.toString(), {
      id: userId,
      role: 'STUDENT',
    });

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

    for (let i = 0; i < exercise.testCases.length; i++) {
      const tc = exercise.testCases[i];
      let result: any;
      let crashed = false;
      try {
        result = await CodeExecutionService.executeCode(userId, {
          sourceCode,
          language: exercise.language,
          stdin: tc.input,
          lessonId: exercise.lessonId.toString(),
          exerciseId: String(exercise._id),
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
        ...(tc.isHidden
          ? {}
          : { input: tc.input, expectedOutput: tc.expectedOutput, actualOutput: actual }),
        points: tc.points || 0,
        runtime: result.runtime,
        stderr: result.stderr || undefined,
      });
    }

    const totalCases = exercise.testCases.length;
    const totalPoints = exercise.totalPoints || totalCases;
    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    let verdict: Verdict;
    if (results.some((r) => r.stderr)) verdict = 'ERROR';
    else if (passedCases === 0) verdict = 'FAIL';
    else if (passedCases === totalCases) verdict = 'PASS';
    else verdict = 'PARTIAL';

    return {
      exerciseId: String(exercise._id),
      verdict,
      passedCases,
      totalCases,
      earnedPoints,
      totalPoints,
      score,
      testResults: results,
    };
  }
}
export default ExercisesService;
