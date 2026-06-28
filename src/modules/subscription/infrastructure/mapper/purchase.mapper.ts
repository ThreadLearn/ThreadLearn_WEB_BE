import { Purchase } from '../../domain/entities/purchase.entity';

export class PurchaseMapper {
  static toEntity(doc: any): Purchase {
    return Purchase.fromPersistence({
      id: String(doc._id),
      userId: String(doc.userId),
      planId: String(doc.planId),
      amount: doc.amount,
      currency: doc.currency,
      status: doc.status,
      transactionId: doc.transactionId,
      paymentUrl: doc.paymentUrl,
      paidAt: doc.paidAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  static toPersistence(purchase: Purchase): Record<string, any> {
    const p = purchase.toProps();
    return {
      userId: p.userId,
      planId: p.planId,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      transactionId: p.transactionId,
      paymentUrl: p.paymentUrl,
      paidAt: p.paidAt,
    };
  }
}
