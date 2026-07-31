import { Module } from '@nestjs/common';
import { LearningAccessModule } from '../../shared/application/learning-access/learning-access.module';
import { CodeShareService } from './application/services/code-share.service';
import { CodeShareController } from './presentation/controller/code-share.controller';

@Module({
  imports: [LearningAccessModule],
  controllers: [CodeShareController],
  providers: [CodeShareService],
  exports: [CodeShareService],
})
export class CodeShareModule {}
