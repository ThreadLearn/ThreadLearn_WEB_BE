import { Injectable } from '@nestjs/common';
import { getAdaptiveSkillDefinition } from './adaptive-learning.config';
import { AdaptivePlanContext, AdaptivePlanDraft } from './adaptive-plan.types';

@Injectable()
export class AdaptivePlanRuleService {
  generate(context: AdaptivePlanContext): AdaptivePlanDraft {
    const skillScores = new Map(context.skills.map((skill) => [skill.skillKey, skill]));
    const prioritizedLessons = [...context.lessons]
      .filter((lesson) => !lesson.isCompleted)
      .sort((left, right) => {
        const scoreGap =
          (skillScores.get(left.skillKey)?.score ?? 100) -
          (skillScores.get(right.skillKey)?.score ?? 100);
        return scoreGap || left.orderIndex - right.orderIndex;
      });
    const lessons = prioritizedLessons.length > 0 ? prioritizedLessons : [...context.lessons];
    const weeklyMinutes = Math.max(60, context.weeklyHours * 60);
    const weeks: AdaptivePlanDraft['weeklyPlan'] = [];

    for (const lesson of lessons) {
      const current = weeks.at(-1);
      const currentMinutes = current
        ? current.lessonIds.reduce(
            (sum, id) => sum + (lessons.find((item) => item.id === id)?.estimatedMinutes ?? 0),
            0
          )
        : 0;
      const shouldStartWeek =
        !current ||
        current.lessonIds.length >= 6 ||
        (currentMinutes > 0 && currentMinutes + lesson.estimatedMinutes > weeklyMinutes);

      if (shouldStartWeek) {
        if (weeks.length >= 8) break;
        const skill = skillScores.get(lesson.skillKey);
        weeks.push({
          week: weeks.length + 1,
          focusSkillKey: lesson.skillKey,
          lessonIds: [lesson.id],
          goal: `Cải thiện ${getAdaptiveSkillDefinition(lesson.skillKey).label}`,
          reason: `Ưu tiên kỹ năng đang ở mức ${skill?.score ?? 0}% mastery.`,
        });
      } else {
        current.lessonIds.push(lesson.id);
      }
    }

    const weakest = [...context.skills].sort((a, b) => a.score - b.score);
    const strengths = [...context.skills]
      .filter((skill) => skill.score >= 70)
      .sort((a, b) => b.score - a.score)
      .map((skill) => `${skill.label}: ${skill.score}% mastery`)
      .slice(0, 4);
    const weaknesses = weakest
      .filter((skill) => skill.score < 70)
      .map((skill) => ({
        skillKey: skill.skillKey,
        reason: `${skill.label} hiện đạt ${skill.score}%, cần được ưu tiên trong lộ trình.`,
      }));
    const nextLesson = lessons[0];

    return {
      summary: `Lộ trình ${weeks.length} tuần được xếp theo kỹ năng yếu nhất, với ${context.weeklyHours} giờ học mỗi tuần.`,
      strengths,
      weaknesses,
      weeklyPlan: weeks,
      nextBestLessonId: nextLesson.id,
      coachMessage:
        context.riskLevel === 'HIGH'
          ? 'Hãy bắt đầu bằng một bài ngắn ở kỹ năng yếu nhất và duy trì nhịp học đều mỗi tuần.'
          : 'Bạn đang đi đúng hướng; hãy hoàn thành bài được ưu tiên trước khi chuyển sang kỹ năng tiếp theo.',
    };
  }
}
