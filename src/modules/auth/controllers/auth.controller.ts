import { Body, Controller, Get, HttpCode, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../../common/api-response';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/api-handler';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { BadRequestError } from '../../../common/custom-error';
import { AuthService } from '../services/auth.service';
import {
  forgotPasswordSchema,
  googleOAuthCallbackSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../validators/auth.validator';

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

  @Post('verify-email')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify an email address with a verification token.' })
  async verifyEmail(@Body(new ZodValidationPipe(verifyEmailSchema)) body: { token: string }) {
    const result = await AuthService.verifyEmail(body.token);
    return ApiResponse.success({
      message: 'Email verified successfully.',
      data: result,
    });
  }

  @Post('resend-verification')
  @HttpCode(200)
  @ApiOperation({ summary: 'Resend the email verification link.' })
  async resendVerification(@Body(new ZodValidationPipe(resendVerificationSchema)) body: { email: string }) {
    await AuthService.resendVerification(body.email);
    return ApiResponse.success({
      message: 'Verification email sent successfully.',
    });
  }

  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Request a password reset link.' })
  async forgotPassword(@Body(new ZodValidationPipe(forgotPasswordSchema)) body: { email: string }) {
    await AuthService.forgotPassword(body.email);
    return ApiResponse.success({
      message: 'If the email exists, a password reset link has been sent.',
    });
  }

  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reset password with a password reset token.' })
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema))
    body: { token: string; newPassword: string }
  ) {
    await AuthService.resetPassword(body.token, body.newPassword);
    return ApiResponse.success({
      message: 'Password reset successfully.',
    });
  }

  @Get('google')
  @ApiOperation({ summary: 'Start Google OAuth authentication.' })
  async googleAuth(@Res() response: any) {
    return response.redirect(AuthService.getGoogleAuthorizationUrl());
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Handle Google OAuth callback.' })
  async googleCallback(
    @Query(new ZodValidationPipe(googleOAuthCallbackSchema))
    query: { code?: string; error?: string }
  ) {
    if (query.error) {
      throw new BadRequestError(`Google OAuth failed: ${query.error}`);
    }

    if (!query.code) {
      throw new BadRequestError('Google OAuth authorization code is required.');
    }

    const result = await AuthService.loginWithGoogleCode(query.code);
    return ApiResponse.success({
      message: 'Google login successful.',
      data: result,
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
