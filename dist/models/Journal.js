"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const JournalSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    shortDescription: { type: String },
    fullDescription: { type: String },
    category: { type: String },
    coverImage: { type: String },
    status: { type: String, enum: ['active', 'coming-soon', 'archived'], default: 'active' },
    issn: { type: String },
    publicationFrequency: { type: String },
    peerReviewType: { type: String },
    seoTitle: { type: String },
    seoDescription: { type: String },
}, { timestamps: true });
exports.default = mongoose_1.default.models.Journal || mongoose_1.default.model('Journal', JournalSchema);
//# sourceMappingURL=Journal.js.map