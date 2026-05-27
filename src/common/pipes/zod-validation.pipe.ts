import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { z } from 'zod';
import { BadRequestError } from '../custom-error';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: z.ZodSchema) {}

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
