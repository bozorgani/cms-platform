import mongoose, { Schema, Model } from 'mongoose';

export interface ISetting {
  _id: string;
  key: string;
  value: any;
  updatedAt?: Date;
  createdAt?: Date;
}

const SettingSchema = new Schema<ISetting>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const Setting: Model<ISetting> = mongoose.models.Setting || mongoose.model<ISetting>('Setting', SettingSchema);
