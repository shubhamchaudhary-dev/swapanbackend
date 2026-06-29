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
const CMSConfigSchema = new mongoose_1.Schema({
    key: { type: String, required: true, unique: true },
    value: {
        heroHeadline: { type: String, default: 'Advancing Knowledge Through Open Research' },
        heroSubheadline: { type: String, default: 'Discover, share, and explore peer-reviewed academic papers across all disciplines.' },
        featuredPaperIds: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Paper' }],
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
    },
});
exports.default = mongoose_1.default.model('CMSConfig', CMSConfigSchema);
//# sourceMappingURL=CMSConfig.js.map