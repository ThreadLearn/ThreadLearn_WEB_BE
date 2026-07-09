/**
 * PORT: gửi email mời student do admin tạo (UC10). Adapter (infrastructure) wrap
 * `EmailService.sendStudentInvitationEmail` hiện tại — giữ nguyên SMTP/mock/retry behavior.
 *
 * Đây là port RIÊNG cho invitation, KHÔNG thay thế toàn bộ `EmailService` (verification/reset
 * vẫn đi qua port `EMAIL_SENDER` của auth). Domain/application chỉ biết interface này.
 *
 * Lưu ý bảo mật: `temporaryPassword` là dữ liệu nhạy cảm — adapter KHÔNG log/expose, chỉ
 * forward cho email implementation.
 */
export interface SendStudentInvitationInput {
  email: string;
  firstName: string;
  lastName: string;
  temporaryPassword: string;
}

export interface IInvitationEmail {
  /** Gửi email mời student (tài khoản + mật khẩu tạm). Side-effect đi qua adapter. */
  sendStudentInvitation(input: SendStudentInvitationInput): Promise<void>;
}

/** DI token cho `IInvitationEmail`. */
export const INVITATION_EMAIL = Symbol('INVITATION_EMAIL');
