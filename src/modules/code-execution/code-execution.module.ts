import { Module } from '@nestjs/common';
import { LearningAccessModule } from '../../shared/application/learning-access/learning-access.module';
import { CodeExecutionService } from './application/services/code-execution.service';
import { ExercisesService } from './application/services/exercises.service';
import { CODE_EXECUTION_REPOSITORY } from './domain/interfaces/code-execution.repository';
import { EXERCISE_REPOSITORY } from './domain/interfaces/exercise.repository';
import { MongoCodeExecutionRepository } from './infrastructure/persistence/mongo-code-execution.repository';
import { MongoExerciseRepository } from './infrastructure/persistence/mongo-exercise.repository';
import { CodeExecutionController } from './presentation/controller/code-execution.controller';
import { ExercisesController } from './presentation/controller/exercises.controller';
import { DailyQuotaService } from '../../shared/infrastructure/quota/daily-quota.service';

@Module({
  imports: [LearningAccessModule],
  controllers: [CodeExecutionController, ExercisesController],
  providers: [
    MongoCodeExecutionRepository,
    MongoExerciseRepository,
    { provide: CODE_EXECUTION_REPOSITORY, useExisting: MongoCodeExecutionRepository },
    { provide: EXERCISE_REPOSITORY, useExisting: MongoExerciseRepository },
    CodeExecutionService,
    ExercisesService,
    DailyQuotaService,
  ],
  exports: [CodeExecutionService, ExercisesService],
})
export class CodeExecutionModule {}
