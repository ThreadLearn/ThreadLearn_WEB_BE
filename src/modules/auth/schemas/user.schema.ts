// src/modules/auth/schemas/user.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserRole = 'STUDENT' | 'ADMIN';
export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({
    type: String,
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    trim: true,
  })
  email!: string;

  @Prop({ type: String })
  passwordHash?: string;

  @Prop({ type: String, required: true, trim: true })
  firstName!: string;

  @Prop({ type: String, required: true, trim: true })
  lastName!: string;

  @Prop({ type: String, enum: ['STUDENT', 'ADMIN'], default: 'STUDENT' })
  role!: UserRole;

  @Prop({ type: String })
  avatarUrl?: string;

  @Prop({ type: String, unique: true, sparse: true })
  googleId?: string;

  @Prop({ type: String, unique: true, sparse: true })
  githubId?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
