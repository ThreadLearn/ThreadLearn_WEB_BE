// src/modules/auth/schemas/refresh-token.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class RefreshToken {
  @Prop({ type: String, required: true, unique: true, index: true })
  token!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ type: Date, required: true })
  expiresAt!: Date;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

// Bảo toàn TTL index từ model cũ: tự xoá document khi expiresAt qua mốc.
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
