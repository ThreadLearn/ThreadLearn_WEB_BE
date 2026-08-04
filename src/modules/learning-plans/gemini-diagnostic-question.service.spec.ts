import { GoogleGenAI } from '@google/genai';
import { GeminiDiagnosticQuestionService } from './gemini-diagnostic-question.service';
import { AdaptiveSkillKey } from './adaptive-learning.config';

jest.mock('@google/genai', () => ({ GoogleGenAI: jest.fn() }));
jest.mock('../../configs/env', () => ({
  env: {
    GEMINI_API_KEY: 'test-key',
    GEMINI_MODEL: 'test-model',
    GEMINI_TIMEOUT_MS: 1000,
  },
}));

const coverage: AdaptiveSkillKey[] = [
  'RUNTIME_EVENT_LOOP',
  'RUNTIME_EVENT_LOOP',
  'RUNTIME_EVENT_LOOP',
  'ASYNC_PRIMITIVES',
  'ASYNC_PRIMITIVES',
  'ASYNC_PRIMITIVES',
  'ASYNC_PRIMITIVES',
  'RACE_SAFE_PATTERNS',
  'RACE_SAFE_PATTERNS',
  'JOB_QUEUE_CAPSTONE',
];

const makeQuestions = (skills = coverage) =>
  skills.map((skillKey, index) => ({
    skillKey,
    questionText: `Câu hỏi chẩn đoán JavaScript số ${index + 1} có kết quả nào đúng?`,
    options: [`Đáp án A ${index}`, `Đáp án B ${index}`, `Đáp án C ${index}`, `Đáp án D ${index}`],
    correctAnswerIndex: index % 4,
  }));

describe('GeminiDiagnosticQuestionService', () => {
  const generateContent = jest.fn();
  const service = new GeminiDiagnosticQuestionService();
  const context = {
    courseTitle: 'JavaScript Concurrency',
    skills: [],
    variationSeed: 'attempt-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (GoogleGenAI as jest.Mock).mockImplementation(() => ({
      models: { generateContent },
    }));
  });

  it('accepts exactly ten unique, balanced questions', async () => {
    generateContent.mockResolvedValue({ text: JSON.stringify({ questions: makeQuestions() }) });

    await expect(service.generate(context)).resolves.toHaveLength(10);
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'test-model' }),
    );
  });

  it('rejects a set with the wrong skill coverage so the caller can fall back', async () => {
    generateContent.mockResolvedValue({
      text: JSON.stringify({ questions: makeQuestions(Array(10).fill('ASYNC_PRIMITIVES')) }),
    });

    await expect(service.generate(context)).rejects.toThrow('unbalanced skill coverage');
  });
});
