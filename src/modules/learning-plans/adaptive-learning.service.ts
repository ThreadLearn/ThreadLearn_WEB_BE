import { Injectable } from '@nestjs/common';
import { BadRequestError, NotFoundError } from '../../common/custom-error';
import { Course } from '../courses/models/course.model';
import { Enrollment } from '../enrollments/models/enrollment.model';
import { Lesson } from '../lessons/models/lesson.model';
import { Quiz, IQuestion } from '../quiz/infrastructure/persistence/schemas/quiz.schema';
import {
  DIAGNOSTIC_QUIZ_BLUEPRINT,
  AdaptiveSkillKey,
  getAdaptiveSkillDefinition,
} from './adaptive-learning.config';
import { AdaptiveMasteryService, AdaptiveSkillEvidence } from './adaptive-mastery.service';
import { SubmitAdaptiveDiagnosticDto } from './learning-plan.dto';
import { LearningPlan } from './models/learning-plan.model';
import { AdaptiveLearningProfile } from './models/adaptive-learning-profile.model';

interface DiagnosticQuestion {
  id: string;
  skillKey: AdaptiveSkillKey;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
}

@Injectable()
export class AdaptiveLearningService {
  constructor(private readonly mastery: AdaptiveMasteryService) {}

  async getDiagnostic(courseSlug: string) {
    const dataset = await this.loadDiagnosticDataset(courseSlug);
    return {
      course: dataset.course,
      skills: dataset.skillKeys.map((key) => getAdaptiveSkillDefinition(key)),
      questionCount: dataset.questions.length,
      estimatedMinutes: 15,
      questions: dataset.questions.map(({ correctAnswerIndex: _answer, ...question }) => question),
    };
  }

