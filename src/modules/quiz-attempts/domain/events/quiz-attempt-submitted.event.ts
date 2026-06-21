export class QuizAttemptSubmittedEvent {
  constructor(
    public readonly userId: string,
    public readonly quizId: string,
    public readonly attemptId: string,
    public readonly score: number,
    public readonly passed: boolean,
  ) {}
}
