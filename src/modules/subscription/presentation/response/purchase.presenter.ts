import { Purchase } from '../../domain/entities/purchase.entity';

export class PurchasePresenter {
  static toResponse(purchase: Purchase) {
    const p = purchase.toProps();
    return {
      _id: p.id,
      id: p.id,
      userId: p.userId,
      planId: p.planId,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      transactionId: p.transactionId,
      paymentUrl: p.paymentUrl,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }
}
