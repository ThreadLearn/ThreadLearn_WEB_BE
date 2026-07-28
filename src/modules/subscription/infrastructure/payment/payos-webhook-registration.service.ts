import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PayOSAdapter } from './payos.adapter';

@Injectable()
export class PayOSWebhookRegistrationService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PayOSWebhookRegistrationService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly payOS: PayOSAdapter,
  ) {}

  onApplicationBootstrap(): void {
    // Nest invokes this lifecycle hook before main.ts finishes app.listen().
    // Deferring lets PayOS validate the public tunnel only after HTTP is ready.
    setTimeout(() => void this.registerWebhook(), 500);
  }

  private async registerWebhook(): Promise<void> {
    if (this.config.get<string>('PAYMENT_GATEWAY_MODE', 'mock').toLowerCase() !== 'payos') return;

    const webhookUrl = this.config.get<string>('PAYOS_WEBHOOK_URL');
    if (!webhookUrl) {
      this.logger.warn('PAYOS_WEBHOOK_URL is not configured; PayOS payment updates require reconciliation.');
      return;
    }

    try {
      await this.payOS.confirmWebhook(webhookUrl);
      this.logger.log(`PayOS webhook registered: ${webhookUrl}`);
    } catch (error) {
      this.logger.error('Could not register the PayOS webhook URL.', error instanceof Error ? error.stack : error);
    }
  }
}
