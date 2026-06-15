// src/modules/quiz/schemas/quiz.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { QuizStatus } from '../enums/quiz-status.enum';
import { QUIZ_DEFAULTS, QUIZ_LIMITS } from '../constants/quiz.constant';

export type QuizDocument = HydratedDocument<Quiz>;

// ─── Question Sub-Schema ───────────────────────────────────────
@Schema({ _id: true })
export class Question {
  @Prop({ required: true, trim: true })
  questionText!: string;

  @Prop({
    type: [String],
    required: true,
    validate: [
      {
        validator: (v: string[]) =>
          Array.isArray(v) &&
          v.length >= QUIZ_LIMITS.OPTIONS_MIN &&
          v.length <= QUIZ_LIMITS.OPTIONS_MAX,
        message: `options must contain between ${QUIZ_LIMITS.OPTIONS_MIN} and ${QUIZ_LIMITS.OPTIONS_MAX} items.`,
      },
    ],
  })
  options!: string[];

  @Prop({ required: true, min: QUIZ_LIMITS.CORRECT_ANSWER_INDEX_MIN })
  correctAnswerIndex!: number;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);

// Defense-in-depth: correctAnswerIndex < options.length
QuestionSchema.pre('validate', function (next) {
  const doc = this as unknown as Question;
  if (doc.options && doc.correctAnswerIndex >= doc.options.length) {
    return next(new Error('correctAnswerIndex must be less than options length.'));
  }
  next();
});

// ─── Quiz Schema ───────────────────────────────────────────────
@Schema({ timestamps: true })
export class Quiz {
  @Prop({
    type: Types.ObjectId,
    ref: 'Lesson',
    required: true,
    index: true,
    unique: true,
  })
  lessonId!: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: QUIZ_LIMITS.TITLE_MAX })
  title!: string;

  @Prop()
  description?: string;

  @Prop({
    default: QUIZ_DEFAULTS.PASSING_SCORE_PERCENT,
    min: QUIZ_LIMITS.PASSING_SCORE_MIN,
    max: QUIZ_LIMITS.PASSING_SCORE_MAX,
  })
  passingScorePercent!: number;

  @Prop()
  timeLimitSeconds?: number;

  @Prop({ default: QUIZ_DEFAULTS.XP_REWARD, min: QUIZ_LIMITS.XP_REWARD_MIN })
  xpReward!: number;

  @Prop({
    type: [QuestionSchema],
    required: true,
    validate: [
      {
        validator: (v: unknown[]) =>
          Array.isArray(v) && v.length >= QUIZ_LIMITS.QUESTIONS_MIN,
        message: `Quiz must have at least ${QUIZ_LIMITS.QUESTIONS_MIN} question.`,
      },
    ],
  })
  questions!: Question[];

  @Prop({ type: String, enum: QuizStatus, default: QuizStatus.DRAFT, index: true })
  status!: QuizStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy!: Types.ObjectId;

  @Prop({ default: false, index: true })
  isDeleted!: boolean;
}

export const QuizSchema = SchemaFactory.createForClass(Quiz);
