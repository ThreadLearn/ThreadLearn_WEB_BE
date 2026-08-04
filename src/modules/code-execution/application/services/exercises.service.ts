import { Inject, Injectable } from '@nestjs/common';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ServiceUnavailableError,
} from '../../../../common/custom-error';
import { ILearningAccess, LEARNING_ACCESS } from '../../../../shared/domain/interfaces/learning-access.port';
import { ExerciseEntity, ExerciseProps, ExerciseTestCase } from '../../domain/entities/exercise.entity';
import { EXERCISE_REPOSITORY, IExerciseRepository } from '../../domain/interfaces/exercise.repository';
import { MongoSubmissionRepository } from '../../infrastructure/persistence/mongo-submission.repository';
import { AssignmentRunPayload, AssignmentSubmitPayload, ExerciseUpsertPayload, ExerciseUpdatePayload } from '../dto/exercise.dto';
import { CodeExecutionService, ExecutionResult } from './code-execution.service';
import { RequestRecommendationService } from '../../../ai/application/services/request-recommendation.service';
import type { UserRole } from '../../../auth/domain/value-objects/user-role.vo';
import { InstructorResourceAccessService } from '../../../course/application/services/instructor-resource-access.service';

export type Verdict = 'PASS' | 'PARTIAL' | 'FAIL' | 'ERROR';
type ExerciseViewer = { id: string; role: UserRole };
type TestResult = {
  index: number;
  passed: boolean;
  isHidden: boolean;
  input?: string;
  expectedOutput?: string;
  actualOutput?: string;
  runtime?: string;
  memory?: number;
  error?: string;
};

const normalizeOutput = (value: string) => value.replace(/\r\n/g, '\n').split('\n').map((line) => line.replace(/[ \t]+$/g, '')).join('\n').replace(/\n+$/g, '');
const asNumber = (value: string | undefined) => Number.parseFloat(value ?? '0') || 0;

const fingerprint = (code: string) => new Set(
  code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/#.*/gm, '')
    .toLowerCase()
    .match(/[a-z_][a-z0-9_]*|\d+|[^\s]/g) ?? [],
);

const jaccard = (left: Set<string>, right: Set<string>) => {
  const union = new Set([...left, ...right]);
  if (!union.size) return 0;
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  return intersection / union.size;
};

@Injectable()
export class ExercisesService {
  constructor(
    @Inject(EXERCISE_REPOSITORY) private readonly exercises: IExerciseRepository,
    @Inject(LEARNING_ACCESS) private readonly learningAccess: ILearningAccess,
    private readonly codeExecution: CodeExecutionService,
    private readonly submissions: MongoSubmissionRepository,
    private readonly ai?: RequestRecommendationService,
    private readonly resourceAccess?: InstructorResourceAccessService,
  ) {}

  async listByLesson(user: ExerciseViewer, lessonId: string) {
    if (user.role === 'ADMIN') return (await this.exercises.listByLesson(lessonId)).map((exercise) => this.presentExercise(exercise.toProps(), true));
    if (user.role === 'INSTRUCTOR') {
      await this.resourceAccess?.assertCanReadLessonResource(user, lessonId);
      return (await this.exercises.listByLesson(lessonId)).map((exercise) => this.presentExercise(exercise.toProps(), true));
    }
    await this.learningAccess.assertLessonViewAccess(lessonId, user);
    return (await this.exercises.listByLesson(lessonId))
      .map((exercise) => exercise.toProps())
      .filter((exercise) => exercise.status === 'PUBLISHED')
      .map((exercise) => this.presentExercise(exercise, false));
  }

  async listAllForManagement(user: ExerciseViewer) {
    const all = await this.exercises.listAll();
    if (user.role === 'ADMIN') return all.map((exercise) => this.presentExercise(exercise.toProps(), true));

    const lessonIds = new Set(await this.resourceAccess?.listManagedLessonIds(user) ?? []);
    return all
      .filter((exercise) => lessonIds.has(exercise.toProps().lessonId))
      .map((exercise) => this.presentExercise(exercise.toProps(), true));
  }

  async getById(user: ExerciseViewer, id: string) {
    const props = await this.getProps(id);
    if (user.role === 'INSTRUCTOR') {
      await this.resourceAccess?.assertCanReadLessonResource(user, props.lessonId);
      return this.presentExercise(props, true);
    }
    if (user.role !== 'ADMIN') {
      await this.learningAccess.assertLessonViewAccess(props.lessonId, user);
      if (props.status !== 'PUBLISHED') throw new NotFoundError('Exercise not found.');
    }
    return this.presentExercise(props, user.role === 'ADMIN');
  }

