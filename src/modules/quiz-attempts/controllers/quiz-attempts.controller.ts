import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Quiz Attempts')
@Controller('v1/quiz-attempts')
export class QuizAttemptsController {}
