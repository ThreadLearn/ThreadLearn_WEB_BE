import { Module } from '@nestjs/common';
import { BookmarkController } from './controllers/bookmark.controller';

@Module({
  controllers: [BookmarkController],
})
export class BookmarkModule {}
