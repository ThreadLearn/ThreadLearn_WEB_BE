import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { ApiResponse } from '../../../common/api-response';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { User } from '../../auth/models/user.model';
import { CodeExecutionService } from '../../code-execution/services/code-execution.service';
import { Course } from '../../courses/models/course.model';
import { Enrollment } from '../../enrollments/models/enrollment.model';
import { QuizAttempt } from '../../quiz-attempts/models/quiz-attempt.model';

const executeSchema = z.object({
  sourceCode: z.string().min(1, 'Source code is required.'),
  languageId: z.number().int().positive('Language ID must be a positive integer.'),
  stdin: z.string().optional(),
});

@ApiTags('Admin')
@Controller('v1/admin')
@UseGuards(JwtAuthGuard)
@Roles('ADMIN')
@ApiBearerAuth('BearerAuth')
export class AdminController {
  @Get('stats')
  async getStats() {
    const [totalUsers, totalCourses, totalEnrollments, totalAttempts] = await Promise.all([
      User.countDocuments(),
      Course.countDocuments(),
      Enrollment.countDocuments(),
      QuizAttempt.countDocuments(),
    ]);

    return ApiResponse.success({
      message: 'Admin dashboard statistics retrieved.',
      data: {
        totalUsers,
        totalCourses,
        totalEnrollments,
        totalQuizAttempts: totalAttempts,
      },
    });
  }

  @Post('execute')
  @HttpCode(200)
  async executeCode(
    @Body(new ZodValidationPipe(executeSchema))
    body: { sourceCode: string; languageId: number; stdin?: string }
  ) {
    const result = await CodeExecutionService.executeCode(body);
    return ApiResponse.success({
      message: 'Code execution completed.',
      data: result,
    });
  }
}
