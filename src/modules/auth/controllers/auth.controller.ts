import { Controller, Post, Get, Body, HttpCode, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import {
  RegisterDto, LoginDto, RefreshDto, LogoutDto,
  ForgotPasswordDto, ResetPasswordDto,
} from '../dto/auth.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const data = await this.authService.register(dto);
    return { message: 'User registered successfully.', data, statusCode: 201 };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    const data = await this.authService.login(dto);
    return { message: 'Login successful.', data };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() dto: RefreshDto) {
    const data = await this.authService.refresh(dto.refreshToken);
    return { message: 'Tokens refreshed successfully.', data };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Body() dto: LogoutDto) {
    await this.authService.logout(dto.refreshToken);
    return { message: 'Logged out successfully.' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  me(@CurrentUser() user: JwtPayload) {
    return { message: 'Session user retrieved.', data: { user } };
  }

  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { message: 'If the email exists, a reset link has been sent.' };
  }

  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Password has been reset successfully.' };
  }

  /**
   * Google OAuth placeholder. Full implementation requires `passport-google-oauth20`
   * and Google Cloud credentials — out of DEV3 scope. Returns 501 to make the
   * FE behavior explicit instead of a misleading 404.
   */
  @Get('verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'UC03 — verify email via token (stub).' })
  verifyEmail(@Body() _body?: any) {
    // Mock-friendly: real verification needs email provider; accept any token in dev.
    return { message: 'Email verified.', data: { verified: true } };
  }

  @Get('google')
  @HttpCode(501)
  google() {
    return {
      message: 'Google OAuth is not configured yet. Please use email/password login.',
      statusCode: 501,
    };
  }
}
