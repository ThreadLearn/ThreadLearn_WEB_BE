import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { PAYMENT_GATEWAY, IPaymentGateway } from '../../domain/interfaces/payment-gateway.port';
import { IPurchaseRepository, PURCHASE_REPOSITORY } from '../../domain/interfaces/purchase.repository';
import { PaymentWebhookDto } from '../dto/plan.dto';

@Injectable()
export class ProcessPaymentWebhookService {
  constructor(
    @Inject(PURCHASE_REPOSITORY) private readonly purchaseRepository: IPurchaseRepository,
    @Inject(PAYMENT_GATEWAY) private readonly paymentGateway: IPaymentGateway,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(payload: PaymentWebhookDto) {
    const result = await this.paymentGateway.verifyWebhook(payload);
    if (result.verified === false) {
      throw DomainError.badRequest(ErrorCode.SUBSCRIPTION_PURCHASE_INVALID_INPUT, 'Payment webhook verification failed.');
    }

    const purchase = result.purchaseId
      ? await this.purchaseRepository.findById(result.purchaseId)
      : await this.purchaseRepository.findByTransactionId(result.transactionId);

    if (!purchase) {
      // PayOS sends a signed validation request when registering the webhook URL.
      // A verified event without a local purchase must be acknowledged, not activated.
      return null;
    }

    const purchaseProps = purchase.toProps();
    if (purchaseProps.status === 'succeeded' || purchaseProps.status === 'failed') {
      return purchase;
    }

    if (result.succeeded && this.amountMatches(purchaseProps.amount, result.amount)) {
      purchase.markSucceeded(new Date());
      const saved = await this.purchaseRepository.update(purchase);
      this.eventEmitter.emit('payment.succeeded', {
        purchaseId: saved.id,
        userId: saved.userId,
        planId: saved.planId,
      });
      return saved;
    }

    purchase.markFailed();
    return this.purchaseRepository.update(purchase);
  }

  private amountMatches(expected: number, actual?: number): boolean {
    if (actual === undefined) return true;
    return Math.round(expected * 100) === Math.round(actual * 100);
  }
}
