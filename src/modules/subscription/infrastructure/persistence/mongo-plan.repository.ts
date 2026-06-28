import { Injectable } from '@nestjs/common';
import mongoose from 'mongoose';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { Plan } from '../../domain/entities/plan.entity';
import { IPlanRepository } from '../../domain/interfaces/plan.repository';
import { PlanMapper } from '../mapper/plan.mapper';
import { PlanModel } from './schemas/plan.schema';

@Injectable()
export class MongoPlanRepository implements IPlanRepository {
  async findById(id: string): Promise<Plan | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await PlanModel.findById(id);
    return doc ? PlanMapper.toEntity(doc) : null;
  }

  async findByName(name: string): Promise<Plan | null> {
    const doc = await PlanModel.findOne({ name: name.trim() });
    return doc ? PlanMapper.toEntity(doc) : null;
  }

  async list(includeInactive = false): Promise<Plan[]> {
    const filter = includeInactive ? {} : { isActive: true };
    const docs = await PlanModel.find(filter).sort({ price: 1, createdAt: -1 });
    return docs.map((doc) => PlanMapper.toEntity(doc));
  }

  async create(plan: Plan): Promise<Plan> {
    const doc = await PlanModel.create(PlanMapper.toPersistence(plan));
    return PlanMapper.toEntity(doc);
  }

  async update(plan: Plan): Promise<Plan> {
    const doc = await PlanModel.findByIdAndUpdate(plan.id, PlanMapper.toPersistence(plan), {
      new: true,
      runValidators: true,
    });
    if (!doc) {
      throw DomainError.notFound(ErrorCode.SUBSCRIPTION_PLAN_NOT_FOUND, 'Subscription plan not found.');
    }
    return PlanMapper.toEntity(doc);
  }
}
