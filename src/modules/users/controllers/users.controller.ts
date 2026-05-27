import {
  BadRequestException,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../../../common/api-handler';
import { ApiResponse } from '../../../common/api-response';
import { BadRequestError } from '../../../common/custom-error';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { saveUploadedFile } from '../../../configs/upload';
import { UsersService } from '../services/users.service';

@ApiTags('Users')
@Controller('v1/users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('BearerAuth')
export class UsersController {
  @Get('profile')
  async getMyProfile(@CurrentUser() user?: AuthenticatedUser) {
    if (!user) {
      throw new BadRequestError('User context not found.');
    }

    const profile = await UsersService.getProfile(user.id);
    return ApiResponse.success({
      message: 'Profile retrieved successfully.',
      data: profile,
    });
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiConsumes('multipart/form-data')
  async uploadAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: Express.Multer.File
  ) {
    try {
      if (!user) {
        throw new BadRequestError('User context not found.');
      }

      if (!file) {
        throw new BadRequestError('No avatar file provided in FormData.');
      }

      const fileUrl = await saveUploadedFile(file, 'avatars');
      const updatedUser = await UsersService.updateAvatar(user.id, fileUrl);

      return ApiResponse.success({
        message: 'Avatar uploaded successfully.',
        data: updatedUser,
      });
    } catch (err: any) {
      if (err instanceof BadRequestError) throw err;
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestError('Failed to parse multipart/form-data for avatar upload.');
    }
  }
}

export default UsersController;
