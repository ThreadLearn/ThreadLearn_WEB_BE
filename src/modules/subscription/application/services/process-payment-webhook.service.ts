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
    const purchase = result.purchaseId
      ? await this.purchaseRepository.findById(result.purchaseId)
      : await this.purchaseRepository.findByTransactionId(result.transactionId);

    if (!purchase) {
      throw DomainError.notFound(ErrorCode.SUBSCRIPTION_PURCHASE_NOT_FOUND, 'Purchase not found.');
    }

    if (result.succeeded) {
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
}
