import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class RequestAnalysisDto {
  @IsString() @MinLength(1) @MaxLength(5000) inputCode!: string;
  @IsString() @MinLength(1)                  language!: string;
  @IsOptional() @IsString()                  codeExecutionId?: string;
}
