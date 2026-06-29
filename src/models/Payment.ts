import mongoose, { Document, Schema } from 'mongoose';

export type PaymentStatus = 'pending' | 'success' | 'failed';

export interface IPayment extends Document {
  paperId?: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  purpose?: 'publication' | 'membership';
  planType?: 'monthly' | 'yearly' | 'lifetime';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: Date;
  paidAt?: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    paperId: { type: Schema.Types.ObjectId, ref: 'Paper' },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    purpose: { type: String, enum: ['publication', 'membership'], default: 'publication' },
    planType: { type: String, enum: ['monthly', 'yearly', 'lifetime'] },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
    paidAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

PaymentSchema.index({ paperId: 1 });
PaymentSchema.index({ authorId: 1 });
PaymentSchema.index({ razorpayOrderId: 1 });

export default mongoose.model<IPayment>('Payment', PaymentSchema);
