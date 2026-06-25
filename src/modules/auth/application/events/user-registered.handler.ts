import { Inject, Injectable } from '@nestjs/common';
import {
  IUserStatsProvisioner,
  USER_STATS_PROVISIONER,
} from '../../domain/interfaces/user-stats-provisioner.port';
import { UserRegisteredEvent } from '../../domain/events/user-registered.event';

/**
 * Side-effect handler khi có user mới (register email/password HOẶC Google user mới).
 *
 * Mục tiêu: khôi phục parity legacy — user mới phải có bản ghi `UserStats` —
 * mà KHÔNG để application use-case (`RegisterUserService`/`GoogleLoginService`)
 * import model UserStats. Use-case gọi handler này; handler gọi `IUserStatsProvisioner`
 * (hiện thực ở infrastructure).
 *
 * CAVEAT (ghi rõ trong docs): repo hiện CHƯA có event bus toàn cục
 * (`@nestjs/event-emitter` không có). Vì vậy use-case gọi handler **trực tiếp**
 * như một application side-effect service. Khi có event bus ở phase cleanup, đổi
 * sang subscribe `UserRegisteredEvent` để decouple hoàn toàn — interface giữ nguyên.
 *
 * KHÔNG log dữ liệu nhạy cảm (email/token/password). Lỗi provisioning KHÔNG được
 * làm hỏng luồng đăng ký/đăng nhập (eventual consistency) — use-case quyết định
 * cách nuốt lỗi khi gọi.
 */
@Injectable()
export class UserRegisteredHandler {
  constructor(
    @Inject(USER_STATS_PROVISIONER)
    private readonly userStatsProvisioner: IUserStatsProvisioner,
  ) {}

  /** Xử lý từ domain event (dùng khi đã có event bus). */
  async handle(event: UserRegisteredEvent): Promise<void> {
    await this.userStatsProvisioner.ensureForUser(event.userId);
  }

  /** Gọi trực tiếp từ use-case (chưa có event bus). Idempotent qua provisioner. */
  async onUserRegistered(userId: string): Promise<void> {
    await this.userStatsProvisioner.ensureForUser(userId);
  }
}
