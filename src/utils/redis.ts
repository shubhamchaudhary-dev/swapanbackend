import Redis from 'ioredis';

let redis: Redis | null = null;
let isConnected = false;

export function getRedisClient(): Redis | null {
  return redis;
}

export function isRedisConnected(): boolean {
  return isConnected;
}

export function initRedis(): void {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn('[Redis] REDIS_URL not set — Redis disabled, using fallbacks');
    return;
  }

  try {
    redis = new Redis(redisUrl, {
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
  } catch (err) {
    console.error('[Redis] Init error:', err);
  }
}

// Cache helpers
export async function cacheGet(key: string): Promise<string | null> {
  if (!redis || !isConnected) return null;
  try {
    return await redis.get(key);
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  if (!redis || !isConnected) return;
  try {
    await redis.setex(key, ttlSeconds, value);
  } catch {
    // ignore
  }
}

export async function cacheDel(key: string): Promise<void> {
  if (!redis || !isConnected) return;
  try {
    await redis.del(key);
  } catch {
    // ignore
  }
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  if (!redis || !isConnected) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // ignore
  }
}

// Blacklist helpers
export async function blacklistToken(token: string, ttlSeconds: number): Promise<void> {
  if (!redis || !isConnected) return;
  try {
    await redis.setex(`blacklist:${token}`, ttlSeconds, '1');
  } catch {
    // ignore
  }
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  if (!redis || !isConnected) return false;
  try {
    const result = await redis.get(`blacklist:${token}`);
    return result !== null;
  } catch {
    return false;
  }
}

// View debounce helpers
export async function hasUserViewedPaper(userId: string, paperId: string): Promise<boolean> {
  if (!redis || !isConnected) return false;
  try {
    const result = await redis.get(`viewed:${userId}:${paperId}`);
    return result !== null;
  } catch {
    return false;
  }
}

export async function markUserViewedPaper(userId: string, paperId: string): Promise<void> {
  if (!redis || !isConnected) return;
  try {
    await redis.setex(`viewed:${userId}:${paperId}`, 86400, '1');
  } catch {
    // ignore
  }
}
