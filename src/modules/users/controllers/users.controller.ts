import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../../../common/api-handler';
import { ApiResponse } from '../../../common/api-response';
import { BadRequestError } from '../../../common/custom-error';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import {
  GetMyProfileService,
  UpdateMyProfileService,
  UploadAvatarService,
} from '../application/services';
import { updateProfileSchema } from '../validators/users.validator';

/**
 * UsersController (UC09 — Profile / Avatar).
 *
 * DEV1.6D — migrate sang Clean Architecture use-cases (`GetMyProfileService`,
 * `UpdateMyProfileService`, `UploadAvatarService`). Controller chỉ còn lo
 * presentation: auth context, body/file extraction, `ApiResponse.success` wrapper.
 *
 * GIỮ NGUYÊN so với legacy: route path, HTTP method/status, response message + shape,
 * `FileInterceptor('avatar')` memory upload, không validate mime, không xoá avatar cũ.
 * Không còn query DB / gọi `UsersService` legacy / gọi `saveUploadedFile` trực tiếp.
 */
@ApiTags('Users')
@Controller('v1/users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('BearerAuth')
export class UsersController {
  constructor(
    private readonly getMyProfileService: GetMyProfileService,
    private readonly updateMyProfileService: UpdateMyProfileService,
    private readonly uploadAvatarService: UploadAvatarService
  ) {}

  @Get('profile')
  async getMyProfile(@CurrentUser() user?: AuthenticatedUser) {
    if (!user) {
      throw new BadRequestError('User context not found.');
    }

    const profile = await this.getMyProfileService.execute({ userId: user.id });
    return ApiResponse.success({
      message: 'Profile retrieved successfully.',
      data: profile,
    });
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update the authenticated user profile.' })
  async updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateProfileSchema))
    body: { firstName?: string; lastName?: string }
  ) {
    if (!user) {
      throw new BadRequestError('User context not found.');
    }

    const updatedProfile = await this.updateMyProfileService.execute({
      userId: user.id,
      firstName: body.firstName,
      lastName: body.lastName,
    });
    return ApiResponse.success({
      message: 'Profile updated successfully.',
      data: updatedProfile,
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

      const updatedUser = await this.uploadAvatarService.execute({
        userId: user.id,
        file,
      });

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
