import { ConfigService } from '@nestjs/config';
import { PayOSAdapter } from './payos.adapter';

describe('PayOSAdapter', () => {
  let client: FakePayOSClient;
  let adapter: TestablePayOSAdapter;

  beforeEach(() => {
    client = new FakePayOSClient();
    adapter = new TestablePayOSAdapter(mockConfig(), client);
  });

  it('creates a PayOS payment link and persists orderCode as transactionId', async () => {
    const result = await adapter.createPayment({
      purchaseId: '64b7f5f7c1d2e3f4a5b6c7d8',
      userId: 'student-1',
      amount: 99000,
      currency: 'VND',
      description: 'Purchase subscription plan: Premium Monthly',
    });

    expect(result).toEqual({
      transactionId: expect.stringMatching(/^\d+$/),
      paymentUrl: 'https://pay.payos.vn/checkout/test',
    });

    expect(client.lastPaymentRequest).toMatchObject({
      orderCode: Number(result.transactionId),
      amount: 99000,
      description: `TL ${result.transactionId}`,
      items: [
        {
          name: 'Purchase subscription plan: Premium Monthly',
          quantity: 1,
          price: 99000,
        },
      ],
    });
    expect(client.lastPaymentRequest?.returnUrl).toContain(`purchaseId=64b7f5f7c1d2e3f4a5b6c7d8`);
    expect(client.lastPaymentRequest?.returnUrl).toContain(`transactionId=${result.transactionId}`);
    expect(client.lastPaymentRequest?.returnUrl).toContain('gateway=payos');
    expect(client.lastPaymentRequest?.cancelUrl).toContain('status=cancelled');
  });

  it('verifies a successful PayOS webhook', async () => {
    client.webhookResult = {
      orderCode: 123456,
      amount: 99000,
      code: '00',
    };

    const result = await adapter.verifyWebhook({
      success: true,
      data: client.webhookResult,
      signature: 'valid-signature',
    });

    expect(result).toEqual({
      transactionId: '123456',
      amount: 99000,
      succeeded: true,
      verified: true,
    });
  });

  it('marks webhook verification as failed when PayOS rejects the signature', async () => {
    client.verifyWebhookError = new Error('Data not integrity');

    const result = await adapter.verifyWebhook({
      success: true,
      data: {
        orderCode: 123456,
        amount: 99000,
        code: '00',
      },
      signature: 'invalid-signature',
    });

    expect(result).toEqual({
      transactionId: '123456',
      amount: 99000,
      succeeded: false,
      verified: false,
    });
  });

  it('reconciles a paid PayOS payment link from the gateway API', async () => {
    client.paymentLinkResult = {
      amount: 99000,
      amountPaid: 99000,
      status: 'PAID',
    };

    await expect(adapter.reconcilePayment('123456')).resolves.toEqual({
      amount: 99000,
      succeeded: true,
      terminal: true,
    });
    expect(client.paymentRequests.get).toHaveBeenCalledWith(123456);
  });
});

class TestablePayOSAdapter extends PayOSAdapter {
  constructor(config: ConfigService, private readonly fakeClient: FakePayOSClient) {
    super(config);
  }

  protected override getClient() {
    return this.fakeClient;
  }
}

class FakePayOSClient {
  lastPaymentRequest?: {
    orderCode: number;
    amount: number;
    description: string;
    cancelUrl: string;
    returnUrl: string;
    items?: Array<{ name: string; quantity: number; price: number }>;
  };

  webhookResult = {
    orderCode: 123456,
    amount: 99000,
    code: '00',
  };

  verifyWebhookError?: Error;
  paymentLinkResult: {
    amount: number;
    amountPaid: number;
    status: 'PENDING' | 'CANCELLED' | 'UNDERPAID' | 'PAID' | 'EXPIRED' | 'PROCESSING' | 'FAILED';
  } = {
    amount: 99000,
    amountPaid: 0,
    status: 'PENDING' as const,
  };

  paymentRequests = {
    create: jest.fn(async (paymentData: FakePayOSClient['lastPaymentRequest']) => {
      this.lastPaymentRequest = paymentData;
      return { checkoutUrl: 'https://pay.payos.vn/checkout/test' };
    }),
    get: jest.fn(async () => this.paymentLinkResult),
  };

  webhooks = {
    verify: jest.fn(async () => {
      if (this.verifyWebhookError) throw this.verifyWebhookError;
      return this.webhookResult;
    }),
    confirm: jest.fn(async () => ({})),
  };
}

function mockConfig(): ConfigService {
  return {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        PAYOS_CLIENT_ID: 'client-id',
        PAYOS_API_KEY: 'api-key',
        PAYOS_CHECKSUM_KEY: 'checksum-key',
        PAYOS_RETURN_URL: 'http://localhost:3001/pricing/callback',
        PAYOS_CANCEL_URL: 'http://localhost:3001/pricing/callback?status=cancelled',
      };
      return values[key];
    }),
  } as unknown as ConfigService;
}
