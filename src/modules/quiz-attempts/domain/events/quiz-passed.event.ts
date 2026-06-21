export class QuizPassedEvent {
  constructor(
    public readonly userId: string,
    public readonly quizId: string,
    public readonly quizTitle: string,
    public readonly attemptId: string,
    public readonly score: number,
    public readonly xpReward: number,
  ) {}
}
