import { AuthenticatedNextRequest } from '../../../common/api-handler';
import { ApiResponse } from '../../../common/api-response';
import { UsersService } from '../services/users.service';
import { BadRequestError } from '../../../common/custom-error';
import { saveUploadedFile } from '../../../configs/upload';

export class UsersController {
  static async getMyProfile(req: AuthenticatedNextRequest) {
    if (!req.user) {
      throw new BadRequestError('User context not found.');
    }
    const profile = await UsersService.getProfile(req.user.id);
    return ApiResponse.success({
      message: 'Profile retrieved successfully.',
      data: profile,
    });
  }

  static async uploadAvatar(req: AuthenticatedNextRequest) {
    if (!req.user) {
      throw new BadRequestError('User context not found.');
    }

    try {
      const formData = await req.formData();
      const file = formData.get('avatar') as File;

      if (!file) {
        throw new BadRequestError('No avatar file provided in FormData.');
      }

      const fileUrl = await saveUploadedFile(file, 'avatars');
      const updatedUser = await UsersService.updateAvatar(req.user.id, fileUrl);

      return ApiResponse.success({
        message: 'Avatar uploaded successfully.',
        data: updatedUser,
      });
    } catch (err: any) {
      if (err instanceof BadRequestError) throw err;
      throw new BadRequestError('Failed to parse multipart/form-data for avatar upload.');
    }
  }
}
export default UsersController;
