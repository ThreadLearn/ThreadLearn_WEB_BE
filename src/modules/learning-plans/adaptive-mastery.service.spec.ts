import { AdaptiveMasteryService } from './adaptive-mastery.service';

describe('AdaptiveMasteryService', () => {
  const service = new AdaptiveMasteryService();

  it('calculates weighted overall mastery from diagnostic evidence', () => {
    const result = service.evaluate(
      [
        { skillKey: 'RUNTIME_EVENT_LOOP', correctAnswers: 2, totalQuestions: 3 },
        { skillKey: 'ASYNC_PRIMITIVES', correctAnswers: 4, totalQuestions: 5 },
        { skillKey: 'RACE_SAFE_PATTERNS', correctAnswers: 1, totalQuestions: 2 },
        { skillKey: 'JOB_QUEUE_CAPSTONE', correctAnswers: 1, totalQuestions: 1 },
      ],
      50,
    );

    expect(result.overallMastery).toBe(73);
    expect(result.skills.find((skill) => skill.skillKey === 'ASYNC_PRIMITIVES')).toMatchObject({
      score: 80,
      confidence: 100,
    });
    expect(result.riskLevel).toBe('LOW');
  });

  it('flags a learner whose course progress is ahead of demonstrated mastery', () => {
    const result = service.evaluate(
      [
        { skillKey: 'RUNTIME_EVENT_LOOP', correctAnswers: 1, totalQuestions: 3 },
        { skillKey: 'ASYNC_PRIMITIVES', correctAnswers: 2, totalQuestions: 5 },
        { skillKey: 'RACE_SAFE_PATTERNS', correctAnswers: 0, totalQuestions: 2 },
        { skillKey: 'JOB_QUEUE_CAPSTONE', correctAnswers: 0, totalQuestions: 1 },
      ],
      70,
    );

    expect(result.overallMastery).toBe(27);
    expect(result.riskLevel).toBe('HIGH');
    expect(result.riskSignals).toEqual(
      expect.arrayContaining([
        expect.stringContaining('below the 50%'),
        expect.stringContaining('ahead of demonstrated mastery'),
      ]),
    );
  });

  it('keeps missing evidence explicit instead of inventing mastery', () => {
    const result = service.evaluate([], 0);

    expect(result.overallMastery).toBe(0);
    expect(result.confidence).toBe(0);
    expect(result.skills).toHaveLength(4);
    expect(result.skills.every((skill) => skill.totalQuestions === 0)).toBe(true);
    expect(result.riskLevel).toBe('HIGH');
  });
});
