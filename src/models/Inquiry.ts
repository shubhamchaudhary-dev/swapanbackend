import mongoose, { Document, Schema } from 'mongoose';

export type InquiryType = 'general' | 'submission' | 'editorial' | 'partnership';

export interface IInquiry extends Document {
  name: string;
  email: string;
  affiliation?: string;
  inquiryType: InquiryType;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

const InquirySchema = new Schema<IInquiry>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    affiliation: { type: String, trim: true },
    inquiryType: { 
        type: String, 
        enum: ['general', 'submission', 'editorial', 'partnership'], 
        default: 'general' 
    },
    message: { type: String, required: true, trim: true },
    isRead: { type: Boolean, default: false }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<IInquiry>('Inquiry', InquirySchema);
