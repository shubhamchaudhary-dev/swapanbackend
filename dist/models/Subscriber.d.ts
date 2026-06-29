import mongoose, { Document } from 'mongoose';
export interface ISubscriber extends Document {
    email: string;
    isActive: boolean;
    createdAt: Date;
}
declare const _default: mongoose.Model<ISubscriber, {}, {}, {}, mongoose.Document<unknown, {}, ISubscriber, {}, {}> & ISubscriber & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Subscriber.d.ts.map