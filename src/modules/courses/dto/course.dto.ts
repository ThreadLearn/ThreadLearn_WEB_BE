import {
  IsString, IsOptional, IsBoolean, IsNumber, IsEnum,
  IsArray, ArrayMaxSize, Min, MinLength, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export type CourseLevelDto = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export class CreateCourseDto {
  @IsString() @MinLength(3) @MaxLength(200) title!: string;
  @IsString() @MinLength(10)                description!: string;
  @IsOptional() @IsString() thumbnailUrl?: string;
  @IsOptional() @IsEnum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']) level?: CourseLevelDto;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(20) tags?: string[];
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsNumber() @Min(0) durationMinutes?: number;
  @IsOptional() @IsBoolean() isPublished?: boolean;
  @IsOptional() @IsBoolean() isPremium?: boolean;
}

export class UpdateCourseDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MinLength(10) description?: string;
  @IsOptional() @IsString() thumbnailUrl?: string;
  @IsOptional() @IsEnum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']) level?: CourseLevelDto;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(20) tags?: string[];
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsNumber() @Min(0) durationMinutes?: number;
  @IsOptional() @IsBoolean() isPremium?: boolean;
}

export class TogglePublishDto {
  @IsBoolean() isPublished!: boolean;
}

export class SearchCourseDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsEnum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']) level?: CourseLevelDto;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() tag?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) maxPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) limit?: number;
}
