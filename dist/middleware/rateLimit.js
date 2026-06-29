"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLoginLimiter = createLoginLimiter;
exports.createRegisterLimiter = createRegisterLimiter;
exports.createAuthenticatedLimiter = createAuthenticatedLimiter;
exports.createUnauthenticatedLimiter = createUnauthenticatedLimiter;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const rate_limit_redis_1 = require("rate-limit-redis");
const redis_1 = require("../utils/redis");
function createStore() {
    const client = (0, redis_1.getRedisClient)();
    if (!client || !(0, redis_1.isRedisConnected)())
        return undefined;
    try {
        return new rate_limit_redis_1.RedisStore({
            sendCommand: (...args) => client.call(...args),
        });
    }
    catch {
        return undefined;
    }
}
function createLoginLimiter() {
    return (0, express_rate_limit_1.default)({
        windowMs: 15 * 60 * 1000,
        max: 5,
        message: { success: false, message: 'Too many login attempts, please try again in 15 minutes' },
        standardHeaders: true,
        legacyHeaders: false,
        store: createStore(),
    });
}
function createRegisterLimiter() {
    return (0, express_rate_limit_1.default)({
        windowMs: 60 * 60 * 1000,
        max: 10,
        message: { success: false, message: 'Too many registration attempts, please try again in an hour' },
        standardHeaders: true,
        legacyHeaders: false,
        store: createStore(),
    });
}
function createAuthenticatedLimiter() {
    return (0, express_rate_limit_1.default)({
        windowMs: 60 * 1000,
        max: 100,
        message: { success: false, message: 'Too many requests' },
        standardHeaders: true,
        legacyHeaders: false,
        store: createStore(),
        skip: (req) => !req.headers.authorization,
    });
}
function createUnauthenticatedLimiter() {
    return (0, express_rate_limit_1.default)({
        windowMs: 60 * 1000,
        max: 30,
        message: { success: false, message: 'Too many requests' },
        standardHeaders: true,
        legacyHeaders: false,
        store: createStore(),
        skip: (req) => !!req.headers.authorization,
    });
}
//# sourceMappingURL=rateLimit.js.map