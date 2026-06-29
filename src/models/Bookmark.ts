import mongoose, { Document, Schema } from 'mongoose';

export interface IBookmark extends Document {
  userId: mongoose.Types.ObjectId;
  paperId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const BookmarkSchema = new Schema<IBookmark>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    paperId: { type: Schema.Types.ObjectId, ref: 'Paper', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

BookmarkSchema.index({ userId: 1, paperId: 1 }, { unique: true });

export default mongoose.model<IBookmark>('Bookmark', BookmarkSchema);
