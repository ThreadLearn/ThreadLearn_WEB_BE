import { Injectable } from '@nestjs/common';
import {
  ADAPTIVE_SKILLS,
  AdaptiveSkillKey,
  getAdaptiveSkillDefinition,
} from './adaptive-learning.config';

export interface AdaptiveSkillEvidence {
  skillKey: AdaptiveSkillKey;
  correctAnswers: number;
  totalQuestions: number;
}

export interface AdaptiveSkillScore extends AdaptiveSkillEvidence {
  label: string;
  score: number;
  confidence: number;
}

export type AdaptiveRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface AdaptiveMasteryResult {
  skills: AdaptiveSkillScore[];
  overallMastery: number;
  confidence: number;
  riskLevel: AdaptiveRiskLevel;
  riskSignals: string[];
}

@Injectable()
export class AdaptiveMasteryService {
  evaluate(evidence: AdaptiveSkillEvidence[], progressPercent: number): AdaptiveMasteryResult {
    const bySkill = new Map(evidence.map((item) => [item.skillKey, item]));
    const skills = ADAPTIVE_SKILLS.map((definition) => {
      const item = bySkill.get(definition.key) ?? {
        skillKey: definition.key,
        correctAnswers: 0,
        totalQuestions: 0,
      };
      return this.scoreSkill(item);
    });

    const totalQuestions = skills.reduce((sum, item) => sum + item.totalQuestions, 0);
    const totalCorrect = skills.reduce((sum, item) => sum + item.correctAnswers, 0);
    const overallMastery = totalQuestions
      ? Math.round((totalCorrect / totalQuestions) * 100)
      : 0;
    const confidence = totalQuestions
      ? Math.round(
          skills.reduce((sum, item) => sum + item.confidence * item.totalQuestions, 0) /
            totalQuestions,
        )
      : 0;
    const { riskLevel, riskSignals } = this.assessRisk(
      skills,
      overallMastery,
      progressPercent,
    );

    return { skills, overallMastery, confidence, riskLevel, riskSignals };
  }

  private scoreSkill(evidence: AdaptiveSkillEvidence): AdaptiveSkillScore {
    const definition = getAdaptiveSkillDefinition(evidence.skillKey);
    const score = evidence.totalQuestions
      ? Math.round((evidence.correctAnswers / evidence.totalQuestions) * 100)
      : 0;
    return {
      ...evidence,
      label: definition.label,
      score,
      // Confidence represents evidence coverage, not certainty that the learner
      // will perform identically in a future assessment.
      confidence: Math.min(100, evidence.totalQuestions * 20),
    };
  }

  private assessRisk(
    skills: AdaptiveSkillScore[],
    overallMastery: number,
    progressPercent: number,
  ): { riskLevel: AdaptiveRiskLevel; riskSignals: string[] } {
    const riskSignals: string[] = [];
    const criticalSkills = skills.filter((skill) => skill.score < 40);
    const learningGap = Math.round(progressPercent - overallMastery);

    if (overallMastery < 50) {
      riskSignals.push(`Overall mastery is ${overallMastery}%, below the 50% foundation threshold.`);
    }
    if (criticalSkills.length) {
      riskSignals.push(
        `Critical gaps detected in ${criticalSkills.map((skill) => skill.label).join(', ')}.`,
      );
    }
    if (learningGap >= 25) {
      riskSignals.push(
        `Course progress is ${learningGap} points ahead of demonstrated mastery.`,
      );
    }

    const riskLevel: AdaptiveRiskLevel =
      overallMastery < 50 || criticalSkills.length >= 2 || learningGap >= 25
        ? 'HIGH'
        : overallMastery < 70 || criticalSkills.length > 0
          ? 'MEDIUM'
          : 'LOW';

    if (!riskSignals.length && riskLevel === 'MEDIUM') {
      riskSignals.push('Mastery is still below the 70% readiness threshold.');
    }

    return { riskLevel, riskSignals };
  }
}
