import { Module } from '@nestjs/common';
import { CodeExecutionController } from './controllers/code-execution.controller';
import { ExercisesController } from './controllers/exercises.controller';
import { CodeExecutionService } from './services/code-execution.service';
import { ExercisesService } from './services/exercises.service';

@Module({
  controllers: [CodeExecutionController, ExercisesController],
  providers: [CodeExecutionService, ExercisesService],
  exports: [CodeExecutionService, ExercisesService],
})
export class CodeExecutionModule {}
