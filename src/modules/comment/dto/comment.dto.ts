import { IsEnum, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class CreateCommentDto {
  @IsEnum(['COURSE', 'LESSON'])  targetType!: 'COURSE' | 'LESSON';
  @IsString() @MinLength(1)      targetId!: string;
  @IsString() @MinLength(1) @MaxLength(2000) content!: string;
  @IsOptional() @IsString()      parentId?: string;
}

export class UpdateCommentDto {
  @IsString() @MinLength(1) @MaxLength(2000) content!: string;
}
