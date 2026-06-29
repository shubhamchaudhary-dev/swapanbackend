"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const passport_1 = __importDefault(require("passport"));
const auth_1 = __importDefault(require("./routes/auth"));
const papers_1 = __importDefault(require("./routes/papers"));
const subjects_1 = __importDefault(require("./routes/subjects"));
const bookmarks_1 = __importDefault(require("./routes/bookmarks"));
const users_1 = __importDefault(require("./routes/users"));
const admin_1 = __importDefault(require("./routes/admin"));
const cms_1 = __importDefault(require("./routes/cms"));
const inquiries_1 = __importDefault(require("./routes/inquiries"));
const subscribers_1 = __importDefault(require("./routes/subscribers"));
const feedback_1 = __importDefault(require("./routes/feedback"));
const payments_1 = __importDefault(require("./routes/payments"));
const rateLimit_1 = require("./middleware/rateLimit");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
app.use(passport_1.default.initialize());
// Global rate limiting
app.use('/api/', (0, rateLimit_1.createAuthenticatedLimiter)());
app.use('/api/', (0, rateLimit_1.createUnauthenticatedLimiter)());
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/papers', papers_1.default);
app.use('/api/subjects', subjects_1.default);
app.use('/api/bookmarks', bookmarks_1.default);
app.use('/api/users', users_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/cms', cms_1.default);
app.use('/api/inquiries', inquiries_1.default);
app.use('/api/subscribers', subscribers_1.default);
app.use('/api/feedback', feedback_1.default);
app.use('/api/payments', payments_1.default);
// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
// 404
app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});
exports.default = app;
//# sourceMappingURL=app.js.map