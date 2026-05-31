import { Module } from '@nestjs/common';
import { IDEController } from './controllers/ide.controller';
import { IDEService } from './services/ide.service';

@Module({
  controllers: [IDEController],
  providers: [IDEService],
  exports: [IDEService],
})
export class IDEModule {}
