import mongoose, { Document, Schema } from 'mongoose';

export enum FollowType {
  Manual = 'Manual',
  AutoFollow = 'AutoFollow',
  Unknown = 'Unknown',
}

export interface BskyUserStruct {
  did: string;
  handle: string;
  type: 'Manual' | 'AutoFollow' | 'Unknown';
  numOfAttempts: number;
  followsMe?: boolean;
  isBlacklisted?: boolean;
  createdAt?: Date;
  lastFollowedAt?: Date;
}

export interface IBskyUser extends Document, BskyUserStruct { }
const bskyUserSchema = new Schema<IBskyUser>({
  did: { type: String, required: true, unique: true },
  handle: { type: String, required: true },
  type: { type: String, enum: ['Manual', 'AutoFollow', 'Unknown'], required: true },
  numOfAttempts: { type: Number, default: 0, required: true },
  followsMe: { type: Boolean, required: false },
  isBlacklisted: { type: Boolean, default: false, required: true },
  createdAt: { type: Date, default: Date.now, required: true },
  lastFollowedAt: { type: Date, required: false },
});
export const BskyUser = mongoose.model<IBskyUser>('BskyUser', bskyUserSchema);