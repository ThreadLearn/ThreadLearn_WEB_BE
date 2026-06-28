import { Purchase } from '../entities/purchase.entity';

export interface IPurchaseRepository {
  findById(id: string): Promise<Purchase | null>;
  findByTransactionId(transactionId: string): Promise<Purchase | null>;
  create(purchase: Purchase): Promise<Purchase>;
  update(purchase: Purchase): Promise<Purchase>;
}

export const PURCHASE_REPOSITORY = Symbol('PURCHASE_REPOSITORY');
