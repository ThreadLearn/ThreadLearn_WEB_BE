import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address format.'),
  password: z.string().min(6, 'Password must be at least 6 characters long.'),
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address format.'),
  password: z.string().min(1, 'Password is required.'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required.'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required.'),
});

export const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address format.'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address format.'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Password reset token is required.'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters long.'),
});
