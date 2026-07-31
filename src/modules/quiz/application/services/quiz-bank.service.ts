import { Injectable } from '@nestjs/common';
import crypto from 'crypto';
import path from 'path';
import mammoth from 'mammoth';
import mongoose from 'mongoose';
import * as XLSX from 'xlsx';
import { BadRequestError, NotFoundError } from '../../../../common/custom-error';
import { env } from '../../../../configs/env';
import { Lesson } from '../../../lessons/models/lesson.model';
import { Quiz as QuizModel } from '../../infrastructure/persistence/schemas/quiz.schema';
import {
  IImportedQuestion,
  QuizBankImport,
} from '../../infrastructure/persistence/schemas/quiz-bank-import.schema';
import {
  QuestionDifficulty,
  QuizBankQuestion,
  QuizQuestionBank,
} from '../../infrastructure/persistence/schemas/quiz-question-bank.schema';

type RawQuestion = Omit<IImportedQuestion, 'errors'>;

export interface CreateImportInput {
  quizId?: string;
  lessonId?: string;
  title?: string;
  questionCount?: number;
  userId: string;
  file: Express.Multer.File;
}

export interface QuizBankActor {
  id: string;
  role?: string;
}

export interface QuestionBankQuestionInput {
  questionText: string;
  options: Array<{ optionId: string; text: string }>;
  correctOptionId: string;
  explanation?: string;
  difficulty?: QuestionDifficulty;
  tags?: string[];
}

/**
 * Import theo hai bước: parse → preview → commit. File gốc không được lưu public vì có đáp án.
 */
@Injectable()
export class QuizBankService {
  async createImport(input: CreateImportInput) {
    this.assertFile(input.file);
    if (input.questionCount !== undefined && (!Number.isInteger(input.questionCount) || input.questionCount < 5 || input.questionCount > 10)) {
      throw new BadRequestError('questionCount must be an integer between 5 and 10.');
    }
    const quiz = await this.resolveQuiz(input);
    const extension = path.extname(input.file.originalname).toLowerCase().slice(1) as 'xlsx' | 'docx';
    const rawItems = extension === 'xlsx'
      ? this.parseXlsx(input.file.buffer)
      : await this.parseDocx(input.file.buffer);
    if (rawItems.length > 1000) {
      throw new BadRequestError('A quiz library can contain at most 1,000 questions per import.');
    }
    const items = await this.validateAndAnnotateItems(String(quiz._id), rawItems);

    const validCount = items.filter((item) => item.errors.length === 0).length;
    const importJob = await QuizBankImport.create({
      quizId: quiz._id,
      lessonId: quiz.lessonId,
      createdBy: input.userId,
      fileName: input.file.originalname,
      fileType: extension,
      status: 'needs_review',
      questionCount: input.questionCount ?? 5,
      validCount,
      invalidCount: items.length - validCount,
      duplicateCount: this.countDuplicateItems(items),
      items,
    });
    return {
      ...this.toImportResponse(importJob, items.slice(0, 50)),
      meta: { page: 1, limit: 50, total: items.length, totalPages: Math.ceil(items.length / 50) },
    };
  }

