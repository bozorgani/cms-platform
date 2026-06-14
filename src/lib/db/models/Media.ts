import mongoose, { Schema, Model } from 'mongoose';

export interface IMedia {
  _id?: string;
  path: string;
  url?: string;
  width?: number;
  height?: number;
  alt?: string;
  caption?: string;
  dominantColor?: string;
  variants?: any;
  imagekitFileId?: string;
  blobPathname?: string;
  mime?: string;
  size?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const MediaSchema = new Schema<IMedia>(
  {
    path: { type: String, required: true },
    url: String,
    width: Number,
    height: Number,
    alt: String,
    caption: String,
    dominantColor: String,
    variants: Schema.Types.Mixed,
    imagekitFileId: String,
    blobPathname: String,
    mime: String,
    size: Number,
  },
  { timestamps: true }
);

export const Media: Model<IMedia> = mongoose.models.Media || mongoose.model<IMedia>('Media', MediaSchema);
