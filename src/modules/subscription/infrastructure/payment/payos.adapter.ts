import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PayOS } from '@payos/node';
import { createHash } from 'crypto';
import {
  IPaymentGateway,
  PaymentRequestInput,
  PaymentRequestResult,
  PaymentReconciliationResult,
  PaymentWebhookResult,
} from '../../domain/interfaces/payment-gateway.port';

interface PayOSPaymentRequest {
  orderCode: number;
  amount: number;
  description: string;
  cancelUrl: string;
  returnUrl: string;
  items?: Array<{ name: string; quantity: number; price: number }>;
}

interface PayOSPaymentResponse {
  checkoutUrl: string;
}

interface PayOSPaymentLink {
  amount: number;
  amountPaid: number;
  status: 'PENDING' | 'CANCELLED' | 'UNDERPAID' | 'PAID' | 'EXPIRED' | 'PROCESSING' | 'FAILED';
}

interface PayOSWebhookPayload {
  success?: boolean;
  data?: Record<string, unknown>;
  signature?: string;
}

interface PayOSWebhookData {
  orderCode: number;
  amount: number;
  code: string;
}

interface PayOSClientLike {
  paymentRequests: {
    create(paymentData: PayOSPaymentRequest): Promise<PayOSPaymentResponse>;
    get(orderCode: number): Promise<PayOSPaymentLink>;
  };
  webhooks: {
    verify(webhook: PayOSWebhookPayload): Promise<PayOSWebhookData>;
    confirm(webhookUrl: string): Promise<unknown>;
  };
}

@Injectable()
export class PayOSAdapter implements IPaymentGateway {
  private client?: PayOSClientLike;

  constructor(private readonly config: ConfigService) {}

  async createPayment(input: PaymentRequestInput): Promise<PaymentRequestResult> {
    const orderCode = this.toOrderCode(input.purchaseId);
    const amount = Math.round(input.amount);
    const description = `TL ${orderCode}`;

    const paymentLink = await this.getClient().paymentRequests.create({
      orderCode,
      amount,
      description,
      cancelUrl: this.withPaymentQuery(this.getConfig('PAYOS_CANCEL_URL'), input, orderCode),
      returnUrl: this.withPaymentQuery(this.getConfig('PAYOS_RETURN_URL'), input, orderCode),
      items: [
        {
          name: this.toItemName(input.description),
          quantity: 1,
          price: amount,
        },
      ],
    });

    return {
      transactionId: String(orderCode),
      paymentUrl: paymentLink.checkoutUrl,
    };
  }

  async verifyWebhook(payload: Record<string, unknown>): Promise<PaymentWebhookResult> {
    const transactionId = this.extractOrderCode(payload);
    try {
      const verifiedData = await this.getClient().webhooks.verify(payload as PayOSWebhookPayload);
      return {
        transactionId: String(verifiedData.orderCode),
        amount: verifiedData.amount,
        succeeded: payload.success !== false && verifiedData.code === '00',
        verified: true,
      };
    } catch {
      return {
        transactionId,
        amount: this.extractAmount(payload),
        succeeded: false,
        verified: false,
      };
    }
  }

  async reconcilePayment(transactionId: string): Promise<PaymentReconciliationResult> {
    const orderCode = Number(transactionId);
    if (!Number.isSafeInteger(orderCode) || orderCode <= 0) {
      throw new Error('Invalid PayOS order code.');
    }

    const paymentLink = await this.getClient().paymentRequests.get(orderCode);
    return {
      amount: paymentLink.amountPaid || paymentLink.amount,
      succeeded: paymentLink.status === 'PAID',
      terminal: ['PAID', 'CANCELLED', 'UNDERPAID', 'EXPIRED', 'FAILED'].includes(paymentLink.status),
    };
  }

  async confirmWebhook(webhookUrl: string): Promise<void> {
    await this.getClient().webhooks.confirm(webhookUrl);
  }

  protected getClient(): PayOSClientLike {
    if (!this.client) {
      this.client = new PayOS({
        clientId: this.getConfig('PAYOS_CLIENT_ID'),
        apiKey: this.getConfig('PAYOS_API_KEY'),
        checksumKey: this.getConfig('PAYOS_CHECKSUM_KEY'),
        partnerCode: this.config.get<string>('PAYOS_PARTNER_CODE') || undefined,
        baseURL: this.config.get<string>('PAYOS_BASE_URL') || undefined,
      });
    }
    return this.client;
  }

  private toOrderCode(purchaseId: string): number {
    const rawHex = purchaseId.replace(/[^a-fA-F0-9]/g, '');
    const source = rawHex.length >= 12
      ? rawHex.slice(-12)
      : createHash('sha256').update(purchaseId).digest('hex').slice(0, 12);
    const orderCode = Number.parseInt(source, 16);
    return orderCode > 0 ? orderCode : Date.now();
  }

  private withPaymentQuery(rawUrl: string, input: PaymentRequestInput, orderCode: number): string {
    const url = new URL(rawUrl);
    url.searchParams.set('purchaseId', input.purchaseId);
    url.searchParams.set('transactionId', String(orderCode));
    url.searchParams.set('gateway', 'payos');
    return url.toString();
  }

  private toItemName(description: string): string {
    return description.replace(/\s+/g, ' ').trim().slice(0, 120) || 'ThreadLearn subscription';
  }

  private extractOrderCode(payload: Record<string, unknown>): string {
    const data = this.asRecord(payload.data);
    const orderCode = data?.orderCode ?? payload.orderCode;
    return orderCode === undefined || orderCode === null ? '' : String(orderCode);
  }

  private extractAmount(payload: Record<string, unknown>): number | undefined {
    const data = this.asRecord(payload.data);
    const amount = data?.amount ?? payload.amount;
    if (amount === undefined || amount === null || amount === '') return undefined;
    const parsed = Number(amount);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private asRecord(value: unknown): Record<string, unknown> | undefined {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : undefined;
  }

  private getConfig(key: string): string {
    const value = this.config.get<string>(key);
    if (!value) {
      throw new Error(`${key} is required for PayOS payment gateway.`);
    }
    return value;
  }
}
