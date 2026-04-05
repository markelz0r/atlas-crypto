import mongoose, { Schema, Document } from 'mongoose';

export interface IAsset {
  ticker: string;
  amount: number;
  averageBuyPrice?: number;
}

export interface IUser extends Document {
  telegramId: number;
  username?: string;
  portfolio: IAsset[];
  createdAt: Date;
}

const AssetSchema = new Schema(
  {
    ticker: { type: String, required: true, uppercase: true },
    amount: { type: Number, required: true },
    averageBuyPrice: { type: Number, required: false },
  },
  { _id: false },
);

const UserSchema = new Schema({
  telegramId: { type: Number, required: true, unique: true },
  username: { type: String, required: false },
  portfolio: [AssetSchema],
  createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.model<IUser>('User', UserSchema);
