import { Injectable } from '@nestjs/common';
import mongoose from 'mongoose';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { Purchase } from '../../domain/entities/purchase.entity';
import { IPurchaseRepository } from '../../domain/interfaces/purchase.repository';
import { PurchaseMapper } from '../mapper/purchase.mapper';
import { PurchaseModel } from './schemas/purchase.schema';

@Injectable()
export class MongoPurchaseRepository implements IPurchaseRepository {
  async findById(id: string): Promise<Purchase | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await PurchaseModel.findById(id);
    return doc ? PurchaseMapper.toEntity(doc) : null;
  }

  async findByTransactionId(transactionId: string): Promise<Purchase | null> {
    const doc = await PurchaseModel.findOne({ transactionId });
    return doc ? PurchaseMapper.toEntity(doc) : null;
  }

  async create(purchase: Purchase): Promise<Purchase> {
    const doc = await PurchaseModel.create(PurchaseMapper.toPersistence(purchase));
    return PurchaseMapper.toEntity(doc);
  }

  async update(purchase: Purchase): Promise<Purchase> {
    const doc = await PurchaseModel.findByIdAndUpdate(purchase.id, PurchaseMapper.toPersistence(purchase), {
      new: true,
      runValidators: true,
    });
    if (!doc) {
      throw DomainError.notFound(ErrorCode.SUBSCRIPTION_PURCHASE_NOT_FOUND, 'Purchase not found.');
    }
    return PurchaseMapper.toEntity(doc);
  }
}
