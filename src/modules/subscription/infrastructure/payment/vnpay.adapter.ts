import { Injectable } from '@nestjs/common';
import {
  IPaymentGateway,
  PaymentRequestInput,
  PaymentRequestResult,
  PaymentWebhookResult,
} from '../../domain/interfaces/payment-gateway.port';

@Injectable()
export class VNPayAdapter implements IPaymentGateway {
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
      succeeded: status === 'success' || responseCode === '00',
    };
  }
}
