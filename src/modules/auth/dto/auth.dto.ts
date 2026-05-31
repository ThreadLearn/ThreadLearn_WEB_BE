import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsEmail()  email!: string;
  @IsString() @MinLength(6) password!: string;
  @IsString() firstName!: string;
  @IsString() lastName!: string;
}

export class LoginDto {
  @IsEmail()  email!: string;
  @IsString() password!: string;
}

export class RefreshDto {
  @IsString() refreshToken!: string;
}

export class LogoutDto {
  @IsOptional() @IsString() refreshToken?: string;
}

export class ForgotPasswordDto {
  @IsEmail() email!: string;
}

export class ResetPasswordDto {
  @IsString() token!: string;
  @IsString() @MinLength(6) newPassword!: string;
}
