import {
  IsString, IsOptional, IsBoolean, IsNumber, Min,
  MinLength, MaxLength, IsMongoId,
} from 'class-validator';

export class CreateLessonDto {
  @IsMongoId() courseId!: string;
  @IsString() @MinLength(3) @MaxLength(200) title!: string;
  @IsString() @MinLength(1) content!: string;
  @IsOptional() @IsString() videoUrl?: string;
  @IsOptional() @IsString() attachmentUrl?: string;
  @IsOptional() @IsNumber() @Min(0) durationMinutes?: number;
  @IsOptional() @IsNumber() @Min(0) order?: number;
  @IsOptional() @IsBoolean() isLocked?: boolean;
  @IsOptional() @IsBoolean() isFreePreview?: boolean;
}

export class UpdateLessonDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MinLength(1) content?: string;
  @IsOptional() @IsString() videoUrl?: string;
  @IsOptional() @IsString() attachmentUrl?: string;
  @IsOptional() @IsNumber() @Min(0) durationMinutes?: number;
  @IsOptional() @IsNumber() @Min(0) order?: number;
  @IsOptional() @IsBoolean() isFreePreview?: boolean;
}

export class ToggleLockDto {
  @IsBoolean() isLocked!: boolean;
}
