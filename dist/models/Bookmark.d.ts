import mongoose, { Document } from 'mongoose';
export interface IBookmark extends Document {
    userId: mongoose.Types.ObjectId;
    paperId: mongoose.Types.ObjectId;
    createdAt: Date;
}
declare const _default: mongoose.Model<IBookmark, {}, {}, {}, mongoose.Document<unknown, {}, IBookmark, {}, {}> & IBookmark & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Bookmark.d.ts.map