import mongoose, { Document } from 'mongoose';
export type PaymentStatus = 'pending' | 'success' | 'failed';
export interface IPayment extends Document {
    paperId: mongoose.Types.ObjectId;
    authorId: mongoose.Types.ObjectId;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
    createdAt: Date;
    paidAt?: Date;
}
declare const _default: mongoose.Model<IPayment, {}, {}, {}, mongoose.Document<unknown, {}, IPayment, {}, {}> & IPayment & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Payment.d.ts.map