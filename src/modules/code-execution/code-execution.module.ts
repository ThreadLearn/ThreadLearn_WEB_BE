import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExercisesController, CodeExecutionController } from './controllers/code-execution.controller';
import { CodeExecutionService } from './services/code-execution.service';
import { Judge0Service } from './services/judge0.service';
import { ExerciseSchema } from './models/exercise.model';
import { CodeExecutionSchema } from './models/code-execution.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Exercise',      schema: ExerciseSchema },
      { name: 'CodeExecution', schema: CodeExecutionSchema },
    ]),
  ],
  controllers: [ExercisesController, CodeExecutionController],
  providers:   [CodeExecutionService, Judge0Service],
  exports:     [CodeExecutionService],
})
export class CodeExecutionModule {}
