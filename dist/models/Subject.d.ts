import mongoose, { Document } from 'mongoose';
export interface ISubject extends Document {
    name: string;
    slug: string;
    createdAt: Date;
}
declare const _default: mongoose.Model<ISubject, {}, {}, {}, mongoose.Document<unknown, {}, ISubject, {}, {}> & ISubject & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Subject.d.ts.map