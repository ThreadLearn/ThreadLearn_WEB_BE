import { AuthenticatedNextRequest } from '../../../common/api-handler';
import { ApiResponse } from '../../../common/api-response';
import { AuthService } from '../services/auth.service';
import { BadRequestError } from '../../../common/custom-error';

export class AuthController {
  static async register(req: AuthenticatedNextRequest) {
    const body = await req.json();
    const result = await AuthService.register(body);
    return ApiResponse.success({
      message: 'User registered successfully.',
      data: result,
      statusCode: 201,
    });
  }

  static async login(req: AuthenticatedNextRequest) {
    const body = await req.json();
    const result = await AuthService.login(body);
    return ApiResponse.success({
      message: 'Login successful.',
      data: result,
    });
  }

  static async refresh(req: AuthenticatedNextRequest) {
    const body = await req.json();
    const result = await AuthService.refresh(body.refreshToken);
    return ApiResponse.success({
      message: 'Tokens refreshed successfully.',
      data: result,
    });
  }

  static async logout(req: AuthenticatedNextRequest) {
    const body = await req.json();
    await AuthService.logout(body.refreshToken);
    return ApiResponse.success({
      message: 'Logged out successfully.',
    });
  }

  static async getSessionUser(req: AuthenticatedNextRequest) {
    if (!req.user) {
      throw new BadRequestError('User context missing from request.');
    }
    return ApiResponse.success({
      message: 'User context retrieved successfully.',
      data: { user: req.user },
    });
  }
}
export default AuthController;
