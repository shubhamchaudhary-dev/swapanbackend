import mongoose, { Document } from 'mongoose';
export interface ICMSValue {
    heroHeadline: string;
    heroSubheadline: string;
    featuredPaperIds: mongoose.Types.ObjectId[];
    stats: {
        papers: number;
        authors: number;
        institutions: number;
    };
    requireMembershipForAllPapers?: boolean;
    enablePublicationPayment?: boolean;
    publicationFeeAmount?: number;
    publicationFeeCurrency?: string;
    razorpayKeyId?: string;
    razorpaySecretKey?: string;
}
export interface ICMSConfig extends Document {
    key: string;
    value: ICMSValue;
}
declare const _default: mongoose.Model<ICMSConfig, {}, {}, {}, mongoose.Document<unknown, {}, ICMSConfig, {}, {}> & ICMSConfig & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=CMSConfig.d.ts.map