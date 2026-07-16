import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash?: string;
  firstName: string;
  lastName: string;
  role: 'STUDENT' | 'ADMIN';
  planType?: 'FREE' | 'PREMIUM';
  subscriptionExpiresAt?: Date;
  avatarUrl?: string;
  googleId?: string;
  githubId?: string;
  isVerified: boolean;
  emailVerifiedAt?: Date;
  emailVerificationCodeHash?: string;
  emailVerificationCodeExpiresAt?: Date;
  emailVerificationCodeAttempts?: number;
  emailVerificationLastSentAt?: Date;
  isActive: boolean;
  lockedAt?: Date;
  lockedReason?: string;
  failedLoginAttempts?: number;
  lockedUntil?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    role: { type: String, enum: ['STUDENT', 'ADMIN'], default: 'STUDENT' },
    planType: { type: String, enum: ['FREE', 'PREMIUM'], default: 'FREE' },
    subscriptionExpiresAt: { type: Date },
    avatarUrl: { type: String },
    googleId: { type: String, unique: true, sparse: true },
    githubId: { type: String, unique: true, sparse: true },
    isVerified: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date },
    emailVerificationCodeHash: { type: String },
    emailVerificationCodeExpiresAt: { type: Date },
    emailVerificationCodeAttempts: { type: Number, default: 0, min: 0 },
    emailVerificationLastSentAt: { type: Date },
    isActive: { type: Boolean, default: true },
    lockedAt: { type: Date },
    lockedReason: { type: String, trim: true },
    failedLoginAttempts: { type: Number, default: 0, min: 0 },
    lockedUntil: { type: Date },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export default User;
