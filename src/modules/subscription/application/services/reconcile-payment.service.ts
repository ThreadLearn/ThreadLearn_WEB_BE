import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { PAYMENT_GATEWAY, IPaymentGateway } from '../../domain/interfaces/payment-gateway.port';
import { IPurchaseRepository, PURCHASE_REPOSITORY } from '../../domain/interfaces/purchase.repository';
import { Purchase } from '../../domain/entities/purchase.entity';

/**
 * A signed webhook remains the primary payment signal. This is a secure fallback
 * for a returned PayOS checkout when the gateway webhook was delayed or unavailable.
 */
@Injectable()
export class ReconcilePaymentService {
  constructor(
    @Inject(PURCHASE_REPOSITORY) private readonly purchaseRepository: IPurchaseRepository,
    @Inject(PAYMENT_GATEWAY) private readonly paymentGateway: IPaymentGateway,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(userId: string, purchaseId: string): Promise<Purchase> {
    const purchase = await this.purchaseRepository.findById(purchaseId);
    if (!purchase || purchase.userId !== userId) {
      throw DomainError.notFound(ErrorCode.SUBSCRIPTION_PURCHASE_NOT_FOUND, 'Purchase not found.');
    }
    if (purchase.status !== 'pending' || !purchase.transactionId || !this.paymentGateway.reconcilePayment) {
      return purchase;
    }

    const result = await this.paymentGateway.reconcilePayment(purchase.transactionId);
    const props = purchase.toProps();
    if (result.succeeded && this.amountMatches(props.amount, result.amount)) {
      purchase.markSucceeded(new Date());
      const saved = await this.purchaseRepository.update(purchase);
      this.eventEmitter.emit('payment.succeeded', {
        purchaseId: saved.id,
        userId: saved.userId,
        planId: saved.planId,
      });
      return saved;
    }

    if (result.terminal) {
      purchase.markFailed();
      return this.purchaseRepository.update(purchase);
    }
    return purchase;
  }

  private amountMatches(expected: number, actual?: number): boolean {
    return actual !== undefined && Math.round(expected * 100) === Math.round(actual * 100);
  }
}
