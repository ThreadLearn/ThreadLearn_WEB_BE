import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../../common/api-response';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { BadRequestError } from '../../../common/custom-error';
import { saveUploadedFile } from '../../../configs/upload';
import { LessonsService } from '../services/lessons.service';

@ApiTags('Lessons')
@Controller('v1/lessons')
export class LessonsController {
  @Get(':id')
  async getLessonById(@Param('id') id: string) {
    const lesson = await LessonsService.getLesson(id);
    return ApiResponse.success({
      message: 'Lesson content retrieved successfully.',
      data: lesson,
    });
  }

  @Post(':id/attachment')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('attachment'))
  @ApiBearerAuth('BearerAuth')
  @ApiConsumes('multipart/form-data')
  async uploadAttachment(
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File
  ) {
    try {
      if (!file) {
        throw new BadRequestError('No attachment file provided in FormData.');
      }

      const fileUrl = await saveUploadedFile(file, 'attachments');
      const updatedLesson = await LessonsService.updateAttachment(id, fileUrl);

      return ApiResponse.success({
        message: 'Attachment uploaded successfully.',
        data: updatedLesson,
      });
    } catch (err: any) {
      if (err instanceof BadRequestError) throw err;
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestError('Failed to parse multipart/form-data for lesson attachment upload.');
    }
  }
}

export default LessonsController;
