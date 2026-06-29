import mongoose, { Document } from 'mongoose';
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
declare const _default: mongoose.Model<IInquiry, {}, {}, {}, mongoose.Document<unknown, {}, IInquiry, {}, {}> & IInquiry & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Inquiry.d.ts.map