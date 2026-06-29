import mongoose, { Document, Schema } from 'mongoose';

export type PaperStatus = 
  | 'submitted' 
  | 'under_review' 
  | 'rejected' 
  | 'accepted' 
  | 'pre_proof' 
  | 'awaiting_author_response' 
  | 'correction_requested' 
  | 'final_approval' 
  | 'payment_pending' 
  | 'payment_completed' 
  | 'published';

export interface IPaper extends Document {
  title: string;
  abstract: string;
  highlights?: string;
  keywords?: string[];
  pdfUrl: string;             // original user-submitted file (Word/PDF)
  publishedPdfUrl?: string;   // admin-uploaded final formatted PDF
  coverImage?: string;        // admin-uploaded cover graphic
  correctionFiles?: Array<{ data: string; type: 'image' | 'document'; name: string }>; // max 5
  authors: string[];
  subject: mongoose.Types.ObjectId;
  status: PaperStatus;
  createdBy: mongoose.Types.ObjectId;
  slug: string;
  views: number;
  downloads: number;
  requiresMembership: boolean;
  createdAt: Date;
  publishedAt?: Date;
  remarks?: string;
  coverLetterUrl?: string;    // optional cover letter (Word)
  coverLetterName?: string;
  proofApproved?: boolean;
  proofApprovedAt?: Date;
  correctionRequested?: boolean;
  correctionRequestCount?: number;
  authorCorrectionNotes?: string;
  authorCorrectionFileUrl?: string;
  paymentRequired?: boolean;
  reviewers?: Array<{
    name: string;
    designation: string;
    affiliation: string;
    email: string;
    contact: string;
    researchArea: string;
  }>;
}

const PaperSchema = new Schema<IPaper>(
  {
    title: { type: String, required: true, trim: true },
    abstract: { type: String, required: true },
    highlights: { type: String },
    keywords: [{ type: String, trim: true }],
    pdfUrl: { type: String, required: true },
    publishedPdfUrl: { type: String },
    coverImage: { type: String },
    correctionFiles: [
      {
        data: { type: String },
        type: { type: String, enum: ['image', 'document'] },
        name: { type: String },
      },
    ],
    authors: [{ type: String, trim: true }],
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    status: { type: String, enum: ['submitted', 'under_review', 'rejected', 'accepted', 'pre_proof', 'awaiting_author_response', 'correction_requested', 'final_approval', 'payment_pending', 'payment_completed', 'published'], default: 'submitted' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    views: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    requiresMembership: { type: Boolean, default: false },
    publishedAt: { type: Date },
    remarks: { type: String, maxlength: 2000 },
    coverLetterUrl: { type: String },
    coverLetterName: { type: String },
    proofApproved: { type: Boolean, default: false },
    proofApprovedAt: { type: Date },
    correctionRequested: { type: Boolean, default: false },
    correctionRequestCount: { type: Number, default: 0 },
    authorCorrectionNotes: { type: String },
    authorCorrectionFileUrl: { type: String },
    paymentRequired: { type: Boolean, default: false },
    reviewers: [
      {
        name: { type: String },
        designation: { type: String },
        affiliation: { type: String },
        email: { type: String },
        contact: { type: String },
        researchArea: { type: String },
      }
    ],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

PaperSchema.index({ title: 'text', abstract: 'text' });
PaperSchema.index({ subject: 1, status: 1 });
PaperSchema.index({ createdBy: 1 });

export default mongoose.model<IPaper>('Paper', PaperSchema);
