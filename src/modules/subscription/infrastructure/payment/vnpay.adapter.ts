import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import {
  IPaymentGateway,
  PaymentRequestInput,
  PaymentRequestResult,
  PaymentWebhookResult,
} from '../../domain/interfaces/payment-gateway.port';

@Injectable()
export class VNPayAdapter implements IPaymentGateway {
  constructor(private readonly config: ConfigService) {}

  async createPayment(input: PaymentRequestInput): Promise<PaymentRequestResult> {
    const transactionId = input.purchaseId;
    const params = this.buildPaymentParams(input, transactionId);
    const secureHash = this.sign(params);
    const paymentUrl = `${this.getConfig('VNP_URL')}?${this.toQueryString({
      ...params,
      vnp_SecureHash: secureHash,
    })}`;

    return {
      transactionId,
      paymentUrl,
    };
  }

  async verifyWebhook(payload: Record<string, unknown>): Promise<PaymentWebhookResult> {
    const transactionId = this.toString(payload.vnp_TxnRef);
    const secureHash = this.toString(payload.vnp_SecureHash);
    if (!secureHash) {
      return { transactionId, purchaseId: transactionId || undefined, succeeded: false, verified: false };
    }

    const signedPayload = this.extractSignedPayload(payload);
    const expectedHash = this.sign(signedPayload);
    const verified = this.secureCompare(expectedHash, secureHash);
    if (!verified) {
      return {
        transactionId,
        purchaseId: transactionId || undefined,
        amount: this.parseVnpAmount(payload.vnp_Amount),
        succeeded: false,
        verified: false,
      };
    }

    const responseCode = this.toString(payload.vnp_ResponseCode);
    const transactionStatus = this.toString(payload.vnp_TransactionStatus);

    return {
      transactionId,
      purchaseId: transactionId || undefined,
      amount: this.parseVnpAmount(payload.vnp_Amount),
      succeeded: responseCode === '00' && transactionStatus === '00',
      verified: true,
    };
  }

  private buildPaymentParams(input: PaymentRequestInput, transactionId: string): Record<string, string> {
    return {
      vnp_Amount: String(Math.round(input.amount * 100)),
      vnp_Command: 'pay',
      vnp_CreateDate: this.formatDate(new Date()),
      vnp_CurrCode: input.currency || 'VND',
      vnp_IpAddr: this.config.get<string>('VNP_IP_ADDR') || '127.0.0.1',
      vnp_Locale: this.config.get<string>('VNP_LOCALE') || 'vn',
      vnp_OrderInfo: input.description,
      vnp_OrderType: this.config.get<string>('VNP_ORDER_TYPE') || 'other',
      vnp_ReturnUrl: this.getConfig('VNP_RETURN_URL'),
      vnp_TmnCode: this.getConfig('VNP_TMN_CODE'),
      vnp_TxnRef: transactionId,
      vnp_Version: this.config.get<string>('VNP_VERSION') || '2.1.0',
    };
  }

  private extractSignedPayload(payload: Record<string, unknown>): Record<string, string> {
    return Object.entries(payload).reduce<Record<string, string>>((acc, [key, value]) => {
      if (!key.startsWith('vnp_')) return acc;
      if (key === 'vnp_SecureHash' || key === 'vnp_SecureHashType') return acc;
      if (value === undefined || value === null) return acc;
      acc[key] = String(value);
      return acc;
    }, {});
  }

  private sign(params: Record<string, string>): string {
    return createHmac('sha512', this.getConfig('VNP_HASH_SECRET'))
      .update(this.toQueryString(params), 'utf8')
      .digest('hex');
  }

  private toQueryString(params: Record<string, string>): string {
    const searchParams = new URLSearchParams();
    Object.keys(params)
      .sort()
      .forEach((key) => searchParams.append(key, params[key]));
    return searchParams.toString();
  }

  private secureCompare(expectedHash: string, actualHash: string): boolean {
    if (!/^[a-fA-F0-9]+$/.test(actualHash)) return false;
    const expected = Buffer.from(expectedHash, 'hex');
    const actual = Buffer.from(actualHash, 'hex');
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  private parseVnpAmount(value: unknown): number | undefined {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount / 100 : undefined;
  }

  private formatDate(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate()),
      pad(date.getHours()),
      pad(date.getMinutes()),
      pad(date.getSeconds()),
    ].join('');
  }

  private toString(value: unknown): string {
    return value === undefined || value === null ? '' : String(value);
  }

  private getConfig(key: string): string {
    const value = this.config.get<string>(key);
    if (!value) {
      throw new Error(`${key} is required for VNPay payment gateway.`);
    }
    return value;
  }
}
