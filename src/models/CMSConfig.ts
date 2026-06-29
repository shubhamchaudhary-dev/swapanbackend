import mongoose, { Document, Schema } from 'mongoose';

export interface ICMSValue {
  heroHeadline: string;
  heroSubheadline: string;
  featuredPaperIds: mongoose.Types.ObjectId[];
  featuredJournalIds?: mongoose.Types.ObjectId[];
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
  membershipFeeMonthly?: number;
  membershipFeeYearly?: number;
  membershipFeeLifetime?: number;
}

export interface ICMSConfig extends Document {
  key: string;
  value: ICMSValue;
}

const CMSConfigSchema = new Schema<ICMSConfig>({
  key: { type: String, required: true, unique: true },
  value: {
    heroHeadline: { type: String, default: 'Advancing Knowledge Through Open Research' },
    heroSubheadline: { type: String, default: 'Discover, share, and explore peer-reviewed academic papers across all disciplines.' },
    featuredPaperIds: [{ type: Schema.Types.ObjectId, ref: 'Paper' }],
    featuredJournalIds: [{ type: Schema.Types.ObjectId, ref: 'Subject' }],
    stats: {
      papers: { type: Number, default: 0 },
      authors: { type: Number, default: 0 },
      institutions: { type: Number, default: 0 },
    },
    requireMembershipForAllPapers: { type: Boolean, default: false },
    enablePublicationPayment: { type: Boolean, default: false },
    publicationFeeAmount: { type: Number, default: 0 },
    publicationFeeCurrency: { type: String, default: 'INR' },
    razorpayKeyId: { type: String, default: '' },
    razorpaySecretKey: { type: String, default: '' },
    membershipFeeMonthly: { type: Number, default: 199 },
    membershipFeeYearly: { type: Number, default: 1999 },
    membershipFeeLifetime: { type: Number, default: 9999 },
  },
});

export default mongoose.model<ICMSConfig>('CMSConfig', CMSConfigSchema);
