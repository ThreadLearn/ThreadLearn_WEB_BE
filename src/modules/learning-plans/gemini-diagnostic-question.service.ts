import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { env } from '../../configs/env';
import {
  ADAPTIVE_DIAGNOSTIC_JSON_SCHEMA,
  GeneratedDiagnosticQuestion,
  generatedDiagnosticSchema,
} from './adaptive-diagnostic.types';
import { AdaptiveSkillDefinition } from './adaptive-learning.config';

export interface GeminiDiagnosticContext {
  courseTitle: string;
  level?: string;
  language?: string;
  skills: Array<
    Pick<AdaptiveSkillDefinition, 'key' | 'label' | 'description'> & { lessonTitles: string[] }
  >;
  variationSeed: string;
}

@Injectable()
export class GeminiDiagnosticQuestionService {
  async generate(context: GeminiDiagnosticContext): Promise<GeneratedDiagnosticQuestion[]> {
    if (!env.GEMINI_API_KEY) throw new Error('Gemini API key is not configured.');

    const client = new GoogleGenAI({
      apiKey: env.GEMINI_API_KEY,
      httpOptions: { timeout: env.GEMINI_TIMEOUT_MS },
    });
    const response = await client.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: JSON.stringify(context),
      config: {
        systemInstruction:
          'You create a fresh JavaScript diagnostic for ThreadLearn. Return exactly 10 ' +
          'Vietnamese multiple-choice questions with four plausible options and exactly one ' +
          'correct answer. Preserve English technical terms where clearer. Cover exactly: 3 ' +
          'RUNTIME_EVENT_LOOP, 4 ASYNC_PRIMITIVES, 2 RACE_SAFE_PATTERNS, and 1 ' +
          'JOB_QUEUE_CAPSTONE question. Test understanding and code reasoning, not trivia. ' +
          'Do not repeat a question or option. The variationSeed must influence the examples ' +
          'so a retake receives a materially different set.',
        responseMimeType: 'application/json',
        responseJsonSchema: ADAPTIVE_DIAGNOSTIC_JSON_SCHEMA,
        maxOutputTokens: 4500,
        temperature: 0.85,
      },
    });
    if (!response.text) throw new Error('Gemini returned an empty diagnostic.');

    const questions = generatedDiagnosticSchema.parse(JSON.parse(response.text)).questions;
    this.validateQuestions(questions);
    return questions;
  }

  private validateQuestions(questions: GeneratedDiagnosticQuestion[]) {
    const expectedCoverage: Record<GeneratedDiagnosticQuestion['skillKey'], number> = {
      RUNTIME_EVENT_LOOP: 3,
      ASYNC_PRIMITIVES: 4,
      RACE_SAFE_PATTERNS: 2,
      JOB_QUEUE_CAPSTONE: 1,
    };
    const actualCoverage = Object.fromEntries(
      Object.keys(expectedCoverage).map((skill) => [skill, 0]),
    ) as Record<GeneratedDiagnosticQuestion['skillKey'], number>;
    const questionTexts = new Set<string>();

    for (const question of questions) {
      actualCoverage[question.skillKey] += 1;
      const normalizedQuestion = question.questionText.trim().toLocaleLowerCase('vi');
      if (questionTexts.has(normalizedQuestion)) throw new Error('Gemini repeated a question.');
      questionTexts.add(normalizedQuestion);

      const uniqueOptions = new Set(
        question.options.map((option) => option.trim().toLocaleLowerCase('vi')),
      );
      if (uniqueOptions.size !== question.options.length) {
        throw new Error('Gemini repeated an answer option.');
      }
    }

    for (const [skill, count] of Object.entries(expectedCoverage)) {
      if (actualCoverage[skill as GeneratedDiagnosticQuestion['skillKey']] !== count) {
        throw new Error('Gemini returned unbalanced skill coverage.');
      }
    }
  }
}
