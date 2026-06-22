import { Module } from '@nestjs/common';
import { CodeExecutionModule } from '../code-execution/code-execution.module';
import { LearningAccessModule } from '../../shared/application/learning-access/learning-access.module';
import { AdminController } from './controllers/admin.controller';
import { AdminService } from './services/admin.service';

@Module({
  imports: [LearningAccessModule, CodeExecutionModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