  async create(user: ExerciseViewer | string, payload: ExerciseUpsertPayload) {
    // An exercise must always belong to an existing, non-deleted lesson. The
    // admin selector is a convenience only; this server-side check remains the
    // authoritative protection against stale or crafted lesson ids.
    if (typeof user === 'string') {
      await this.learningAccess.assertLessonViewAccess(payload.lessonId, { id: user, role: 'ADMIN' });
    } else {
      await this.resourceAccess?.assertCanMutateLessonResource(user, payload.lessonId);
    }
    this.assertPublishable(payload);
    const entity = ExerciseEntity.createNew({ ...payload, createdBy: typeof user === 'string' ? user : user.id });
    return this.exercises.create(entity);
  }

  async update(user: ExerciseViewer, id: string, payload: ExerciseUpdatePayload) {
    const exercise = await this.exercises.findById(id);
    if (!exercise) throw new NotFoundError('Exercise not found.');
    await this.resourceAccess?.assertCanMutateLessonResource(user, exercise.toProps().lessonId);
    const next = { ...exercise.toProps(), ...payload } as ExerciseProps;
    this.assertPublishable(next);
    exercise.applyPatch(payload);
    return this.exercises.update(exercise);
  }

  async remove(user: ExerciseViewer, id: string) {
    const exercise = await this.exercises.findById(id);
    if (!exercise) throw new NotFoundError('Exercise not found.');
    await this.resourceAccess?.assertCanMutateLessonResource(user, exercise.toProps().lessonId);
    await this.exercises.remove(id);
    return { id };
  }

  async runPublic(user: ExerciseViewer, exerciseId: string, payload: AssignmentRunPayload) {
    const { props } = await this.assertLearnerAccess(user, exerciseId, false);
    this.assertLanguage(props, payload.language);
    const publicCases = props.testCases.filter((testCase) => !testCase.isHidden);
    const results = await this.runCases(props, payload.sourceCode, publicCases, false);
    return this.presentRun(props.id, results, false);
  }

