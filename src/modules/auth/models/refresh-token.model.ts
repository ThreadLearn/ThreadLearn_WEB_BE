import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRefreshToken extends Document {
  /**
   * @deprecated Legacy raw refresh token. Retained only for backward
   * compatibility with records created before token hashing. New records store
   * `tokenHash` instead and leave this unset.
   */
  token?: string;
  /** SHA-256 hash of the refresh token. Preferred storage — the raw token is never persisted. */
  tokenHash?: string;
  userId: mongoose.Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
}

const RefreshTokenSchema: Schema<IRefreshToken> = new Schema(
  {
    // Sparse + unique so hash-only records (token unset) do not collide.
    token: { type: String, unique: true, sparse: true, index: true },
    tokenHash: { type: String, unique: true, sparse: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken: Model<IRefreshToken> =
  mongoose.models.RefreshToken || mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);
export default RefreshToken;
