import { Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { env } from '../../configs/env';
import { BadRequestError, NotFoundError } from '../../common/custom-error';
import { Course } from '../courses/models/course.model';
import { Enrollment } from '../enrollments/models/enrollment.model';
import { Lesson } from '../lessons/models/lesson.model';
import {
  AdaptiveSkillKey,
  getAdaptiveLessonSkill,
  getAdaptiveSkillDefinition,
} from './adaptive-learning.config';
import { AdaptiveGoalPolicyService } from './adaptive-goal-policy.service';
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
    private readonly rules: AdaptivePlanRuleService,
    private readonly goalPolicy: AdaptiveGoalPolicyService,
  ) {}

  async generate(userId: string, courseSlug: string) {
    const { profile, lessons, selection } = await this.loadContext(userId, courseSlug);
    const context: AdaptivePlanContext = {
      goal: profile.goal,
      scope: selection.scope,
      weeklyHours: profile.weeklyHours,
      progressPercent: profile.progressPercent,
      overallMastery: profile.overallMastery,
      riskLevel: profile.riskLevel,
      riskSignals: profile.riskSignals,
      requiredLessonIds: selection.requiredLessonIds,
      selectedRemainingLessons: selection.selectedRemainingLessons,
      totalRemainingLessons: selection.totalRemainingLessons,
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
      this.validateDraft(draft, context);
    } catch (error) {
      generatedBy = 'RULE_ENGINE';
      fallbackReason = this.safeFallbackReason(error);
      this.logger.warn(`Adaptive plan used rule fallback: ${fallbackReason}`);
      draft = this.rules.generate(context);
      this.validateDraft(draft, context);
    }

    const currentPlanVersion = profile.planVersion ?? 0;
    const snapshot = this.buildSnapshot(
      draft,
      context,
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
    return this.serializeSnapshot(updated.latestPlan!, profile.goal);
  }

  async getLatest(userId: string, courseSlug: string) {
    const profile = await this.findProfile(userId, courseSlug);
    if (!profile.latestPlan) return null;
    const completedIds = await this.loadCompletedLessonIds(userId, profile.courseId);
    return this.serializeSnapshot(profile.latestPlan, profile.goal, completedIds);
  }

  async getHistory(userId: string, courseSlug: string) {
    const profile = await this.findProfile(userId, courseSlug);
    const completedIds = await this.loadCompletedLessonIds(userId, profile.courseId);
    return [...(profile.planVersions ?? [])]
      .reverse()
      .map((plan) => this.serializeSnapshot(plan, profile.goal, completedIds));
  }

  private async loadCompletedLessonIds(userId: string, courseId: unknown) {
    const enrollment = await Enrollment.findOne({ userId, courseId }).select('completedLessons');
    return new Set((enrollment?.completedLessons ?? []).map(String));
  }

  private async loadContext(userId: string, courseSlug: string) {
    const profile = await this.findProfile(userId, courseSlug);
    const [lessonDocs, enrollment] = await Promise.all([
      Lesson.find({
        courseId: profile.courseId,
        status: { $in: ['active', 'locked'] },
      })
        .select('_id slug title estimatedTime orderIndex')
        .sort({ orderIndex: 1, _id: 1 }),
      Enrollment.findOne({ userId, courseId: profile.courseId }).select('completedLessons'),
    ]);
    const completedIds = new Set((enrollment?.completedLessons ?? []).map(String));
    let inheritedSkill: AdaptiveSkillKey = 'RUNTIME_EVENT_LOOP';
    const allLessons: AdaptiveLessonCandidate[] = lessonDocs.map((lesson, curriculumIndex) => {
      const mappedSkill = getAdaptiveLessonSkill(lesson.slug);
      if (mappedSkill) inheritedSkill = mappedSkill;
      return {
        id: String(lesson._id),
        slug: lesson.slug ?? String(lesson._id),
        title: lesson.title,
        estimatedMinutes: lesson.estimatedTime > 0 ? lesson.estimatedTime : 30,
        orderIndex: curriculumIndex,
        skillKey: mappedSkill ?? inheritedSkill,
        isCompleted: completedIds.has(String(lesson._id)),
      };
    });
    if (allLessons.length === 0) throw new NotFoundError('No adaptive lessons are available.');
    const selection = this.goalPolicy.select(
      profile.goal,
      allLessons,
      profile.skillScores.map((skill) => ({
        skillKey: skill.skillKey,
        label: skill.label,
        score: skill.score,
        confidence: skill.confidence,
      })),
    );
    return { profile, lessons: selection.lessons, selection };
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
    context: AdaptivePlanContext,
  ) {
    const { lessons, weeklyHours } = context;
    const allowedIds = new Set(lessons.map((lesson) => lesson.id));
    const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
    const curriculumPosition = new Map(lessons.map((lesson, index) => [lesson.id, index]));
    const usedIds = new Set<string>();
    let previousPosition = -1;
    for (const [index, week] of draft.weeklyPlan.entries()) {
      if (week.week !== index + 1) throw new Error('Plan weeks must be sequential.');
      let estimatedMinutes = 0;
      let containsFocusSkill = false;
      for (const lessonId of week.lessonIds) {
        if (!allowedIds.has(lessonId)) throw new Error('Plan contains an unknown lesson ID.');
        if (usedIds.has(lessonId)) throw new Error('Plan contains a duplicate lesson.');
        const lesson = lessonById.get(lessonId)!;
        const position = curriculumPosition.get(lessonId)!;
        if (position <= previousPosition) {
          throw new Error('Plan changes the curriculum lesson order.');
        }
        previousPosition = position;
        estimatedMinutes += lesson.estimatedMinutes;
        containsFocusSkill ||= lesson.skillKey === week.focusSkillKey;
        usedIds.add(lessonId);
      }
      if (!containsFocusSkill) throw new Error('Plan focus skill does not match its lessons.');
      if (week.lessonIds.length > 1 && estimatedMinutes > weeklyHours * 60) {
        throw new Error('Plan exceeds the learner weekly time budget.');
      }
    }
    for (const requiredLessonId of context.requiredLessonIds) {
      if (!usedIds.has(requiredLessonId)) {
        throw new Error('Plan omits a lesson required by the selected learning goal.');
      }
    }
    if (!allowedIds.has(draft.nextBestLessonId)) {
      throw new Error('Next best lesson ID is unknown.');
    }
    if (!usedIds.has(draft.nextBestLessonId)) {
      throw new Error('Next best lesson is not included in the plan.');
    }
  }

  private buildSnapshot(
    draft: AdaptivePlanDraft,
    context: AdaptivePlanContext,
    version: number,
    diagnosticVersion: number,
    generatedBy: AdaptivePlanSource,
    fallbackReason?: string
  ): IAdaptivePlanSnapshot {
    const { lessons } = context;
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
      goal: context.goal,
      scope: context.scope,
      coverage: {
        selectedLessons: context.selectedRemainingLessons,
        totalRemainingLessons: context.totalRemainingLessons,
        percentage:
          context.totalRemainingLessons === 0
            ? 100
            : Math.round(
                (context.selectedRemainingLessons / context.totalRemainingLessons) * 100,
              ),
      },
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

  private serializeSnapshot(
    plan: IAdaptivePlanSnapshot,
    fallbackGoal: IAdaptivePlanSnapshot['goal'],
    completedIds?: ReadonlySet<string>,
  ) {
    const selectedLessons = new Set(
      plan.weeklyPlan.flatMap((week) => week.lessons.filter((lesson) => !lesson.isReview).map((lesson) => String(lesson.lessonId))),
    ).size;
    const goal = plan.goal ?? fallbackGoal;
    return {
      version: plan.version,
      diagnosticVersion: plan.diagnosticVersion,
      goal,
      scope: plan.scope ?? (goal === 'COMPLETE_COURSE' ? 'FULL_COURSE' : 'FOCUSED'),
      coverage: plan.coverage ?? {
        selectedLessons,
        totalRemainingLessons: selectedLessons,
        percentage: 100,
      },
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
          isCompleted: completedIds
            ? lesson.isReview || completedIds.has(String(lesson.lessonId))
            : lesson.isReview,
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
