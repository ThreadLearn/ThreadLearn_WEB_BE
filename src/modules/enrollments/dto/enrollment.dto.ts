import { IsMongoId } from 'class-validator';

export class EnrollDto {
  @IsMongoId() courseId!: string;
}
