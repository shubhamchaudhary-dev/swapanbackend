import mongoose, { Document } from 'mongoose';
export interface IFeedback extends Document {
    name?: string;
    email?: string;
    feedbackType: string;
    message: string;
    createdAt: Date;
}
declare const _default: mongoose.Model<IFeedback, {}, {}, {}, mongoose.Document<unknown, {}, IFeedback, {}, {}> & IFeedback & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Feedback.d.ts.map