"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSlug = createSlug;
exports.createUniqueSlug = createUniqueSlug;
const slugify_1 = __importDefault(require("slugify"));
function createSlug(text) {
    return (0, slugify_1.default)(text, {
        lower: true,
        strict: true,
        trim: true,
    });
}
function createUniqueSlug(text) {
    const base = createSlug(text);
    const suffix = Date.now().toString(36);
    return `${base}-${suffix}`;
}
//# sourceMappingURL=slugify.js.map