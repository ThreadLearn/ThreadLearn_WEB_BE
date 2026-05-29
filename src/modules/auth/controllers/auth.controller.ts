import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../../common/api-response';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/api-handler';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { BadRequestError } from '../../../common/custom-error';
import { AuthService } from '../services/auth.service';
import { loginSchema, refreshTokenSchema, registerSchema } from '../validators/auth.validator';

@ApiTags('Auth')
@Controller('v1/auth')
export class AuthController {
  @Post('register')
  async register(@Body(new ZodValidationPipe(registerSchema)) body: unknown) {
    const result = await AuthService.register(body);
    return ApiResponse.success({
      message: 'User registered successfully.',
      data: result,
      statusCode: 201,
    });
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body(new ZodValidationPipe(loginSchema)) body: unknown) {
    const result = await AuthService.login(body);
    return ApiResponse.success({
      message: 'Login successful.',
      data: result,
    });
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body(new ZodValidationPipe(refreshTokenSchema)) body: { refreshToken: string }) {
    const result = await AuthService.refresh(body.refreshToken);
    return ApiResponse.success({
      message: 'Tokens refreshed successfully.',
      data: result,
    });
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Body(new ZodValidationPipe(refreshTokenSchema)) body: { refreshToken: string }) {
    await AuthService.logout(body.refreshToken);
    return ApiResponse.success({
      message: 'Logged out successfully.',
    });
  }

  @Get('session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  async getSessionUser(@CurrentUser() user?: AuthenticatedUser) {
    if (!user) {
      throw new BadRequestError('User context missing from request.');
    }
    const sessionUser = await AuthService.getSessionUser(user.id);
    return ApiResponse.success({
      message: 'User context retrieved successfully.',
      data: { user: sessionUser },
    });
  }
}

export default AuthController;
