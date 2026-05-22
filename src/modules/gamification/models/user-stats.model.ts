import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserStats extends Document {
  userId: mongoose.Types.ObjectId;
  xp: number;
  level: number;
  currentStreak: number;
  highestStreak: number;
  quizzesCompleted: number;
  coursesCompleted: number;
  lastActiveDate: Date;
  updatedAt: Date;
}

const UserStatsSchema: Schema<IUserStats> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    xp: { type: Number, default: 0, index: true },
    level: { type: Number, default: 1 },
    currentStreak: { type: Number, default: 0 },
    highestStreak: { type: Number, default: 0 },
    quizzesCompleted: { type: Number, default: 0 },
    coursesCompleted: { type: Number, default: 0 },
    lastActiveDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const UserStats: Model<IUserStats> =
  mongoose.models.UserStats || mongoose.model<IUserStats>('UserStats', UserStatsSchema);
export default UserStats;
