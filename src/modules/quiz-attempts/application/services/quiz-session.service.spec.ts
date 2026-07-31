import { QuizSessionService } from './quiz-session.service';

describe('QuizSessionService answer validation', () => {
  const service = Object.create(QuizSessionService.prototype) as QuizSessionService;
  const session = {
    questions: [
      { sourceQuestionId: 'question-1', options: [{ text: 'A' }, { text: 'B' }] },
      { sourceQuestionId: 'question-2', options: [{ text: 'A' }, { text: 'B' }] },
    ],
  };

  it('requires every answer for a manual submission', () => {
    expect(() => (service as any).assertAnswers(session, { 'question-1': 0 }, true))
      .toThrow('All quiz questions must be answered before submitting.');
  });

  it('allows a partial snapshot only for a server timeout submission', () => {
    expect(() => (service as any).assertAnswers(session, { 'question-1': 0 }, false)).not.toThrow();
  });
});
