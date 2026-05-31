import { Module } from '@nestjs/common';
import { CodeExecutionController } from './controllers/code-execution.controller';
import { CodeExecutionService } from './services/code-execution.service';

@Module({
  controllers: [CodeExecutionController],
  providers: [CodeExecutionService],
  exports: [CodeExecutionService],
})
export class CodeExecutionModule {}
