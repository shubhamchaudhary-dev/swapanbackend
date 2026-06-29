"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisClient = getRedisClient;
exports.isRedisConnected = isRedisConnected;
exports.initRedis = initRedis;
exports.cacheGet = cacheGet;
exports.cacheSet = cacheSet;
exports.cacheDel = cacheDel;
exports.cacheDelPattern = cacheDelPattern;
exports.blacklistToken = blacklistToken;
exports.isTokenBlacklisted = isTokenBlacklisted;
exports.hasUserViewedPaper = hasUserViewedPaper;
exports.markUserViewedPaper = markUserViewedPaper;
const ioredis_1 = __importDefault(require("ioredis"));
let redis = null;
let isConnected = false;
function getRedisClient() {
    return redis;
}
function isRedisConnected() {
    return isConnected;
}
function initRedis() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        console.warn('[Redis] REDIS_URL not set — Redis disabled, using fallbacks');
        return;
    }
    try {
        redis = new ioredis_1.default(redisUrl, {
            maxRetriesPerRequest: 1,
            enableReadyCheck: false,
            lazyConnect: true,
        });
        redis.on('connect', () => {
            isConnected = true;
            console.log('[Redis] Connected');
        });
        redis.on('error', (err) => {
            isConnected = false;
            console.error('[Redis] Connection error:', err.message);
        });
        redis.on('close', () => {
            isConnected = false;
        });
        redis.connect().catch((err) => {
            console.error('[Redis] Failed to connect:', err.message);
        });
    }
    catch (err) {
        console.error('[Redis] Init error:', err);
    }
}
// Cache helpers
async function cacheGet(key) {
    if (!redis || !isConnected)
        return null;
    try {
        return await redis.get(key);
    }
    catch {
        return null;
    }
}
async function cacheSet(key, value, ttlSeconds) {
    if (!redis || !isConnected)
        return;
    try {
        await redis.setex(key, ttlSeconds, value);
    }
    catch {
        // ignore
    }
}
async function cacheDel(key) {
    if (!redis || !isConnected)
        return;
    try {
        await redis.del(key);
    }
    catch {
        // ignore
    }
}
async function cacheDelPattern(pattern) {
    if (!redis || !isConnected)
        return;
    try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    }
    catch {
        // ignore
    }
}
// Blacklist helpers
async function blacklistToken(token, ttlSeconds) {
    if (!redis || !isConnected)
        return;
    try {
        await redis.setex(`blacklist:${token}`, ttlSeconds, '1');
    }
    catch {
        // ignore
    }
}
async function isTokenBlacklisted(token) {
    if (!redis || !isConnected)
        return false;
    try {
        const result = await redis.get(`blacklist:${token}`);
        return result !== null;
    }
    catch {
        return false;
    }
}
// View debounce helpers
async function hasUserViewedPaper(userId, paperId) {
    if (!redis || !isConnected)
        return false;
    try {
        const result = await redis.get(`viewed:${userId}:${paperId}`);
        return result !== null;
    }
    catch {
        return false;
    }
}
async function markUserViewedPaper(userId, paperId) {
    if (!redis || !isConnected)
        return;
    try {
        await redis.setex(`viewed:${userId}:${paperId}`, 86400, '1');
    }
    catch {
        // ignore
    }
}
//# sourceMappingURL=redis.js.map