  async getImport(importId: string, actor: QuizBankActor, page = 1, limit = 50) {
    if (!mongoose.isValidObjectId(importId)) throw new NotFoundError('Quiz import not found.');
    const importJob = await QuizBankImport.findById(importId).exec();
    if (!importJob) throw new NotFoundError('Quiz import not found.');
    this.assertImportAccess(importJob, actor);
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, Math.min(100, limit));
    const start = (safePage - 1) * safeLimit;
    return {
      ...this.toImportResponse(importJob, importJob.items.slice(start, start + safeLimit)),
      meta: { page: safePage, limit: safeLimit, total: importJob.items.length, totalPages: Math.ceil(importJob.items.length / safeLimit) },
    };
  }

  async commitImport(importId: string, actor: QuizBankActor) {
    if (!mongoose.isValidObjectId(importId)) throw new NotFoundError('Quiz import not found.');
    const dbSession = await mongoose.startSession();
    let result: Record<string, unknown> | undefined;
    try {
      await dbSession.withTransaction(async () => {
        const importJob = await QuizBankImport.findById(importId).session(dbSession).exec();
        if (!importJob) throw new NotFoundError('Quiz import not found.');
        this.assertImportAccess(importJob, actor);
        if (importJob.status === 'committed') {
          const bank = await QuizQuestionBank.findOne({ quizId: importJob.quizId }).session(dbSession).lean().exec();
          result = this.toBankSummary(bank, { inserted: 0, duplicated: importJob.duplicateCount, idempotent: true });
          return;
        }
        if (importJob.status !== 'needs_review') throw new BadRequestError('Only imports awaiting review can be published.');
        this.assertPublishable(importJob);

        const existingBank = await QuizQuestionBank.findOne({ quizId: importJob.quizId }).session(dbSession).exec();
        const bankVersion = (existingBank?.version ?? 0) + 1;
        const bank = existingBank ?? (await QuizQuestionBank.create([{
          quizId: importJob.quizId,
          lessonId: importJob.lessonId,
          version: 0,
          questionCount: importJob.questionCount,
          activeQuestionCount: 0,
          status: 'draft',
        }], { session: dbSession }))[0];

        const docsByHash = new Map<string, Record<string, unknown>>();
        for (const item of importJob.items.filter((candidate) => candidate.errors.length === 0 && candidate.questionText && candidate.options && candidate.correctAnswer)) {
          const options = item.options!.map((text, index) => ({ optionId: `o${index + 1}`, text }));
          const correctIndex = 'ABCDEF'.indexOf(item.correctAnswer!.toUpperCase());
          const contentHash = this.contentHash(item.questionText!, item.options!);
          if (!docsByHash.has(contentHash)) {
            docsByHash.set(contentHash, {
              bankId: bank._id,
              quizId: importJob.quizId,
              lessonId: importJob.lessonId,
              questionText: item.questionText!,
              options,
              correctOptionId: options[correctIndex].optionId,
              explanation: item.explanation,
              difficulty: item.difficulty ?? 'medium',
              tags: item.tags ?? [],
              contentHash,
              status: 'active',
              bankVersion,
              source: { importId: importJob._id, row: item.row, fileName: importJob.fileName },
            });
          }
        }
        const candidateDocs = [...docsByHash.values()];
        const hashes = candidateDocs.map((doc) => String(doc.contentHash));
        const existingHashes = new Set((await QuizBankQuestion.find({ quizId: importJob.quizId, contentHash: { $in: hashes } })
          .session(dbSession).select('contentHash').lean().exec()).map((doc) => doc.contentHash));
        const newDocs = candidateDocs.filter((doc) => !existingHashes.has(String(doc.contentHash)));
        if (newDocs.length) await QuizBankQuestion.insertMany(newDocs, { session: dbSession, ordered: true });

        const activeQuestionCount = await QuizBankQuestion.countDocuments({ quizId: importJob.quizId, status: 'active' }).session(dbSession);
        if (activeQuestionCount < importJob.questionCount) throw new BadRequestError('Published bank does not contain enough active questions.');
        bank.version = bankVersion;
        bank.questionCount = importJob.questionCount;
        bank.activeQuestionCount = activeQuestionCount;
        bank.status = 'published';
        bank.lastImportId = importJob._id;
        await bank.save({ session: dbSession });
        await QuizModel.updateOne({ _id: importJob.quizId }, { $set: { useQuestionBank: true, randomQuestionCount: importJob.questionCount } }, { session: dbSession }).exec();
        importJob.status = 'committed';
        importJob.duplicateCount = candidateDocs.length - newDocs.length;
        importJob.committedAt = new Date();
        await importJob.save({ session: dbSession });
        result = this.toBankSummary(bank, { inserted: newDocs.length, duplicated: importJob.duplicateCount, idempotent: false });
      });
    } finally {
      await dbSession.endSession();
    }
    return result!;
  }

  async getBankSummary(quizId: string) {
    if (!mongoose.isValidObjectId(quizId)) throw new NotFoundError('Quiz question bank not found.');
    const bank = await QuizQuestionBank.findOne({ quizId }).lean().exec();
    if (!bank) throw new NotFoundError('Quiz question bank not found.');
    return this.toBankSummary(bank);
  }

  async updateImportItem(importId: string, row: number, input: Partial<RawQuestion>, actor: QuizBankActor) {
    const importJob = await this.findEditableImport(importId, actor);
    const itemIndex = importJob.items.findIndex((item) => item.row === row);
    if (itemIndex < 0) throw new NotFoundError('Import row not found.');
    const current = importJob.items[itemIndex];
    const candidate = {
      row: current.row,
      questionText: input.questionText ?? current.questionText,
      options: input.options ?? current.options,
      correctAnswer: input.correctAnswer ?? current.correctAnswer,
      explanation: input.explanation ?? current.explanation,
      difficulty: input.difficulty ?? current.difficulty,
      difficultyInput: input.difficultyInput ?? current.difficultyInput,
      tags: input.tags ?? current.tags,
    } as RawQuestion;
    importJob.items[itemIndex] = candidate as any;
    await this.refreshImportCounts(importJob);
    await importJob.save();
    return this.toImportResponse(importJob, [importJob.items[itemIndex]]);
  }

  async removeImportItem(importId: string, row: number, actor: QuizBankActor) {
    const importJob = await this.findEditableImport(importId, actor);
    const countBefore = importJob.items.length;
    importJob.items = importJob.items.filter((item) => item.row !== row) as any;
    if (importJob.items.length === countBefore) throw new NotFoundError('Import row not found.');
    await this.refreshImportCounts(importJob);
    await importJob.save();
    return this.toImportResponse(importJob, []);
  }

  async listQuestions(quizId: string, query: { page?: number; limit?: number; search?: string; status?: string; difficulty?: string; tag?: string; sort?: string }) {
    const bank = await this.getBankOrThrow(quizId);
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(100, query.limit ?? 20));
    const filter: Record<string, unknown> = { quizId: bank.quizId };
    if (query.status === 'active' || query.status === 'disabled') filter.status = query.status;
    if (query.difficulty === 'easy' || query.difficulty === 'medium' || query.difficulty === 'hard') filter.difficulty = query.difficulty;
    if (query.tag?.trim()) filter.tags = query.tag.trim();
    if (query.search?.trim()) filter.questionText = { $regex: this.escapeRegex(query.search.trim()), $options: 'i' };
    const sort = query.sort === 'updatedAt' ? '-updatedAt' : '-createdAt';
    const [items, total] = await Promise.all([
      QuizBankQuestion.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean().exec(),
      QuizBankQuestion.countDocuments(filter),
    ]);
    return {
      items: items.map((item) => this.toAdminQuestion(item)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getQuestion(quizId: string, questionId: string) {
    await this.getBankOrThrow(quizId);
    if (!mongoose.isValidObjectId(questionId)) throw new NotFoundError('Question not found.');
    const question = await QuizBankQuestion.findOne({ _id: questionId, quizId }).lean().exec();
    if (!question) throw new NotFoundError('Question not found.');
    return this.toAdminQuestion(question);
  }

  async createQuestion(quizId: string, input: QuestionBankQuestionInput) {
    const bank = await this.getBankOrThrow(quizId);
    const normalized = this.validateBankQuestion(input);
    const contentHash = this.contentHash(normalized.questionText, normalized.options.map((option) => option.text));
    const duplicate = await QuizBankQuestion.exists({ quizId, contentHash });
    if (duplicate) throw new BadRequestError('An equivalent question already exists in this library.');
    const question = await QuizBankQuestion.create({
      ...normalized,
      bankId: bank._id,
      quizId: bank.quizId,
      lessonId: bank.lessonId,
      contentHash,
      status: 'active',
      bankVersion: bank.version,
      source: {},
    });
    await QuizQuestionBank.updateOne({ _id: bank._id }, { $inc: { activeQuestionCount: 1 } }).exec();
    return this.toAdminQuestion(question.toObject());
  }

  async updateQuestion(quizId: string, questionId: string, patch: Partial<QuestionBankQuestionInput>) {
    const bank = await this.getBankOrThrow(quizId);
    if (!mongoose.isValidObjectId(questionId)) throw new NotFoundError('Question not found.');
    const current = await QuizBankQuestion.findOne({ _id: questionId, quizId }).exec();
    if (!current) throw new NotFoundError('Question not found.');
    const normalized = this.validateBankQuestion({
      questionText: patch.questionText ?? current.questionText,
      options: patch.options ?? current.options,
      correctOptionId: patch.correctOptionId ?? current.correctOptionId,
      explanation: patch.explanation ?? current.explanation,
      difficulty: patch.difficulty ?? current.difficulty,
      tags: patch.tags ?? current.tags,
    });
    const contentHash = this.contentHash(normalized.questionText, normalized.options.map((option) => option.text));
    const duplicate = await QuizBankQuestion.exists({ quizId, contentHash, _id: { $ne: questionId } });
    if (duplicate) throw new BadRequestError('An equivalent question already exists in this library.');
    Object.assign(current, normalized, { contentHash, bankVersion: bank.version });
    await current.save();
    return this.toAdminQuestion(current.toObject());
  }

  async setQuestionStatus(quizId: string, questionId: string, status: 'active' | 'disabled') {
    const dbSession = await mongoose.startSession();
    let response: Record<string, unknown> | undefined;
    try {
      await dbSession.withTransaction(async () => {
        const bank = await QuizQuestionBank.findOne({ quizId }).session(dbSession).exec();
        if (!bank) throw new NotFoundError('Quiz question bank not found.');
        const question = await QuizBankQuestion.findOne({ _id: questionId, quizId }).session(dbSession).exec();
        if (!question) throw new NotFoundError('Question not found.');
        if (question.status === status) {
          response = this.toAdminQuestion(question.toObject());
          return;
        }
        if (status === 'disabled') {
          const activeCount = await QuizBankQuestion.countDocuments({ quizId, status: 'active' }).session(dbSession);
          if (activeCount - 1 < bank.questionCount) throw new BadRequestError(`At least ${bank.questionCount} active questions are required.`);
        }
        question.status = status;
        await question.save({ session: dbSession });
        bank.activeQuestionCount = await QuizBankQuestion.countDocuments({ quizId, status: 'active' }).session(dbSession);
        await bank.save({ session: dbSession });
        response = this.toAdminQuestion(question.toObject());
      });
    } finally {
      await dbSession.endSession();
    }
    return response!;
  }

  buildXlsxTemplate() {
    const headers = ['question', 'option_a', 'option_b', 'option_c', 'option_d', 'option_e', 'option_f', 'correct_answer', 'explanation', 'difficulty', 'tags'];
    const sheet = XLSX.utils.aoa_to_sheet([
      headers,
      ['What is a JavaScript closure?', 'A loop', 'A function retaining lexical scope', 'A class', 'A promise', '', '', 'B', 'A closure retains access to its lexical scope.', 'medium', 'javascript,functions'],
    ]);
    sheet['!cols'] = headers.map((header) => ({ wch: Math.max(14, header.length + 4) }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Questions');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  private async resolveQuiz(input: CreateImportInput) {
    if (input.quizId) {
      if (!mongoose.isValidObjectId(input.quizId)) throw new BadRequestError('Invalid quizId.');
      const quiz = await QuizModel.findOne({ _id: input.quizId, isDeleted: { $ne: true } }).exec();
      if (!quiz) throw new NotFoundError('Quiz not found.');
      return quiz;
    }
    if (!input.lessonId || !mongoose.isValidObjectId(input.lessonId)) {
      throw new BadRequestError('quizId or a valid lessonId is required.');
    }
    const existing = await QuizModel.findOne({ lessonId: input.lessonId, isDeleted: { $ne: true } }).exec();
    if (existing) return existing;
    const lesson = await Lesson.findById(input.lessonId).select('_id').exec();
    if (!lesson) throw new NotFoundError('Lesson not found.');
    return QuizModel.create({
      lessonId: lesson._id,
      title: input.title?.trim() || 'Quiz library',
      description: 'Quiz generated from question library.',
      questions: [],
      useQuestionBank: false,
      passingScorePercent: 80,
      xpReward: 100,
      timeLimit: 1800,
      passingScore: 80,
    });
  }

  private async findEditableImport(importId: string, actor: QuizBankActor) {
    if (!mongoose.isValidObjectId(importId)) throw new NotFoundError('Quiz import not found.');
    const importJob = await QuizBankImport.findById(importId).exec();
    if (!importJob) throw new NotFoundError('Quiz import not found.');
    this.assertImportAccess(importJob, actor);
    if (importJob.status !== 'needs_review') throw new BadRequestError('Only imports awaiting review can be edited.');
    return importJob;
  }

  private assertImportAccess(importJob: { createdBy: unknown }, actor: QuizBankActor) {
    if (actor.role !== 'ADMIN' && String(importJob.createdBy) !== actor.id) {
      throw new NotFoundError('Quiz import not found.');
    }
  }

  private assertPublishable(importJob: { validCount: number; questionCount: number }) {
    if (importJob.validCount < 5) throw new BadRequestError('At least 5 valid questions are required before publishing a quiz library.');
    if (!Number.isInteger(importJob.questionCount) || importJob.questionCount < 5 || importJob.questionCount > 10) {
      throw new BadRequestError('questionCount must be an integer between 5 and 10.');
    }
    if (importJob.validCount < importJob.questionCount) {
      throw new BadRequestError(`The library needs at least ${importJob.questionCount} valid questions to publish.`);
    }
  }

  private async refreshImportCounts(importJob: { quizId: unknown; items: IImportedQuestion[]; validCount: number; invalidCount: number; duplicateCount: number }) {
    importJob.items = await this.validateAndAnnotateItems(String(importJob.quizId), importJob.items as RawQuestion[]);
    importJob.validCount = importJob.items.filter((item) => item.errors.length === 0).length;
    importJob.invalidCount = importJob.items.length - importJob.validCount;
    importJob.duplicateCount = this.countDuplicateItems(importJob.items);
  }

  private async getBankOrThrow(quizId: string) {
    if (!mongoose.isValidObjectId(quizId)) throw new NotFoundError('Quiz question bank not found.');
    const bank = await QuizQuestionBank.findOne({ quizId }).exec();
    if (!bank) throw new NotFoundError('Quiz question bank not found.');
    return bank;
  }

  private validateBankQuestion(input: QuestionBankQuestionInput): Required<QuestionBankQuestionInput> {
    const questionText = input.questionText?.trim();
    if (!questionText || questionText.length > 5_000) throw new BadRequestError('Question text must contain 1–5,000 characters.');
    const options = (input.options ?? []).map((option) => ({ optionId: option.optionId?.trim(), text: option.text?.trim() }));
    if (options.length < 2 || options.length > 6) throw new BadRequestError('A question must contain between 2 and 6 options.');
    if (options.some((option) => !option.optionId || !option.text || option.text.length > 2_000)) {
      throw new BadRequestError('Each option must contain an id and 1–2,000 characters of text.');
    }
    const ids = new Set(options.map((option) => option.optionId));
    if (ids.size !== options.length) throw new BadRequestError('Option ids must be unique.');
    const normalizedTexts = options.map((option) => option.text.replace(/\s+/g, ' ').toLocaleLowerCase());
    if (new Set(normalizedTexts).size !== normalizedTexts.length) throw new BadRequestError('Option text must not be duplicated.');
    const correctOptionId = input.correctOptionId?.trim();
    if (!correctOptionId || !ids.has(correctOptionId)) throw new BadRequestError('correctOptionId must belong to options.');
    const difficulty = input.difficulty ?? 'medium';
    if (!['easy', 'medium', 'hard'].includes(difficulty)) throw new BadRequestError('difficulty must be easy, medium, or hard.');
    const explanation = input.explanation?.trim();
    if (explanation && explanation.length > 5_000) throw new BadRequestError('Explanation must not exceed 5,000 characters.');
    const tags = [...new Set((input.tags ?? []).map((tag) => tag.trim().toLocaleLowerCase()).filter(Boolean))].slice(0, 20);
    return { questionText, options: options as Array<{ optionId: string; text: string }>, correctOptionId, explanation: explanation ?? '', difficulty, tags };
  }

  private toAdminQuestion(question: any) {
    return {
      id: String(question._id),
      quizId: String(question.quizId),
      questionText: question.questionText,
      options: question.options.map((option: any) => ({ optionId: option.optionId, text: option.text })),
      correctOptionId: question.correctOptionId,
      explanation: question.explanation,
      difficulty: question.difficulty,
      tags: question.tags ?? [],
      status: question.status,
      bankVersion: question.bankVersion,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
    };
  }

  private toBankSummary(bank: any, extra: Record<string, unknown> = {}) {
    if (!bank) throw new NotFoundError('Quiz question bank not found.');
    return {
      quizId: String(bank.quizId),
      lessonId: String(bank.lessonId),
      version: bank.version,
      questionCount: bank.questionCount,
      activeQuestionCount: bank.activeQuestionCount,
      status: bank.status,
      lastImportId: bank.lastImportId ? String(bank.lastImportId) : undefined,
      ...extra,
    };
  }

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private assertFile(file?: Express.Multer.File) {
    if (!file?.buffer?.length) throw new BadRequestError('No quiz library file was provided.');
    const extension = path.extname(file.originalname).toLowerCase();
    if (extension !== '.xlsx' && extension !== '.docx') {
      throw new BadRequestError('Only .xlsx and .docx files are supported.');
    }
    const maxBytes = env.MAX_FILE_SIZE_MB * 1024 * 1024;
    if (file.buffer.length > maxBytes) throw new BadRequestError(`File size exceeds ${env.MAX_FILE_SIZE_MB}MB.`);
    if (file.buffer[0] !== 0x50 || file.buffer[1] !== 0x4b) {
      throw new BadRequestError('The uploaded file is not a valid Office Open XML file.');
    }
  }

  private parseXlsx(buffer: Buffer): RawQuestion[] {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellText: true, cellDates: false });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new BadRequestError('Workbook does not contain a worksheet.');
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: '' });
    if (!rows.length) throw new BadRequestError('Workbook does not contain any question rows.');
    return rows.map((row, index) => this.fromSpreadsheetRow(row, index + 2));
  }

  private async parseDocx(buffer: Buffer): Promise<RawQuestion[]> {
    const result = await mammoth.extractRawText({ buffer });
    const lines = result.value.replace(/\r/g, '').split('\n').map((line) => line.trim()).filter(Boolean);
    const questions: RawQuestion[] = [];
    let current: RawQuestion | null = null;
    let lastOption = -1;
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const question = line.match(/^(?:câu\s*\d*|question\s*\d*)\s*[:.)-]\s*(.+)$/i);
      const option = line.match(/^([A-F])\s*[.)-]\s*(.+)$/i);
      const answer = line.match(/^(?:đáp án|answer)\s*[:=-]\s*([A-F])\b/i);
      if (question) {
        if (current) questions.push(current);
        current = { row: index + 1, questionText: question[1], options: [], correctAnswer: '', tags: [] };
        lastOption = -1;
      } else if (current && option) {
        current.options!.push(option[2]);
        lastOption = current.options!.length - 1;
      } else if (current && answer) {
        current.correctAnswer = answer[1].toUpperCase();
      } else if (current && /^giải thích\s*[:=-]/i.test(line)) {
        current.explanation = line.replace(/^giải thích\s*[:=-]\s*/i, '');
      } else if (current && lastOption >= 0) {
        current.options![lastOption] = `${current.options![lastOption]} ${line}`;
      } else if (current) {
        current.questionText = `${current.questionText} ${line}`;
      }
    }
    if (current) questions.push(current);
    if (!questions.length) {
      throw new BadRequestError('DOCX must use the supported Câu 1 / A. / Đáp án: B format.');
    }
    return questions;
  }

  private fromSpreadsheetRow(row: Record<string, unknown>, rowNumber: number): RawQuestion {
    const values = Object.fromEntries(Object.entries(row).map(([key, value]) => [this.normalizeHeader(key), String(value ?? '').trim()]));
    const questionText = values.question || values.questiontext || values.cauhoi || values.noidung;
    const options = ['a', 'b', 'c', 'd', 'e', 'f']
      .map((letter) => values[`option${letter}`] || values[`dap${letter}`] || values[letter] || '')
      .filter(Boolean);
    const answerRaw = values.correctanswer || values.answer || values.dapan || values.correct || '';
    const answer = answerRaw.trim().toUpperCase().replace(/^OPTION\s*/, '');
    const difficultyInput = values.difficulty.trim().toLowerCase();
    const difficulty = ['easy', 'medium', 'hard'].includes(difficultyInput) ? difficultyInput as QuestionDifficulty : undefined;
    return {
      row: rowNumber,
      questionText,
      options,
      correctAnswer: answer,
      explanation: values.explanation || values.giaithich || undefined,
      difficulty,
      difficultyInput: difficultyInput || undefined,
      tags: (values.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean),
    };
  }

  private validateItem(item: RawQuestion): IImportedQuestion {
    const difficultyInput = item.difficultyInput?.trim().toLocaleLowerCase()
      ?? (typeof item.difficulty === 'string' ? item.difficulty.trim().toLocaleLowerCase() : undefined);
    const difficulty = difficultyInput && ['easy', 'medium', 'hard'].includes(difficultyInput)
      ? difficultyInput as QuestionDifficulty
      : undefined;
    const normalized: IImportedQuestion = {
      ...item,
      questionText: item.questionText?.trim(),
      options: item.options?.map((option) => option.trim()).filter(Boolean),
      correctAnswer: item.correctAnswer?.trim().toUpperCase(),
      difficulty,
      difficultyInput,
      errors: [],
    };
    if (!normalized.questionText) normalized.errors.push('Question text is required.');
    if (normalized.questionText && normalized.questionText.length > 5_000) {
      normalized.errors.push('Question text must not exceed 5,000 characters.');
    }
    if (!normalized.options || normalized.options.length < 2 || normalized.options.length > 6) {
      normalized.errors.push('Each question must contain between 2 and 6 options.');
    }
    const answerIndex = normalized.correctAnswer ? 'ABCDEF'.indexOf(normalized.correctAnswer) : -1;
    if (answerIndex < 0 || !normalized.options || answerIndex >= normalized.options.length) {
      normalized.errors.push('correct_answer must be a valid option letter (A–F).');
    }
    if (normalized.options?.some((option) => option.length > 2_000)) {
      normalized.errors.push('Each option must not exceed 2,000 characters.');
    }
    if (normalized.options) {
      const optionTexts = normalized.options.map((option) => option.replace(/\s+/g, ' ').toLocaleLowerCase());
      if (new Set(optionTexts).size !== optionTexts.length) {
        normalized.errors.push('Option text must not be duplicated.');
      }
    }
    if (difficultyInput && !['easy', 'medium', 'hard'].includes(difficultyInput)) {
      normalized.errors.push('difficulty must be easy, medium, or hard.');
    }
    if (normalized.explanation && normalized.explanation.length > 5_000) {
      normalized.errors.push('Explanation must not exceed 5,000 characters.');
    }
    return normalized;
  }

  private async validateAndAnnotateItems(quizId: string, rawItems: RawQuestion[]): Promise<IImportedQuestion[]> {
    const items = rawItems.map((item) => this.validateItem(item));
    const candidates = items.filter((item) => item.errors.length === 0 && item.questionText && item.options);
    const hashes = candidates.map((item) => this.contentHash(item.questionText!, item.options!));
    const existingHashes = new Set(
      (await QuizBankQuestion.find({ quizId, contentHash: { $in: hashes } }).select('contentHash').lean().exec())
        .map((question) => question.contentHash),
    );
    const seen = new Set<string>();
    for (const item of candidates) {
      const hash = this.contentHash(item.questionText!, item.options!);
      if (seen.has(hash)) item.errors.push('Duplicate question in this import.');
      else seen.add(hash);
      if (existingHashes.has(hash)) item.errors.push('An equivalent question already exists in this library.');
    }
    return items;
  }

  private countDuplicateItems(items: IImportedQuestion[]) {
    return items.filter((item) => item.errors.some((error) => error.startsWith('Duplicate question') || error.startsWith('An equivalent question'))).length;
  }

  private normalizeHeader(header: string) {
    return header.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  }

  private contentHash(questionText: string, options: string[]) {
    return crypto.createHash('sha256').update(`${questionText.trim().toLowerCase()}\u0000${options.map((v) => v.trim().toLowerCase()).join('\u0000')}`).digest('hex');
  }

  private toImportResponse(importJob: any, items: IImportedQuestion[] = importJob.items) {
    return {
      id: String(importJob._id),
      quizId: String(importJob.quizId),
      lessonId: String(importJob.lessonId),
      fileName: importJob.fileName,
      fileType: importJob.fileType,
      status: importJob.status,
      questionCount: importJob.questionCount,
      validCount: importJob.validCount,
      invalidCount: importJob.invalidCount,
      duplicateCount: importJob.duplicateCount,
      items,
      createdAt: importJob.createdAt,
      committedAt: importJob.committedAt,
    };
  }
}
