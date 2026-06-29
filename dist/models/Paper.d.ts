import mongoose, { Document } from 'mongoose';
export type PaperStatus = 'submitted' | 'under_review' | 'rejected' | 'accepted' | 'pre_proof' | 'awaiting_author_response' | 'correction_requested' | 'final_approval' | 'payment_pending' | 'payment_completed' | 'published';
export interface IPaper extends Document {
    title: string;
    abstract: string;
    highlights?: string;
    keywords?: string[];
    pdfUrl: string;
    publishedPdfUrl?: string;
    coverImage?: string;
    correctionFiles?: Array<{
        data: string;
        type: 'image' | 'document';
        name: string;
    }>;
    authors: string[];
    subject: mongoose.Types.ObjectId;
    status: PaperStatus;
    createdBy: mongoose.Types.ObjectId;
    slug: string;
    views: number;
    downloads: number;
    requiresMembership: boolean;
    createdAt: Date;
    publishedAt?: Date;
    remarks?: string;
    coverLetterUrl?: string;
    coverLetterName?: string;
    proofApproved?: boolean;
    proofApprovedAt?: Date;
    correctionRequested?: boolean;
    correctionRequestCount?: number;
    paymentRequired?: boolean;
    reviewers?: Array<{
        name: string;
        designation: string;
        affiliation: string;
        email: string;
        contact: string;
        researchArea: string;
    }>;
}
declare const _default: mongoose.Model<IPaper, {}, {}, {}, mongoose.Document<unknown, {}, IPaper, {}, {}> & IPaper & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Paper.d.ts.map