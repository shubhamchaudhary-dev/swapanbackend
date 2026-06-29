import mongoose, { Document, Schema } from 'mongoose';

export interface ISubject extends Document {
  name: string;
  slug: string;
  shortDescription?: string;
  category?: string;
  coverImage?: string;
  issn?: string;
  status: 'active' | 'coming-soon' | 'archived';
  createdAt: Date;
}

const SubjectSchema = new Schema<ISubject>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    shortDescription: { type: String },
    category: { type: String },
    coverImage: { type: String },
    issn: { type: String },
    status: { type: String, enum: ['active', 'coming-soon', 'archived'], default: 'active' },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export default mongoose.models.Subject || mongoose.model<ISubject>('Subject', SubjectSchema);
