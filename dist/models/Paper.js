"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const PaperSchema = new mongoose_1.Schema({
    title: { type: String, required: true, trim: true },
    abstract: { type: String, required: true },
    highlights: { type: String },
    keywords: [{ type: String, trim: true }],
    pdfUrl: { type: String, required: true },
    publishedPdfUrl: { type: String },
    coverImage: { type: String },
    correctionFiles: [
        {
            data: { type: String },
            type: { type: String, enum: ['image', 'document'] },
            name: { type: String },
        },
    ],
    authors: [{ type: String, trim: true }],
    subject: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Subject', required: true },
    status: { type: String, enum: ['submitted', 'under_review', 'rejected', 'accepted', 'pre_proof', 'awaiting_author_response', 'correction_requested', 'final_approval', 'payment_pending', 'payment_completed', 'published'], default: 'submitted' },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    views: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    requiresMembership: { type: Boolean, default: false },
    publishedAt: { type: Date },
    remarks: { type: String, maxlength: 2000 },
    coverLetterUrl: { type: String },
    coverLetterName: { type: String },
    proofApproved: { type: Boolean, default: false },
    proofApprovedAt: { type: Date },
    correctionRequested: { type: Boolean, default: false },
    correctionRequestCount: { type: Number, default: 0 },
    paymentRequired: { type: Boolean },
    reviewers: [
        {
            name: { type: String },
            designation: { type: String },
            affiliation: { type: String },
            email: { type: String },
            contact: { type: String },
            researchArea: { type: String },
        }
    ],
}, { timestamps: { createdAt: true, updatedAt: false } });
PaperSchema.index({ title: 'text', abstract: 'text' });
PaperSchema.index({ subject: 1, status: 1 });
PaperSchema.index({ createdBy: 1 });
exports.default = mongoose_1.default.model('Paper', PaperSchema);
//# sourceMappingURL=Paper.js.map