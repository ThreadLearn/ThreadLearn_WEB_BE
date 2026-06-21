import { Module } from '@nestjs/common';
import { LearningAccessModule } from '../../shared/application/learning-access/learning-access.module';
import { LessonsController } from './controllers/lessons.controller';
import { LessonsService } from './services/lessons.service';

@Module({
  imports: [LearningAccessModule],
  controllers: [LessonsController],
  providers: [LessonsService],
  exports: [LessonsService],
})
export class LessonsModule {}
