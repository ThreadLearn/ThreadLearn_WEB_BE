import { ExercisesService } from './exercises.service';
import { ServiceUnavailableError } from '../../../../common/custom-error';

const ids = {
  exercise: '507f1f77bcf86cd799439011',
  lesson: '507f1f77bcf86cd799439012',
  student: '507f1f77bcf86cd799439013',
};

const exerciseProps = () => ({
  id: ids.exercise,
  lessonId: ids.lesson,
  title: 'Sum numbers',
  description: 'Return the sum.',
  starterCode: '',
  language: 'javascript' as const,
  testCases: [
    { input: '1 2', expectedOutput: '3', isHidden: false, points: 1 },
    { input: '4 5', expectedOutput: '9', isHidden: true, points: 1 },
  ],
  totalPoints: 2,
  timeLimitMs: 1000,
  memoryLimitKb: 65536,
  status: 'PUBLISHED' as const,
  deadline: null,
  maxSubmissions: 2,
});

describe('ExercisesService', () => {
  const access = {
    assertLessonViewAccess: jest.fn().mockResolvedValue({ courseId: '507f1f77bcf86cd799439014' }),
    assertLessonInteractionAccess: jest.fn().mockResolvedValue({ courseId: '507f1f77bcf86cd799439014' }),
  };
  const repository = { findById: jest.fn(), listByLesson: jest.fn(), listAll: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn() };
  const execution = { executeAssignmentCase: jest.fn() };
  const submissions = { findIdempotent: jest.fn(), reserveAttempt: jest.fn(), releaseAttempt: jest.fn(), create: jest.fn(), update: jest.fn(), findForStudent: jest.fn(), listForStudent: jest.fn(), listForAdmin: jest.fn(), candidatesForSimilarity: jest.fn() };
  const service = new ExercisesService(repository as any, access as any, execution as any, submissions as any, undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findById.mockResolvedValue({ toProps: exerciseProps });
    execution.executeAssignmentCase.mockResolvedValue({ stdout: '3\n', stderr: '', compileOutput: '', status: { id: 3, description: 'Accepted' }, time: '0.02', memory: 1024 });
  });

  it('runs only public cases and returns their full diagnostics', async () => {
    const result = await service.runPublic({ id: ids.student, role: 'STUDENT' }, ids.exercise, { sourceCode: 'console.log(3)' });

    expect(execution.executeAssignmentCase).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ testCasesPassed: 1, totalTestCases: 1, score: 100, verdict: 'PASS' });
    expect(result.testResults[0]).toMatchObject({ input: '1 2', expectedOutput: '3', actualOutput: '3' });
  });

  it('redacts hidden test input and expected output in student exercise views', async () => {
    const result: any = await service.getById({ id: ids.student, role: 'STUDENT' }, ids.exercise);

    expect(result.testCases).toEqual(expect.arrayContaining([expect.objectContaining({ isHidden: true })]));
    expect(result.testCases.find((test: any) => test.isHidden)).not.toHaveProperty('input');
    expect(result.testCases.find((test: any) => test.isHidden)).not.toHaveProperty('expectedOutput');
  });

  it('persists a submission with hidden case diagnostics redacted for the student', async () => {
    submissions.findIdempotent.mockResolvedValue(null);
    submissions.reserveAttempt.mockResolvedValue(1);
    const created = { _id: '507f1f77bcf86cd799439015', exerciseId: ids.exercise, lessonId: ids.lesson, userId: ids.student, attemptNumber: 1, sourceCode: 'console.log(3)', language: 'javascript', testCasesPassed: 0, totalTestCases: 2, score: 0, submissionStatus: 'JUDGING', aiStatus: 'PENDING', testResults: [], countsTowardLimit: true, submittedAt: new Date() };
    submissions.create.mockResolvedValue(created);
    execution.executeAssignmentCase
      .mockResolvedValueOnce({ stdout: '3', stderr: '', compileOutput: '', status: { id: 3, description: 'Accepted' }, time: '0.01', memory: 512 })
      .mockResolvedValueOnce({ stdout: '9', stderr: '', compileOutput: '', status: { id: 3, description: 'Accepted' }, time: '0.02', memory: 1024 });
    submissions.candidatesForSimilarity.mockResolvedValue([]);
    submissions.update.mockImplementation(async (_id: string, patch: Record<string, unknown>) => ({ ...created, ...patch }));

    const result: any = await service.submit({ id: ids.student, role: 'STUDENT' }, ids.exercise, { sourceCode: 'console.log(3)', idempotencyKey: 'request-key-0001' });

    expect(result).toMatchObject({ submissionStatus: 'GRADED', score: 100, testCasesPassed: 2, totalTestCases: 2 });
    const hidden = result.testResults.find((test: any) => test.isHidden);
    expect(hidden).toEqual(expect.objectContaining({ passed: true, isHidden: true }));
    expect(hidden).not.toHaveProperty('input');
    expect(hidden).not.toHaveProperty('expectedOutput');
    expect(hidden).not.toHaveProperty('actualOutput');
  });

  it('rejects a submission at the server-side deadline before reserving an attempt', async () => {
    repository.findById.mockResolvedValue({ toProps: () => ({ ...exerciseProps(), deadline: new Date(Date.now() - 1) }) });

    await expect(service.submit({ id: ids.student, role: 'STUDENT' }, ids.exercise, { sourceCode: 'console.log(3)' }))
      .rejects.toMatchObject({ code: 'ASSIGNMENT_DEADLINE_PASSED' });
    expect(submissions.reserveAttempt).not.toHaveBeenCalled();
  });

  it('does not consume an attempt when Judge0 is unavailable', async () => {
    submissions.findIdempotent.mockResolvedValue(null);
    submissions.reserveAttempt.mockResolvedValue(1);
    const created = { _id: '507f1f77bcf86cd799439015', exerciseId: ids.exercise, lessonId: ids.lesson, userId: ids.student, attemptNumber: 1, sourceCode: 'console.log(3)', language: 'javascript', testCasesPassed: 0, totalTestCases: 2, score: 0, submissionStatus: 'JUDGING', aiStatus: 'PENDING', testResults: [], countsTowardLimit: true, submittedAt: new Date() };
    submissions.create.mockResolvedValue(created);
    submissions.update.mockImplementation(async (_id: string, patch: Record<string, unknown>) => ({ ...created, ...patch }));
    execution.executeAssignmentCase.mockRejectedValue(new ServiceUnavailableError('Judge unavailable', 'JUDGE0_UNAVAILABLE'));

    const result: any = await service.submit({ id: ids.student, role: 'STUDENT' }, ids.exercise, { sourceCode: 'console.log(3)' });

    expect(result).toMatchObject({ submissionStatus: 'SYSTEM_ERROR', countsTowardLimit: false });
    expect(submissions.releaseAttempt).toHaveBeenCalledWith(ids.student, ids.exercise);
  });
});
