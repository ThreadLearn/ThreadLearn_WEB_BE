import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash?: string;
  firstName: string;
  lastName: string;
  role: 'STUDENT' | 'ADMIN';
  avatarUrl?: string;
  googleId?: string;
  githubId?: string;
  isPremium: boolean;
  resetPasswordToken?: string;
  resetPasswordExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    email:        { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    firstName:    { type: String, required: true, trim: true },
    lastName:     { type: String, required: true, trim: true },
    role:         { type: String, enum: ['STUDENT', 'ADMIN'], default: 'STUDENT' },
    avatarUrl:    { type: String },
    googleId:     { type: String, unique: true, sparse: true },
    githubId:     { type: String, unique: true, sparse: true },
    isPremium:    { type: Boolean, default: false },
    resetPasswordToken:     { type: String, index: true },
    resetPasswordExpiresAt: { type: Date },
  },
  { timestamps: true },
);

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export default User;
export { UserSchema };
