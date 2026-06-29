import mongoose, { Document, Schema } from 'mongoose';

export interface IFeedback extends Document {
  name?: string;
  email?: string;
  feedbackType: string;
  message: string;
  createdAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    name: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    feedbackType: { type: String, required: true, enum: ['Bug Report', 'Feature Request', 'General Inquiry', 'Other'] },
    message: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<IFeedback>('Feedback', FeedbackSchema);
