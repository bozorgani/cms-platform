import mongoose, { Schema, Model } from 'mongoose';
import type { UserRole } from '@/lib/constants';

export interface IUser {
  _id?: string;
  email: string;
  passwordHash: string;
  name?: string;
  role: UserRole;
  totpSecret?: string;
  backupCodes?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String, trim: true },
    role: {
      type: String,
      enum: ['admin', 'editor', 'author', 'seo', 'viewer'],
      default: 'author',
    },
    totpSecret: { type: String, select: false },
    backupCodes: { type: [String], select: false, default: [] },
  },
  { timestamps: true }
);

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