  async submit(user: ExerciseViewer, exerciseId: string, payload: AssignmentSubmitPayload) {
    if (user.role !== 'STUDENT') throw new ForbiddenError('Only students can submit assignments.');
    const { props, courseId } = await this.assertLearnerAccess(user, exerciseId, true);
    this.assertLanguage(props, payload.language);
    const idempotent = await this.submissions.findIdempotent(user.id, props.id, payload.idempotencyKey);
    if (idempotent) return this.presentSubmission(idempotent, false);

    const attemptNumber = await this.submissions.reserveAttempt(user.id, props.id, props.maxSubmissions);
    if (attemptNumber === null) throw new ConflictError('Submission limit reached.', 'SUBMISSION_LIMIT_REACHED');

    let submission: any;
    try {
      submission = await this.submissions.create({
        exerciseId: props.id,
        lessonId: props.lessonId,
        courseId,
        userId: user.id,
        attemptNumber,
        sourceCode: payload.sourceCode,
        language: props.language,
        testCasesPassed: 0,
        totalTestCases: props.testCases.length,
        score: 0,
        submissionStatus: 'JUDGING',
        aiStatus: 'PENDING',
        testResults: [],
        idempotencyKey: payload.idempotencyKey,
        countsTowardLimit: true,
        submittedAt: new Date(),
      });
    } catch (error: any) {
      await this.submissions.releaseAttempt(user.id, props.id);
      if (error?.code === 11000 && payload.idempotencyKey) {
        const existing = await this.submissions.findIdempotent(user.id, props.id, payload.idempotencyKey);
        if (existing) return this.presentSubmission(existing, false);
      }
      throw error;
    }

    try {
      const results = await this.runCases(props, payload.sourceCode, props.testCases, true);
      const summary = this.presentRun(props.id, results, true);
      const fallbackFeedback = this.buildFeedback(payload.sourceCode, results, summary.verdict);
      let similarityResult: Record<string, unknown> | undefined;
      try {
        similarityResult = await this.findSimilarity(props, user.id, payload.sourceCode);
      } catch {
        // Similarity is advisory only and must not block a valid grade.
      }
      // Grade is durable before any optional AI request. An unavailable model
      // must never turn a correct judge result into a failed submission.
      let updated = await this.submissions.update(String(submission._id), {
        ...summary,
        executionTime: summary.executionTime,
        memoryUsage: summary.memoryUsage,
        submissionStatus: 'GRADED',
        aiStatus: this.ai ? 'PENDING' : 'SKIPPED',
        aiFeedback: this.ai ? undefined : fallbackFeedback,
        similarityResult,
        completedAt: new Date(),
      });
      if (this.ai) {
        try {
          const aiFeedback = await this.ai.analyzeAssignment(user.id, payload.sourceCode, props.language);
          updated = await this.submissions.update(String(submission._id), { aiStatus: 'COMPLETED', aiFeedback });
        } catch {
          updated = await this.submissions.update(String(submission._id), { aiStatus: 'FAILED', aiFeedback: fallbackFeedback });
        }
      }
      return this.presentSubmission(updated, false);
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        const updated = await this.submissions.update(String(submission._id), {
          submissionStatus: 'SYSTEM_ERROR', aiStatus: 'SKIPPED', countsTowardLimit: false,
          completedAt: new Date(),
        });
        await this.submissions.releaseAttempt(user.id, props.id);
        return this.presentSubmission(updated, false);
      }
      throw error;
    }
  }

  async listMine(user: ExerciseViewer, exerciseId: string, page: number, limit: number) {
    await this.assertLearnerAccess(user, exerciseId, false);
    const result = await this.submissions.listForStudent(user.id, exerciseId, page, limit);
    return this.presentPage(result, false, page, limit);
  }

  async getMine(user: ExerciseViewer, submissionId: string) {
    const submission = await this.submissions.findForStudent(user.id, submissionId);
    if (!submission) throw new NotFoundError('Submission not found.');
    return this.presentSubmission(submission, false);
  }

  async listForManagement(user: ExerciseViewer, exerciseId: string, page: number, limit: number) {
    const props = await this.getProps(exerciseId);
    await this.resourceAccess?.assertCanReadLessonResource(user, props.lessonId);
    return this.presentPage(await this.submissions.listForAdmin(exerciseId, page, limit), true, page, limit);
  }

  private async getProps(id: string): Promise<ExerciseProps> {
    const exercise = await this.exercises.findById(id);
    if (!exercise) throw new NotFoundError('Exercise not found.');
    return exercise.toProps();
  }

  private async assertLearnerAccess(user: ExerciseViewer, exerciseId: string, interaction: boolean) {
    const props = await this.getProps(exerciseId);
    let courseId: string | undefined;
    if (user.role !== 'ADMIN') {
      if (props.status !== 'PUBLISHED') throw new NotFoundError('Exercise not found.');
      if (interaction && props.deadline && new Date() >= new Date(props.deadline)) {
        throw new ConflictError('Assignment deadline has passed.', 'ASSIGNMENT_DEADLINE_PASSED');
      }
      const lesson = await (interaction
        ? this.learningAccess.assertLessonInteractionAccess(props.lessonId, user)
        : this.learningAccess.assertLessonViewAccess(props.lessonId, user));
      courseId = lesson.courseId;
    }
    return { props, courseId };
  }

  private assertPublishable(exercise: Pick<ExerciseProps, 'status' | 'testCases'> | Partial<ExerciseProps>) {
    if (exercise.status === 'PUBLISHED' && (!exercise.testCases || exercise.testCases.length === 0)) {
      throw new BadRequestError('A published assignment requires at least one test case.');
    }
  }

  private assertLanguage(props: ExerciseProps, language?: string) {
    if (language && language.toLowerCase() !== props.language.toLowerCase()) {
      throw new BadRequestError('Assignment language does not match.', null);
    }
  }

  private async runCases(props: ExerciseProps, sourceCode: string, testCases: ExerciseTestCase[], includeHidden: boolean) {
    const results: TestResult[] = new Array(testCases.length);
    let cursor = 0;
    const worker = async () => {
      while (cursor < testCases.length) {
        const index = cursor++;
        const testCase = testCases[index];
        const execution = await this.codeExecution.executeAssignmentCase({
          sourceCode,
          language: props.language,
          stdin: testCase.input,
          timeLimitMs: props.timeLimitMs,
          memoryLimitKb: props.memoryLimitKb,
        });
        results[index] = this.toTestResult(index, testCase, execution, includeHidden);
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, testCases.length) }, worker));
    return results;
  }

  private toTestResult(index: number, testCase: ExerciseTestCase, execution: ExecutionResult, includeHidden: boolean): TestResult {
    const actual = normalizeOutput(execution.stdout ?? '');
    const expected = normalizeOutput(testCase.expectedOutput ?? '');
    const error = execution.stderr || execution.compileOutput || (execution.status?.id !== 3 ? execution.status?.description : '');
    const hidden = Boolean(testCase.isHidden);
    return {
      index,
      passed: !error && actual === expected,
      isHidden: hidden,
      ...(!hidden || !includeHidden ? { input: testCase.input, expectedOutput: testCase.expectedOutput, actualOutput: actual, error: error || undefined } : {}),
      runtime: execution.time,
      memory: execution.memory,
    };
  }

  private presentRun(exerciseId: string, results: TestResult[], includeHidden: boolean) {
    const passedCases = results.filter((result) => result.passed).length;
    const totalCases = results.length;
    const score = totalCases ? Math.round((passedCases / totalCases) * 100) : 0;
    const hasExecutionError = results.some((result) => Boolean(result.error));
    const verdict: Verdict = hasExecutionError ? 'ERROR' : passedCases === totalCases ? 'PASS' : passedCases === 0 ? 'FAIL' : 'PARTIAL';
    const executionTime = Math.max(0, ...results.map((result) => asNumber(result.runtime))).toFixed(3);
    const memoryUsage = Math.max(0, ...results.map((result) => result.memory ?? 0));
    return {
      exerciseId,
      verdict,
      testCasesPassed: passedCases,
      totalTestCases: totalCases,
      score,
      executionTime,
      memoryUsage,
      testResults: results.map((result) => includeHidden && result.isHidden ? {
        index: result.index, passed: result.passed, isHidden: true, runtime: result.runtime, memory: result.memory,
      } : result),
    };
  }

  private presentExercise(props: ExerciseProps, admin: boolean) {
    const testCases = props.testCases.map((testCase, index) => admin ? testCase : testCase.isHidden
      ? { id: testCase.id, index, isHidden: true }
      : { id: testCase.id, index, input: testCase.input, expectedOutput: testCase.expectedOutput, isHidden: false });
    return {
      ...props,
      testCases,
      totalTestCases: props.testCases.length,
      publicTestCases: props.testCases.filter((testCase) => !testCase.isHidden).length,
      hiddenTestCases: admin ? props.testCases.filter((testCase) => testCase.isHidden).length : undefined,
    };
  }

  private presentSubmission(submission: any, admin: boolean) {
    const raw = submission?.toObject ? submission.toObject() : submission;
    const result = { ...raw, _id: String(raw._id), exerciseId: String(raw.exerciseId), lessonId: String(raw.lessonId), userId: raw.userId?._id ? raw.userId : String(raw.userId) } as any;
    if (!admin) {
      result.testResults = (raw.testResults ?? []).map((test: TestResult) => test.isHidden
        ? { index: test.index, passed: test.passed, isHidden: true, runtime: test.runtime, memory: test.memory }
        : test);
      delete result.similarityResult;
    }
    return result;
  }

  private presentPage(result: { items: any[]; total: number }, admin: boolean, page: number, limit: number) {
    return {
      items: result.items.map((item) => this.presentSubmission(item, admin)),
      meta: { page, limit, total: result.total, totalPages: Math.max(1, Math.ceil(result.total / limit)), hasMore: page * limit < result.total },
    };
  }

  private buildFeedback(sourceCode: string, results: TestResult[], verdict: Verdict) {
    const lower = sourceCode.toLowerCase();
    const nestedLoops = (sourceCode.match(/\b(for|while)\b/g) ?? []).length >= 2;
    return {
      summary: verdict === 'PASS' ? 'All official test cases passed.' : 'Review failing public cases and validate edge conditions.',
      suggestions: results.some((result) => result.error)
        ? ['Fix the compile/runtime error before optimizing.', 'Use the public test output to reproduce the failure.']
        : ['Check empty input, boundary values, and output formatting.'],
      timeComplexity: nestedLoops ? 'Likely O(n²) or higher; verify whether nested loops are necessary.' : 'Complexity estimate requires review of input constraints.',
      memoryComplexity: /\b(array|list|map|set|dict)\b/.test(lower) ? 'Uses auxiliary collections; memory grows with input in common cases.' : 'Likely O(1) auxiliary memory, subject to language runtime.',
    };
  }

  private async findSimilarity(props: ExerciseProps, userId: string, sourceCode: string) {
    const own = fingerprint(sourceCode.replace(props.starterCode ?? '', ''));
    if (own.size < 8) return undefined;
    const candidates = await this.submissions.candidatesForSimilarity(props.id, userId);
    let best: { id: string; score: number } | undefined;
    for (const candidate of candidates as any[]) {
      const score = jaccard(own, fingerprint(String(candidate.sourceCode ?? '').replace(props.starterCode ?? '', '')));
      if (score >= 0.85 && (!best || score > best.score)) best = { id: String(candidate._id), score };
    }
    return best ? { matchedSubmissionId: best.id, similarityScore: Number(best.score.toFixed(3)), checkedAt: new Date() } : undefined;
  }
}
