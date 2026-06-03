import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Quiz Attempts')
@Controller('v1/quiz-attempts')
export class QuizAttemptsController { }
// // src/common/pipes/zod-validation.pipe.ts

import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { z } from '../../../common/zod/z';
import { BadRequestError } from '../../../common/custom-error';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
    constructor(private readonly schema: z.ZodSchema) { }

    transform(value: unknown, _metadata: ArgumentMetadata) {
        const parsedResult = this.schema.safeParse(value);
        if (!parsedResult.success) {
            const formattedErrors = parsedResult.error.errors.map((error) => ({
                field: error.path.join('.'),
                message: error.message,
            }));
            throw new BadRequestError('Validation failed.', formattedErrors);
        }
        return parsedResult.data;
    }
}