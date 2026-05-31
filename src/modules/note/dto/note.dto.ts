import { IsString, IsNumber, Min, MinLength } from 'class-validator';

export class CreateNoteDto {
  @IsString()               lessonId!: string;
  @IsString() @MinLength(1) anchorText!: string;
  @IsNumber()  @Min(0)      anchorStart!: number;
  @IsNumber()               anchorEnd!: number;
  @IsString() @MinLength(1) noteContent!: string;
}

export class UpdateNoteDto {
  @IsString() @MinLength(1) noteContent!: string;
}
