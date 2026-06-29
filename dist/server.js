"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config"); // reload .env
const mongoose_1 = __importDefault(require("mongoose"));
const app_1 = __importDefault(require("./app"));
const redis_1 = require("./utils/redis");
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/swarnpublication';
async function start() {
    try {
        // Init Redis (graceful — won't crash on failure)
        (0, redis_1.initRedis)();
        // Connect MongoDB
        await mongoose_1.default.connect(MONGODB_URI);
        console.log('[MongoDB] Connected to', MONGODB_URI);
        app_1.default.listen(PORT, () => {
            console.log(`[Server] SwarnPublication API running on http://localhost:${PORT}`);
        });
    }
    catch (err) {
        console.error('[Server] Startup failed:', err);
        process.exit(1);
    }
}
start();
//# sourceMappingURL=server.js.map