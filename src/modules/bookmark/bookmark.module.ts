import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BookmarkController } from './controllers/bookmark.controller';
import { BookmarkService } from './services/bookmark.service';
import { BookmarkSchema } from './models/bookmark.model';

@Module({
  imports:     [MongooseModule.forFeature([{ name: 'Bookmark', schema: BookmarkSchema }])],
  controllers: [BookmarkController],
  providers:   [BookmarkService],
  exports:     [BookmarkService],
})
export class BookmarkModule {}
