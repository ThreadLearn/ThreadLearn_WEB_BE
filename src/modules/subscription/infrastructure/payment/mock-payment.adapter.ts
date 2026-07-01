import { Injectable } from '@nestjs/common';
import {
  IPaymentGateway,
  PaymentRequestInput,
  PaymentRequestResult,
  PaymentWebhookResult,
} from '../../domain/interfaces/payment-gateway.port';

@Injectable()
export class MockPaymentAdapter implements IPaymentGateway {
  async createPayment(input: PaymentRequestInput): Promise<PaymentRequestResult> {
    const transactionId = input.purchaseId;
    const params = new URLSearchParams({
      transactionId,
      purchaseId: input.purchaseId,
      amount: String(input.amount),
      currency: input.currency,
      description: input.description,
    });

    return {
      transactionId,
      paymentUrl: `/mock-payment/vnpay?${params.toString()}`,
    };
  }

  async verifyWebhook(payload: Record<string, unknown>): Promise<PaymentWebhookResult> {
    const transactionId = String(payload.transactionId ?? payload.vnp_TxnRef ?? '');
    const purchaseId = payload.purchaseId ? String(payload.purchaseId) : undefined;
    const status = String(payload.status ?? '').toLowerCase();
    const responseCode = payload.vnp_ResponseCode ? String(payload.vnp_ResponseCode) : undefined;

    return {
      transactionId,
      purchaseId,
      amount: this.toAmount(payload.amount ?? payload.vnp_Amount),
      succeeded: status === 'success' || responseCode === '00',
      verified: true,
    };
  }

  private toAmount(value: unknown): number | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : undefined;
  }
}
