import { IsEnum, IsString, MinLength, IsOptional } from 'class-validator';

export class ToggleBookmarkDto {
  @IsEnum(['COURSE', 'LESSON'])  targetType!: 'COURSE' | 'LESSON';
  @IsString() @MinLength(1)      targetId!: string;
  @IsString() @MinLength(1)      title!: string;
  @IsOptional() @IsString()      thumbnailUrl?: string;
}
