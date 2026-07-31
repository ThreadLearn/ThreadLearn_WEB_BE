import { QuizBankService } from './quiz-bank.service';

describe('QuizBankService import validation', () => {
  const service = new QuizBankService();

  it('reports invalid difficulty and duplicate options before an import is published', () => {
    const item = (service as any).validateItem({
      row: 2,
      questionText: 'What is a closure?',
      options: ['A function', 'A function'],
      correctAnswer: 'A',
      difficultyInput: 'advanced',
      tags: [],
    });

    expect(item.errors).toEqual(expect.arrayContaining([
      'Option text must not be duplicated.',
      'difficulty must be easy, medium, or hard.',
    ]));
  });
});
