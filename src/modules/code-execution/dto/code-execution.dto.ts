import { IsEnum, IsString, MinLength } from 'class-validator';

export class RunCodeDto {
  @IsString()            exerciseId!: string;
  @IsString() @MinLength(1) code!: string;
  @IsEnum(['javascript', 'python']) language!: 'javascript' | 'python';
}
