import Redis from 'ioredis';
export declare function getRedisClient(): Redis | null;
export declare function isRedisConnected(): boolean;
export declare function initRedis(): void;
export declare function cacheGet(key: string): Promise<string | null>;
export declare function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void>;
export declare function cacheDel(key: string): Promise<void>;
export declare function cacheDelPattern(pattern: string): Promise<void>;
export declare function blacklistToken(token: string, ttlSeconds: number): Promise<void>;
export declare function isTokenBlacklisted(token: string): Promise<boolean>;
export declare function hasUserViewedPaper(userId: string, paperId: string): Promise<boolean>;
export declare function markUserViewedPaper(userId: string, paperId: string): Promise<void>;
//# sourceMappingURL=redis.d.ts.map