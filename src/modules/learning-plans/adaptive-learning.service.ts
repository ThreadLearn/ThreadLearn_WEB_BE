import { randomInt, randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { env } from '../../configs/env';
import { BadRequestError, NotFoundError } from '../../common/custom-error';
import { Course } from '../courses/models/course.model';
import { Enrollment } from '../enrollments/models/enrollment.model';
import { Lesson } from '../lessons/models/lesson.model';
import { Quiz, IQuestion } from '../quiz/infrastructure/persistence/schemas/quiz.schema';
import { ADAPTIVE_DIAGNOSTIC_QUESTION_COUNT } from './adaptive-diagnostic.types';
import {
  ADAPTIVE_SKILLS,
  DIAGNOSTIC_QUIZ_BLUEPRINT,
  AdaptiveSkillKey,
  getAdaptiveSkillDefinition,
} from './adaptive-learning.config';
import { AdaptiveMasteryService, AdaptiveSkillEvidence } from './adaptive-mastery.service';
import { GeminiDiagnosticQuestionService } from './gemini-diagnostic-question.service';
import { SubmitAdaptiveDiagnosticDto } from './learning-plan.dto';
import { AdaptiveDiagnosticSession } from './models/adaptive-diagnostic-session.model';
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
  private readonly logger = new Logger(AdaptiveLearningService.name);

  constructor(
    private readonly mastery: AdaptiveMasteryService,
    private readonly geminiQuestions: GeminiDiagnosticQuestionService,
  ) {}

  async getDiagnostic(userId: string, courseSlug: string) {
    const course = await this.findCourse(courseSlug);
    const lessonDocs = await Lesson.find({
      courseId: course._id,
      status: { $nin: ['hidden', 'deleted'] },
    }).select('_id slug title');

    let source: 'GEMINI' | 'QUESTION_BANK' = 'GEMINI';
    let modelName: string | undefined = env.GEMINI_MODEL;
    let questions: DiagnosticQuestion[];
    try {
      const generated = await this.geminiQuestions.generate({
        courseTitle: course.title,
        level: course.level,
        language: course.language,
        variationSeed: randomUUID(),
        skills: ADAPTIVE_SKILLS.map((skill) => ({
          key: skill.key,
          label: skill.label,
          description: skill.description,
          lessonTitles: lessonDocs
            .filter((lesson) => lesson.slug && skill.lessonSlugs.includes(lesson.slug))
            .map((lesson) => lesson.title),
        })),
      });
      questions = this.shuffle(
        generated.map((question) => ({ ...question, id: randomUUID() })),
      );
    } catch (error) {
      source = 'QUESTION_BANK';
      modelName = undefined;
      const reason = error instanceof Error ? error.message : 'Unknown Gemini error';
      this.logger.warn(`Adaptive diagnostic used question-bank fallback: ${reason}`);
      questions = await this.buildFallbackQuestions(lessonDocs);
    }

    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const session = await AdaptiveDiagnosticSession.create({
      userId,
      courseId: course._id,
      courseSlug: course.slug,
      source,
      modelName,
      questions,
      expiresAt,
    });

    return {
      assessmentId: String(session._id),
      source,
      modelName,
      expiresAt: expiresAt.toISOString(),
      course: {
        id: String(course._id),
        title: course.title,
        slug: course.slug,
        level: course.level,
        language: course.language,
      },
      skills: ADAPTIVE_SKILLS.map((skill) => getAdaptiveSkillDefinition(skill.key)),
      questionCount: questions.length,
      estimatedMinutes: 12,
      questions: questions.map(({ correctAnswerIndex: _answer, ...question }) => question),
    };
  }

  async submitDiagnostic(userId: string, courseSlug: string, input: SubmitAdaptiveDiagnosticDto) {
    const course = await this.findCourse(courseSlug);
    const session = await AdaptiveDiagnosticSession.findOne({
      _id: input.assessmentId,
      userId,
      courseId: course._id,
      expiresAt: { $gt: new Date() },
      $or: [{ usedAt: { $exists: false } }, { usedAt: null }],
    });
    if (!session) {
      throw new BadRequestError('This diagnostic has expired or was already submitted. Start a new one.');
    }

    const expectedQuestionIds = new Set(session.questions.map((question) => question.id));
    const submittedQuestionIds = Object.keys(input.answers);
    if (
      submittedQuestionIds.length !== expectedQuestionIds.size ||
      submittedQuestionIds.some((id) => !expectedQuestionIds.has(id))
    ) {
      throw new BadRequestError('Answer every diagnostic question exactly once.');
    }

    const evidence = new Map<AdaptiveSkillKey, AdaptiveSkillEvidence>();
    let correctCount = 0;
    for (const question of session.questions) {
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

    const claimed = await AdaptiveDiagnosticSession.findOneAndUpdate(
      {
        _id: session._id,
        $or: [{ usedAt: { $exists: false } }, { usedAt: null }],
      },
      { $set: { usedAt: new Date() } },
      { new: true },
    );
    if (!claimed) throw new BadRequestError('This diagnostic was already submitted.');

    const [enrollment, learningPlan] = await Promise.all([
      Enrollment.findOne({ userId, courseId: course._id }),
      LearningPlan.findOne({ userId }),
    ]);
    const progressPercent = Math.round(enrollment?.progressPercent ?? enrollment?.progress ?? 0);
    const result = this.mastery.evaluate([...evidence.values()], progressPercent);
    const weeklyHours = input.weeklyHours ?? learningPlan?.weeklyHours ?? 3;
    const current = await AdaptiveLearningProfile.findOne({ userId, courseId: course._id }).select(
      'version',
    );

    const profile = await AdaptiveLearningProfile.findOneAndUpdate(
      { userId, courseId: course._id },
      {
        $set: {
          courseSlug: course.slug,
          goal: input.goal,
          weeklyHours,
          progressPercent,
          overallMastery: result.overallMastery,
          confidence: result.confidence,
          riskLevel: result.riskLevel,
          riskSignals: result.riskSignals,
          skillScores: result.skills,
          diagnosticAnswers: input.answers,
          diagnosticQuestionCount: session.questions.length,
          diagnosticCorrectCount: correctCount,
          version: (current?.version ?? 0) + 1,
          assessedAt: new Date(),
        },
        $setOnInsert: { userId, courseId: course._id },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    return this.toProfileResponse(profile, course.title);
  }

  async getMine(userId: string, courseSlug: string) {
    const course = await Course.findOne({ slug: courseSlug, status: 'published' }).select('title slug');
    if (!course) throw new NotFoundError('Adaptive course not found.');
    const profile = await AdaptiveLearningProfile.findOne({ userId, courseId: course._id });
    return profile ? this.toProfileResponse(profile, course.title) : null;
  }

  private async findCourse(courseSlug: string) {
    const course = await Course.findOne({ slug: courseSlug, status: 'published' }).select(
      'title slug level language',
    );
    if (!course) throw new NotFoundError('Adaptive course not found.');
    return course;
  }

  private async buildFallbackQuestions(
    lessons: Array<{ _id: unknown; slug?: string; title: string }>,
  ): Promise<DiagnosticQuestion[]> {
    const supportedSlugs = DIAGNOSTIC_QUIZ_BLUEPRINT.map((item) => item.lessonSlug);
    const sourceLessons = lessons.filter(
      (lesson): lesson is { _id: unknown; slug: string; title: string } =>
        Boolean(lesson.slug && supportedSlugs.includes(lesson.slug as never)),
    );
    const lessonBySlug = new Map(sourceLessons.map((lesson) => [lesson.slug, lesson]));
    const quizzes = await Quiz.find({
      lessonId: { $in: sourceLessons.map((lesson) => lesson._id) },
      isDeleted: false,
    }).lean();
    const quizByLessonId = new Map(quizzes.map((quiz) => [String(quiz.lessonId), quiz]));
    const pool: Omit<DiagnosticQuestion, 'id'>[] = [];

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
        const correctText = question.options[question.correctAnswerIndex];
        const options = this.shuffle([...question.options]);
        pool.push({
          skillKey: blueprint.questionSkills[index],
          questionText: question.questionText,
          options,
          correctAnswerIndex: options.indexOf(correctText),
        });
      });
    }

    const fallbackCoverage: Record<AdaptiveSkillKey, number> = {
      RUNTIME_EVENT_LOOP: 3,
      ASYNC_PRIMITIVES: 4,
      RACE_SAFE_PATTERNS: 2,
      JOB_QUEUE_CAPSTONE: 1,
    };
    const selected = this.shuffle(
      ADAPTIVE_SKILLS.flatMap((skill) =>
        this.shuffle(pool.filter((question) => question.skillKey === skill.key)).slice(
          0,
          fallbackCoverage[skill.key],
        ),
      ),
    );
    if (selected.length !== ADAPTIVE_DIAGNOSTIC_QUESTION_COUNT) {
      throw new NotFoundError('Not enough fallback diagnostic questions are available.');
    }
    return selected.map((question) => ({ ...question, id: randomUUID() }));
  }

  private shuffle<T>(items: T[]): T[] {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const swapIndex = randomInt(index + 1);
      [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
    }
    return items;
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
