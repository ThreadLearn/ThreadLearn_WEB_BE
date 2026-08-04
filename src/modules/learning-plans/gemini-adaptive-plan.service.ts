import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { env } from '../../configs/env';
import {
  ADAPTIVE_PLAN_JSON_SCHEMA,
  AdaptivePlanContext,
  AdaptivePlanDraft,
  adaptivePlanDraftSchema,
} from './adaptive-plan.types';

@Injectable()
export class GeminiAdaptivePlanService {
  async generate(context: AdaptivePlanContext): Promise<AdaptivePlanDraft> {
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
          'You are ThreadLearn adaptive coach. Build a practical Vietnamese study roadmap. ' +
          'The backend has already selected lessons according to the learner goal. Use every ID in ' +
          'requiredLessonIds exactly once, and only use IDs supplied in lessons. Preserve the exact ' +
          'lesson order received; never move a later curriculum lesson before an earlier one. ' +
          'Completed lessons are optional reviews. COMPLETE_COURSE means no remaining lesson may be ' +
          'skipped. Focused goals may cover only the selected subset. Keep each week within the ' +
          'learner weekly time budget and explain how mastery affected review depth and pacing.',
        responseMimeType: 'application/json',
        responseJsonSchema: ADAPTIVE_PLAN_JSON_SCHEMA,
        maxOutputTokens: 2500,
        temperature: 0.2,
      },
    });
    if (!response.text) throw new Error('Gemini returned an empty response.');
    return adaptivePlanDraftSchema.parse(JSON.parse(response.text));
  }
}
