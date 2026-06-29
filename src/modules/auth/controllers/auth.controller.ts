import { Body, Controller, Get, HttpCode, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../../common/api-response';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/api-handler';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { BadRequestError } from '../../../common/custom-error';
import { env } from '../../../configs/env';
import {
  RefreshTokenService,
  LogoutService,
  GetSessionService,
  VerifyEmailService,
  ResendVerificationEmailService,
  ForgotPasswordService,
  ResetPasswordService,
  RegisterUserService,
  LoginUserService,
  GetGoogleAuthUrlService,
  HandleGoogleCallbackService,
} from '../application/services';
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
  /**
   * DEV1.4C-1: session/logout/refresh → use-case.
   * DEV1.4C-2: verify-email/resend-verification/forgot-password/reset-password → use-case.
   * DEV1.4C-3: register/login → use-case.
   * DEV1.4C-4: google/google-callback → use-case.
   * Toàn bộ request flow của AuthController KHÔNG còn gọi `AuthService` legacy.
   */
  constructor(
    private readonly refreshTokenService: RefreshTokenService,
    private readonly logoutService: LogoutService,
    private readonly getSessionService: GetSessionService,
    private readonly verifyEmailService: VerifyEmailService,
    private readonly resendVerificationEmailService: ResendVerificationEmailService,
    private readonly forgotPasswordService: ForgotPasswordService,
    private readonly resetPasswordService: ResetPasswordService,
    private readonly registerUserService: RegisterUserService,
    private readonly loginUserService: LoginUserService,
    private readonly getGoogleAuthUrlService: GetGoogleAuthUrlService,
    private readonly handleGoogleCallbackService: HandleGoogleCallbackService,
  ) {}

  @Post('register')
  async register(
    @Body(new ZodValidationPipe(registerSchema))
    body: { email: string; password: string; firstName: string; lastName: string }
  ) {
    const result = await this.registerUserService.execute(body);
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
    const result = await this.verifyEmailService.execute({ token: body.token });
    return ApiResponse.success({
      message: 'Email verified successfully.',
      data: result,
    });
  }

  @Post('resend-verification')
  @HttpCode(200)
  @ApiOperation({ summary: 'Resend the email verification link.' })
  async resendVerification(@Body(new ZodValidationPipe(resendVerificationSchema)) body: { email: string }) {
    await this.resendVerificationEmailService.execute({ email: body.email });
    return ApiResponse.success({
      message: 'Verification email sent successfully.',
    });
  }

  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Request a password reset link.' })
  async forgotPassword(@Body(new ZodValidationPipe(forgotPasswordSchema)) body: { email: string }) {
    await this.forgotPasswordService.execute({ email: body.email });
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
    await this.resetPasswordService.execute({ token: body.token, newPassword: body.newPassword });
    return ApiResponse.success({
      message: 'Password reset successfully.',
    });
  }

  @Get('google')
  @ApiOperation({ summary: 'Start Google OAuth authentication.' })
  async googleAuth(@Res() response: any) {
    const { url } = this.getGoogleAuthUrlService.execute();
    return response.redirect(url);
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Handle Google OAuth callback.' })
  async googleCallback(
    @Query(new ZodValidationPipe(googleOAuthCallbackSchema))
    query: { code?: string; error?: string },
    @Res() response: any
  ) {
    if (query.error) {
      return this.redirectGoogleFailure(response, `Google OAuth failed: ${query.error}`);
    }

    if (!query.code) {
      return this.redirectGoogleFailure(response, 'Google OAuth authorization code is required.');
    }

    try {
      const result = await this.handleGoogleCallbackService.execute({ code: query.code });
      const redirectUrl = new URL(
        env.FRONTEND_AUTH_SUCCESS_REDIRECT_URL || 'http://localhost:3000/auth/callback'
      );
      redirectUrl.searchParams.set('accessToken', result.accessToken);
      redirectUrl.searchParams.set('refreshToken', result.refreshToken);
      redirectUrl.searchParams.set('user', JSON.stringify(result.user));

      return response.redirect(redirectUrl.toString());
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Google OAuth failed.';
      return this.redirectGoogleFailure(response, message);
    }
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body(new ZodValidationPipe(loginSchema)) body: { email: string; password: string }) {
    const result = await this.loginUserService.execute(body);
    return ApiResponse.success({
      message: 'Login successful.',
      data: result,
    });
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body(new ZodValidationPipe(refreshTokenSchema)) body: { refreshToken: string }) {
    const result = await this.refreshTokenService.execute({ refreshToken: body.refreshToken });
    return ApiResponse.success({
      message: 'Tokens refreshed successfully.',
      data: result,
    });
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Body(new ZodValidationPipe(refreshTokenSchema)) body: { refreshToken: string }) {
    await this.logoutService.execute({ refreshToken: body.refreshToken });
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
    const result = await this.getSessionService.execute({ userId: user.id });
    return ApiResponse.success({
      message: 'User context retrieved successfully.',
      data: { user: result.user },
    });
  }

  private redirectGoogleFailure(response: any, message: string) {
    const redirectUrl = new URL(env.FRONTEND_AUTH_FAILURE_REDIRECT_URL || 'http://localhost:3000/login');
    redirectUrl.searchParams.set('error', message);
    return response.redirect(redirectUrl.toString());
  }
}

export default AuthController;