  async submitDiagnostic(userId: string, courseSlug: string, input: SubmitAdaptiveDiagnosticDto) {
    const dataset = await this.loadDiagnosticDataset(courseSlug);
    const expectedQuestionIds = new Set(dataset.questions.map((question) => question.id));
    const submittedQuestionIds = Object.keys(input.answers);

    if (
      submittedQuestionIds.length !== expectedQuestionIds.size ||
      submittedQuestionIds.some((id) => !expectedQuestionIds.has(id))
    ) {
      throw new BadRequestError('Answer every diagnostic question exactly once.');
    }

    const evidence = new Map<AdaptiveSkillKey, AdaptiveSkillEvidence>();
    let correctCount = 0;
    for (const question of dataset.questions) {
      const selectedAnswer = input.answers[question.id];
      if (!Number.isInteger(selectedAnswer) || selectedAnswer < 0 || selectedAnswer >= question.options.length) {
        throw new BadRequestError(`Invalid answer for diagnostic question ${question.id}.`);
      }
      const item = evidence.get(question.skillKey) ?? {
        skillKey: question.skillKey,
        correctAnswers: 0,
        totalQuestions: 0,
      };
      item.totalQuestions += 1;
      if (selectedAnswer === question.correctAnswerIndex) {
        item.correctAnswers += 1;
        correctCount += 1;
      }
      evidence.set(question.skillKey, item);
    }

    const [enrollment, learningPlan] = await Promise.all([
      Enrollment.findOne({ userId, courseId: dataset.course.id }),
      LearningPlan.findOne({ userId }),
    ]);
    const progressPercent = Math.round(enrollment?.progressPercent ?? enrollment?.progress ?? 0);
    const result = this.mastery.evaluate([...evidence.values()], progressPercent);
    const weeklyHours = input.weeklyHours ?? learningPlan?.weeklyHours ?? 3;
    const current = await AdaptiveLearningProfile.findOne({
      userId,
      courseId: dataset.course.id,
    }).select('version');

    const profile = await AdaptiveLearningProfile.findOneAndUpdate(
      { userId, courseId: dataset.course.id },
      {
        $set: {
          courseSlug: dataset.course.slug,
          goal: input.goal,
          weeklyHours,
          progressPercent,
          overallMastery: result.overallMastery,
          confidence: result.confidence,
          riskLevel: result.riskLevel,
          riskSignals: result.riskSignals,
          skillScores: result.skills,
          diagnosticAnswers: input.answers,
          diagnosticQuestionCount: dataset.questions.length,
          diagnosticCorrectCount: correctCount,
          version: (current?.version ?? 0) + 1,
          assessedAt: new Date(),
        },
        $setOnInsert: { userId, courseId: dataset.course.id },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    return this.toProfileResponse(profile, dataset.course.title);
  }

  async getMine(userId: string, courseSlug: string) {
    const course = await Course.findOne({ slug: courseSlug, status: 'published' }).select('title slug');
    if (!course) throw new NotFoundError('Adaptive course not found.');
    const profile = await AdaptiveLearningProfile.findOne({ userId, courseId: course._id });
    return profile ? this.toProfileResponse(profile, course.title) : null;
  }

  private async loadDiagnosticDataset(courseSlug: string) {
    const course = await Course.findOne({ slug: courseSlug, status: 'published' }).select(
      'title slug level language',
    );
    if (!course) throw new NotFoundError('Adaptive course not found.');

    const supportedSlugs = DIAGNOSTIC_QUIZ_BLUEPRINT.map((item) => item.lessonSlug);
    const lessons = await Lesson.find({
      courseId: course._id,
      slug: { $in: supportedSlugs },
      status: { $nin: ['hidden', 'deleted'] },
    }).select('_id slug title');
    const lessonBySlug = new Map(lessons.map((lesson) => [lesson.slug, lesson]));
    const quizzes = await Quiz.find({
      lessonId: { $in: lessons.map((lesson) => lesson._id) },
      isDeleted: false,
    }).lean();
    const quizByLessonId = new Map(quizzes.map((quiz) => [String(quiz.lessonId), quiz]));
    const questions: DiagnosticQuestion[] = [];

    for (const blueprint of DIAGNOSTIC_QUIZ_BLUEPRINT) {
      const lesson = lessonBySlug.get(blueprint.lessonSlug);
      const quiz = lesson ? quizByLessonId.get(String(lesson._id)) : undefined;
      if (!lesson || !quiz) {
        throw new NotFoundError(`Diagnostic source ${blueprint.lessonSlug} is unavailable.`);
      }
      if (quiz.questions.length !== blueprint.questionSkills.length) {
        throw new BadRequestError(
          `Diagnostic source ${blueprint.lessonSlug} no longer matches its skill mapping.`,
        );
      }
      quiz.questions.forEach((question: IQuestion, index: number) => {
        questions.push({
          id: `${blueprint.lessonSlug}:${index}`,
          skillKey: blueprint.questionSkills[index],
          questionText: question.questionText,
          options: question.options,
          correctAnswerIndex: question.correctAnswerIndex,
        });
      });
    }

    return {
      course: {
        id: String(course._id),
        title: course.title,
        slug: course.slug,
        level: course.level,
        language: course.language,
      },
      skillKeys: [...new Set(questions.map((question) => question.skillKey))],
      questions,
    };
  }

  private toProfileResponse(profile: InstanceType<typeof AdaptiveLearningProfile>, courseTitle: string) {
    return {
      id: String(profile._id),
      course: { id: String(profile.courseId), slug: profile.courseSlug, title: courseTitle },
      goal: profile.goal,
      weeklyHours: profile.weeklyHours,
      progressPercent: profile.progressPercent,
      overallMastery: profile.overallMastery,
      confidence: profile.confidence,
      riskLevel: profile.riskLevel,
      riskSignals: profile.riskSignals,
      skillScores: profile.skillScores,
      diagnostic: {
        correctAnswers: profile.diagnosticCorrectCount,
        totalQuestions: profile.diagnosticQuestionCount,
        assessedAt: profile.assessedAt.toISOString(),
      },
      version: profile.version,
      updatedAt: profile.updatedAt.toISOString(),
    };
  }
}
