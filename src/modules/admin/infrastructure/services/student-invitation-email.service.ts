import { Injectable } from '@nestjs/common';
import { EmailService } from '../../../auth/services/email.service';
import {
  IInvitationEmail,
  SendStudentInvitationInput,
} from '../../domain/interfaces/invitation-email.port';

/**
 * Adapter cho `IInvitationEmail` — wrap `EmailService.sendStudentInvitationEmail` (auth).
 *
 * GIỮ NGUYÊN legacy behavior: SMTP/mock-log detection, fire-and-forget + exponential-backoff
 * retry, swallow lỗi SMTP (không surface cho caller) — tất cả nằm trong `EmailService`.
 * Adapter chỉ forward, KHÔNG đổi implementation, KHÔNG log/expose `temporaryPassword`.
 *
 * Lưu ý: port nhận thêm `lastName` (cho tương lai); `EmailService` hiện chỉ dùng
 * `email`/`firstName`/`temporaryPassword` ⇒ chỉ forward đúng tập đó (không đổi email content).
 */
@Injectable()
export class StudentInvitationEmailService implements IInvitationEmail {
  async sendStudentInvitation(input: SendStudentInvitationInput): Promise<void> {
    const { email, firstName, temporaryPassword } = input;
    await EmailService.sendStudentInvitationEmail({ email, firstName, temporaryPassword });
  }
}
