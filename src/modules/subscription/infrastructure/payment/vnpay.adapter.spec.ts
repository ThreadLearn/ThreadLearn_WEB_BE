import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { VNPayAdapter } from './vnpay.adapter';

describe('VNPayAdapter.verifyWebhook', () => {
  const hashSecret = 'test-vnpay-secret';
  let adapter: VNPayAdapter;

  beforeEach(() => {
    const config = {
      get: jest.fn((key: string, defaultValue?: string) => {
        const values: Record<string, string> = {
          VNP_HASH_SECRET: hashSecret,
          VNP_TMN_CODE: 'TESTTMN',
          VNP_RETURN_URL: 'http://localhost:3000/subscription/payment-return',
          VNP_URL: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
        };
        return values[key] ?? defaultValue;
      }),
    } as unknown as ConfigService;

    adapter = new VNPayAdapter(config);
  });

  it('returns succeeded=true when secure hash is valid and VNPay status codes are successful', async () => {
    const payload = withSecureHash({
      vnp_Amount: '9900000',
      vnp_ResponseCode: '00',
      vnp_TmnCode: 'TESTTMN',
      vnp_TransactionStatus: '00',
      vnp_TxnRef: 'purchase-123',
    });

    const result = await adapter.verifyWebhook(payload);

    expect(result).toEqual({
      transactionId: 'purchase-123',
      purchaseId: 'purchase-123',
      amount: 99000,
      succeeded: true,
      verified: true,
    });
  });

  it('returns succeeded=false when a signed field is tampered with', async () => {
    const payload = withSecureHash({
      vnp_Amount: '9900000',
      vnp_ResponseCode: '00',
      vnp_TmnCode: 'TESTTMN',
      vnp_TransactionStatus: '00',
      vnp_TxnRef: 'purchase-123',
    });

    const result = await adapter.verifyWebhook({
      ...payload,
      vnp_Amount: '19900000',
    });

    expect(result.succeeded).toBe(false);
    expect(result.verified).toBe(false);
  });

  it('returns succeeded=false when vnp_SecureHash is missing', async () => {
    const result = await adapter.verifyWebhook({
      vnp_Amount: '9900000',
      vnp_ResponseCode: '00',
      vnp_TmnCode: 'TESTTMN',
      vnp_TransactionStatus: '00',
      vnp_TxnRef: 'purchase-123',
    });

    expect(result.succeeded).toBe(false);
    expect(result.verified).toBe(false);
  });

  function withSecureHash(payload: Record<string, string>): Record<string, string> {
    return {
      ...payload,
      vnp_SecureHash: sign(payload),
    };
  }

  function sign(payload: Record<string, string>): string {
    return createHmac('sha512', hashSecret).update(toQueryString(payload), 'utf8').digest('hex');
  }

  function toQueryString(payload: Record<string, string>): string {
    const params = new URLSearchParams();
    Object.keys(payload)
      .sort()
      .forEach((key) => params.append(key, payload[key]));
    return params.toString();
  }
});
