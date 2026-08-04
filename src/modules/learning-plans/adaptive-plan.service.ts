import { Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { env } from '../../configs/env';
import { BadRequestError, NotFoundError } from '../../common/custom-error';
import { Course } from '../courses/models/course.model';
import { Enrollment } from '../enrollments/models/enrollment.model';
import { Lesson } from '../lessons/models/lesson.model';
import {
  ADAPTIVE_SKILLS,
  AdaptiveSkillKey,
  getAdaptiveSkillDefinition,
} from './adaptive-learning.config';
import { AdaptivePlanRuleService } from './adaptive-plan-rule.service';
import {
  AdaptiveLessonCandidate,
  AdaptivePlanContext,
  AdaptivePlanDraft,
} from './adaptive-plan.types';
import { GeminiAdaptivePlanService } from './gemini-adaptive-plan.service';
import {
  AdaptiveLearningProfile,
  AdaptivePlanSource,
  IAdaptivePlanSnapshot,
} from './models/adaptive-learning-profile.model';

@Injectable()
export class AdaptivePlanService {
  private readonly logger = new Logger(AdaptivePlanService.name);

  constructor(
    private readonly gemini: GeminiAdaptivePlanService,
    private readonly rules: AdaptivePlanRuleService
  ) {}

  async generate(userId: string, courseSlug: string) {
    const { profile, lessons } = await this.loadContext(userId, courseSlug);
    const context: AdaptivePlanContext = {
      goal: profile.goal,
      weeklyHours: profile.weeklyHours,
      progressPercent: profile.progressPercent,
      overallMastery: profile.overallMastery,
      riskLevel: profile.riskLevel,
      riskSignals: profile.riskSignals,
      skills: profile.skillScores.map((skill) => ({
        skillKey: skill.skillKey,
        label: skill.label,
        score: skill.score,
        confidence: skill.confidence,
      })),
      lessons,
    };

    let draft: AdaptivePlanDraft;
    let generatedBy: AdaptivePlanSource = 'GEMINI';
    let fallbackReason: string | undefined;
    try {
      draft = await this.gemini.generate(context);
      this.validateDraft(draft, lessons, context.weeklyHours);
    } catch (error) {
      generatedBy = 'RULE_ENGINE';
      fallbackReason = this.safeFallbackReason(error);
      this.logger.warn(`Adaptive plan used rule fallback: ${fallbackReason}`);
      draft = this.rules.generate(context);
      this.validateDraft(draft, lessons, context.weeklyHours);
    }

    const currentPlanVersion = profile.planVersion ?? 0;
    const snapshot = this.buildSnapshot(
      draft,
      lessons,
      currentPlanVersion + 1,
      profile.version,
      generatedBy,
      fallbackReason
    );
    const versionFilter =
      currentPlanVersion === 0
        ? { _id: profile._id, $or: [{ planVersion: 0 }, { planVersion: { $exists: false } }] }
        : { _id: profile._id, planVersion: currentPlanVersion };
    const updated = await AdaptiveLearningProfile.findOneAndUpdate(
      versionFilter,
      {
        $set: { latestPlan: snapshot },
        $inc: { planVersion: 1 },
        $push: { planVersions: { $each: [snapshot], $slice: -10 } },
      },
      { new: true }
    );
    if (!updated) {
      throw new BadRequestError('Learning plan changed concurrently. Please generate it again.');
    }
    return this.serializeSnapshot(updated.latestPlan!);
  }

  async getLatest(userId: string, courseSlug: string) {
    const profile = await this.findProfile(userId, courseSlug);
    return profile.latestPlan ? this.serializeSnapshot(profile.latestPlan) : null;
  }

  async getHistory(userId: string, courseSlug: string) {
    const profile = await this.findProfile(userId, courseSlug);
    return [...(profile.planVersions ?? [])].reverse().map((plan) => this.serializeSnapshot(plan));
  }

  private async loadContext(userId: string, courseSlug: string) {
    const profile = await this.findProfile(userId, courseSlug);
    const lessonSlugs = ADAPTIVE_SKILLS.flatMap((skill) => skill.lessonSlugs);
    const [lessonDocs, enrollment] = await Promise.all([
      Lesson.find({
        courseId: profile.courseId,
        slug: { $in: lessonSlugs },
        status: { $in: ['active', 'locked'] },
      })
        .select('_id slug title estimatedTime orderIndex')
        .sort({ orderIndex: 1 }),
      Enrollment.findOne({ userId, courseId: profile.courseId }).select('completedLessons'),
    ]);
    const completedIds = new Set((enrollment?.completedLessons ?? []).map(String));
    const skillBySlug = new Map<string, AdaptiveSkillKey>(
      ADAPTIVE_SKILLS.flatMap((skill) =>
        skill.lessonSlugs.map((slug) => [slug, skill.key] as [string, AdaptiveSkillKey])
      )
    );
    const lessons: AdaptiveLessonCandidate[] = lessonDocs.flatMap((lesson) => {
      if (!lesson.slug) return [];
      const skillKey = skillBySlug.get(lesson.slug);
      if (!skillKey) return [];
      return [
        {
          id: String(lesson._id),
          slug: lesson.slug,
          title: lesson.title,
          estimatedMinutes: lesson.estimatedTime > 0 ? lesson.estimatedTime : 30,
          orderIndex: lesson.orderIndex,
          skillKey,
          isCompleted: completedIds.has(String(lesson._id)),
        },
      ];
    });
    if (lessons.length === 0) throw new NotFoundError('No adaptive lessons are available.');
    return { profile, lessons };
  }

  private async findProfile(userId: string, courseSlug: string) {
    const course = await Course.findOne({ slug: courseSlug, status: 'published' }).select('_id');
    if (!course) throw new NotFoundError('Adaptive course not found.');
    const profile = await AdaptiveLearningProfile.findOne({ userId, courseId: course._id });
    if (!profile) {
      throw new BadRequestError('Complete the adaptive diagnostic before generating a plan.');
    }
    return profile;
  }

  private validateDraft(
    draft: AdaptivePlanDraft,
    lessons: AdaptiveLessonCandidate[],
    weeklyHours: number
  ) {
    const allowedIds = new Set(lessons.map((lesson) => lesson.id));
    const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
    const usedIds = new Set<string>();
    for (const [index, week] of draft.weeklyPlan.entries()) {
      if (week.week !== index + 1) throw new Error('Plan weeks must be sequential.');
      let estimatedMinutes = 0;
      let containsFocusSkill = false;
      for (const lessonId of week.lessonIds) {
        if (!allowedIds.has(lessonId)) throw new Error('Plan contains an unknown lesson ID.');
        if (usedIds.has(lessonId)) throw new Error('Plan contains a duplicate lesson.');
        const lesson = lessonById.get(lessonId)!;
        estimatedMinutes += lesson.estimatedMinutes;
        containsFocusSkill ||= lesson.skillKey === week.focusSkillKey;
        usedIds.add(lessonId);
      }
      if (!containsFocusSkill) throw new Error('Plan focus skill does not match its lessons.');
      if (week.lessonIds.length > 1 && estimatedMinutes > weeklyHours * 60) {
        throw new Error('Plan exceeds the learner weekly time budget.');
      }
    }
    if (!allowedIds.has(draft.nextBestLessonId)) {
      throw new Error('Next best lesson ID is unknown.');
    }
  }

  private buildSnapshot(
    draft: AdaptivePlanDraft,
    lessons: AdaptiveLessonCandidate[],
    version: number,
    diagnosticVersion: number,
    generatedBy: AdaptivePlanSource,
    fallbackReason?: string
  ): IAdaptivePlanSnapshot {
    const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
    const weeklyPlan = draft.weeklyPlan.map((week) => {
      const selected = week.lessonIds.map((id) => lessonById.get(id)!);
      return {
        week: week.week,
        focusSkillKey: week.focusSkillKey,
        focusLabel: getAdaptiveSkillDefinition(week.focusSkillKey).label,
        lessons: selected.map((lesson) => ({
          lessonId: new Types.ObjectId(lesson.id),
          slug: lesson.slug,
          title: lesson.title,
          estimatedMinutes: lesson.estimatedMinutes,
          isReview: lesson.isCompleted,
        })),
        goal: week.goal,
        reason: week.reason,
        estimatedMinutes: selected.reduce((total, lesson) => total + lesson.estimatedMinutes, 0),
      };
    });

    return {
      version,
      diagnosticVersion,
      generatedBy,
      modelName: generatedBy === 'GEMINI' ? env.GEMINI_MODEL : undefined,
      fallbackReason,
      summary: draft.summary,
      strengths: draft.strengths,
      weaknesses: draft.weaknesses,
      weeklyPlan,
      nextBestLessonId: new Types.ObjectId(draft.nextBestLessonId),
      coachMessage: draft.coachMessage,
      generatedAt: new Date(),
    };
  }

  private serializeSnapshot(plan: IAdaptivePlanSnapshot) {
    return {
      version: plan.version,
      diagnosticVersion: plan.diagnosticVersion,
      generatedBy: plan.generatedBy,
      modelName: plan.modelName,
      fallbackReason: plan.fallbackReason,
      summary: plan.summary,
      strengths: [...plan.strengths],
      weaknesses: plan.weaknesses.map((weakness) => ({
        skillKey: weakness.skillKey,
        reason: weakness.reason,
      })),
      nextBestLessonId: String(plan.nextBestLessonId),
      coachMessage: plan.coachMessage,
      weeklyPlan: plan.weeklyPlan.map((week) => ({
        week: week.week,
        focusSkillKey: week.focusSkillKey,
        focusLabel: week.focusLabel,
        goal: week.goal,
        reason: week.reason,
        estimatedMinutes: week.estimatedMinutes,
        lessons: week.lessons.map((lesson) => ({
          lessonId: String(lesson.lessonId),
          slug: lesson.slug,
          title: lesson.title,
          estimatedMinutes: lesson.estimatedMinutes,
          isReview: lesson.isReview,
        })),
      })),
      generatedAt: plan.generatedAt.toISOString(),
    };
  }

  private safeFallbackReason(error: unknown) {
    if (!(error instanceof Error)) return 'AI generation failed.';
    if (error.message.includes('API key')) return 'Gemini API key is not configured.';
    if (error.message.includes('lesson')) return 'Gemini returned an invalid lesson selection.';
    return 'Gemini was unavailable or returned an invalid response.';
  }
}
