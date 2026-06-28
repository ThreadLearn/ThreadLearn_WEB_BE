export interface PaymentRequestInput {
  purchaseId: string;
  userId: string;
  amount: number;
  currency: string;
  description: string;
}

export interface PaymentRequestResult {
  transactionId: string;
  paymentUrl: string;
}

export interface PaymentWebhookResult {
  transactionId: string;
  purchaseId?: string;
  succeeded: boolean;
}

export interface IPaymentGateway {
  createPayment(input: PaymentRequestInput): Promise<PaymentRequestResult>;
  verifyWebhook(payload: Record<string, unknown>): Promise<PaymentWebhookResult>;
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');
