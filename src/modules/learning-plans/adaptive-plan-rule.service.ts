import { Injectable } from '@nestjs/common';
import { getAdaptiveSkillDefinition } from './adaptive-learning.config';
import { AdaptivePlanContext, AdaptivePlanDraft } from './adaptive-plan.types';

@Injectable()
export class AdaptivePlanRuleService {
  generate(context: AdaptivePlanContext): AdaptivePlanDraft {
    const skillScores = new Map(context.skills.map((skill) => [skill.skillKey, skill]));
    // Goal policy has already selected the correct scope. This layer preserves
    // instructor-authored order and only decides pacing and weekly grouping.
    const lessons = [...context.lessons].sort((left, right) => left.orderIndex - right.orderIndex);
    const weeklyMinutes = Math.max(60, context.weeklyHours * 60);
    const weeks: AdaptivePlanDraft['weeklyPlan'] = [];

    for (const lesson of lessons) {
      const current = weeks.at(-1);
      const currentMinutes = current
        ? current.lessonIds.reduce(
            (sum, id) => sum + (lessons.find((item) => item.id === id)?.estimatedMinutes ?? 0),
            0,
          )
        : 0;
      const shouldStartWeek =
        !current ||
        current.lessonIds.length >= 6 ||
        (currentMinutes > 0 && currentMinutes + lesson.estimatedMinutes > weeklyMinutes);

      if (shouldStartWeek) {
        if (weeks.length >= 24) break;
        const skill = skillScores.get(lesson.skillKey);
        weeks.push({
          week: weeks.length + 1,
          focusSkillKey: lesson.skillKey,
          lessonIds: [lesson.id],
          goal: `Cải thiện ${getAdaptiveSkillDefinition(lesson.skillKey).label}`,
          reason: lesson.isCompleted
            ? `Ôn lại kỹ năng đang ở mức ${skill?.score ?? 0}% mastery trước khi học tiếp.`
            : `Học theo đúng thứ tự chương trình; kỹ năng hiện ở mức ${skill?.score ?? 0}% mastery.`,
        });
      } else {
        current.lessonIds.push(lesson.id);
      }
    }

    const weakest = [...context.skills].sort((left, right) => left.score - right.score);
    const strengths = [...context.skills]
      .filter((skill) => skill.score >= 70)
      .sort((left, right) => right.score - left.score)
      .map((skill) => `${skill.label}: ${skill.score}% mastery`)
      .slice(0, 4);
    const weaknesses = weakest
      .filter((skill) => skill.score < 70)
      .map((skill) => ({
        skillKey: skill.skillKey,
        reason: `${skill.label} hiện đạt ${skill.score}%, cần được củng cố trong lộ trình.`,
      }));
    const scopeSummary =
      context.scope === 'FULL_COURSE'
        ? `bao phủ toàn bộ ${context.totalRemainingLessons} bài còn lại`
        : `tập trung vào ${context.selectedRemainingLessons}/${context.totalRemainingLessons} bài còn lại`;

    return {
      summary: `Lộ trình ${weeks.length} tuần ${scopeSummary}, với ${context.weeklyHours} giờ học mỗi tuần và giữ nguyên thứ tự chương trình.`,
      strengths,
      weaknesses,
      weeklyPlan: weeks,
      nextBestLessonId: lessons[0].id,
      coachMessage:
        context.riskLevel === 'HIGH'
          ? 'Hãy học từng bước theo thứ tự và hoàn thành phần ôn tập trước khi chuyển sang bài mới.'
          : 'Bạn đang đi đúng hướng; hãy hoàn thành từng tuần theo thứ tự chương trình.',
    };
  }
}
