import mongoose, { Schema, Model } from 'mongoose';

export interface IPost {
  _id?: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: any;
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  publishAt?: Date;
  authorId?: string;
  categoryId?: string;
  categoryIds?: string[];
  tags?: string[];
  keywords?: string[];
  coverImageId?: string;
  canonicalUrl?: string;
  isFeatured: boolean;
  readingTime?: number;
  views: number;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    robots?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImageId?: string;
    twitterCard?: string;
    schemaType?: string;
    jsonLd?: any;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const PostSchema = new Schema<IPost>(
  {
    title: { type: String, required: true, trim: true, index: 'text' },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    excerpt: { type: String, trim: true },
    content: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    publishAt: { type: Date, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User' },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', index: true },
    categoryIds: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
    keywords: [{ type: String }],
    coverImageId: { type: Schema.Types.ObjectId, ref: 'Media' },
    canonicalUrl: { type: String, trim: true },
    isFeatured: { type: Boolean, default: false },
    readingTime: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    seo: {
      metaTitle: String,
      metaDescription: String,
      robots: String,
      ogTitle: String,
      ogDescription: String,
      ogImageId: { type: Schema.Types.ObjectId, ref: 'Media' },
      twitterCard: String,
      schemaType: String,
      jsonLd: Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

PostSchema.index({ status: 1, publishAt: -1 });

export const Post: Model<IPost> = mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema);
