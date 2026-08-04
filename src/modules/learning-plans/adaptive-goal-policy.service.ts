import { Injectable } from '@nestjs/common';
import { AdaptiveSkillKey } from './adaptive-learning.config';
import {
  AdaptiveLessonCandidate,
  AdaptivePlanContext,
  AdaptivePlanScope,
} from './adaptive-plan.types';
import { AdaptiveLearningGoal } from './models/adaptive-learning-profile.model';

type SkillEvidence = AdaptivePlanContext['skills'][number];

export interface AdaptiveGoalSelection {
  scope: AdaptivePlanScope;
  lessons: AdaptiveLessonCandidate[];
  requiredLessonIds: string[];
  selectedRemainingLessons: number;
  totalRemainingLessons: number;
}

const GOAL_SKILLS: Record<Exclude<AdaptiveLearningGoal, 'COMPLETE_COURSE'>, AdaptiveSkillKey[]> = {
  INTERVIEW_PREP: ['RUNTIME_EVENT_LOOP', 'ASYNC_PRIMITIVES', 'RACE_SAFE_PATTERNS'],
  BUILD_PROJECT: ['ASYNC_PRIMITIVES', 'RACE_SAFE_PATTERNS', 'JOB_QUEUE_CAPSTONE'],
};

@Injectable()
export class AdaptiveGoalPolicyService {
  select(
    goal: AdaptiveLearningGoal,
    lessons: AdaptiveLessonCandidate[],
    skills: SkillEvidence[],
  ): AdaptiveGoalSelection {
    const curriculum = [...lessons].sort((left, right) => left.orderIndex - right.orderIndex);
    const remaining = curriculum.filter((lesson) => !lesson.isCompleted);
    const scoreBySkill = new Map(skills.map((skill) => [skill.skillKey, skill.score]));

    if (goal === 'COMPLETE_COURSE') {
      return this.buildSelection('FULL_COURSE', curriculum, remaining, remaining, scoreBySkill);
    }

    const allowedSkills = new Set<AdaptiveSkillKey>(GOAL_SKILLS[goal]);
    if (goal === 'BUILD_PROJECT' && (scoreBySkill.get('RUNTIME_EVENT_LOOP') ?? 0) < 40) {
      allowedSkills.add('RUNTIME_EVENT_LOOP');
    }

    const selectedRemaining = [...allowedSkills].flatMap((skillKey) => {
      const skillLessons = remaining.filter((lesson) => lesson.skillKey === skillKey);
      const score = scoreBySkill.get(skillKey) ?? 0;
      if (score < 40) return skillLessons;
      if (score < 70) return skillLessons.slice(-2);
      return skillLessons.slice(-1);
    });
    const selectedIds = new Set(selectedRemaining.map((lesson) => lesson.id));
    const required = curriculum.filter((lesson) => selectedIds.has(lesson.id));

    return this.buildSelection('FOCUSED', curriculum, remaining, required, scoreBySkill, allowedSkills);
  }

  private buildSelection(
    scope: AdaptivePlanScope,
    curriculum: AdaptiveLessonCandidate[],
    allRemaining: AdaptiveLessonCandidate[],
    required: AdaptiveLessonCandidate[],
    scoreBySkill: Map<AdaptiveSkillKey, number>,
    allowedSkills?: Set<AdaptiveSkillKey>,
  ): AdaptiveGoalSelection {
    const reviewIds = new Set<string>();
    for (const skillKey of new Set(curriculum.map((lesson) => lesson.skillKey))) {
      if (allowedSkills && !allowedSkills.has(skillKey)) continue;
      if ((scoreBySkill.get(skillKey) ?? 0) >= 40) continue;
      const latestCompleted = curriculum
        .filter((lesson) => lesson.skillKey === skillKey && lesson.isCompleted)
        .at(-1);
      if (latestCompleted) reviewIds.add(latestCompleted.id);
    }

    const requiredIds = new Set(required.map((lesson) => lesson.id));
    let planLessons = curriculum.filter(
      (lesson) => requiredIds.has(lesson.id) || reviewIds.has(lesson.id),
    );
    if (planLessons.length === 0 && curriculum.length > 0) {
      const fallbackLessons = allowedSkills
        ? curriculum.filter((lesson) => allowedSkills.has(lesson.skillKey))
        : curriculum;
      planLessons = [fallbackLessons.at(-1) ?? curriculum.at(-1)!];
    }

    return {
      scope,
      lessons: planLessons,
      requiredLessonIds: required.map((lesson) => lesson.id),
      selectedRemainingLessons: required.length,
      totalRemainingLessons: allRemaining.length,
    };
  }
}
