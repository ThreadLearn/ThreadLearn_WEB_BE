import { Inject, Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { Purchase } from '../../domain/entities/purchase.entity';
import { IPurchaseRepository, PURCHASE_REPOSITORY } from '../../domain/interfaces/purchase.repository';

@Injectable()
export class GetMyPurchaseService {
  constructor(
    @Inject(PURCHASE_REPOSITORY) private readonly purchaseRepository: IPurchaseRepository,
  ) {}

  async execute(userId: string, purchaseId: string): Promise<Purchase> {
    const purchase = await this.purchaseRepository.findById(purchaseId);
    if (!purchase || purchase.toProps().userId !== userId) {
      throw DomainError.notFound(ErrorCode.SUBSCRIPTION_PURCHASE_NOT_FOUND, 'Purchase not found.');
    }
    return purchase;
  }
}
