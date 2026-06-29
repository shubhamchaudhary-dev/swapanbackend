import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getRedisClient, isRedisConnected } from '../utils/redis';

function createStore() {
  const client = getRedisClient();
  if (!client || !isRedisConnected()) return undefined;
  try {
    return new RedisStore({
      sendCommand: (...args: string[]) => (client as any).call(...args),
    });
  } catch {
    return undefined;
  }
}

export function createLoginLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { success: false, message: 'Too many login attempts, please try again in 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
    store: createStore(),
  });
}

export function createRegisterLimiter() {
  return rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: { success: false, message: 'Too many registration attempts, please try again in an hour' },
    standardHeaders: true,
    legacyHeaders: false,
    store: createStore(),
  });
}

export function createAuthenticatedLimiter() {
  return rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { success: false, message: 'Too many requests' },
    standardHeaders: true,
    legacyHeaders: false,
    store: createStore(),
    skip: (req) => !req.headers.authorization,
  });
}

export function createUnauthenticatedLimiter() {
  return rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { success: false, message: 'Too many requests' },
    standardHeaders: true,
    legacyHeaders: false,
    store: createStore(),
    skip: (req) => !!req.headers.authorization,
  });
}
