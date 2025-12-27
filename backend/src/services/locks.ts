import Redis from 'ioredis';
import { config } from '../config/env';

const redis = new Redis(config.redis.url);
const LOCK_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

export interface FileLock {
    holder: string;
    holderName: string;
    acquiredAt: number;
    expiresAt: number;
    projectId: string;
    filePath: string;
}

export class LockManager {
    async acquireLock(
        projectId: string,
        filePath: string,
        userId: string,
        userName: string
    ): Promise<FileLock | null> {
        const key = `lock:${projectId}:${filePath}`;
        const lock: FileLock = {
            holder: userId,
            holderName: userName,
            acquiredAt: Date.now(),
            expiresAt: Date.now() + LOCK_DURATION,
            projectId,
            filePath,
        };

        // Only set if key doesn't exist (NX flag)
        const result = await redis.set(
            key,
            JSON.stringify(lock),
            'EX',
            Math.ceil(LOCK_DURATION / 1000),
            'NX'
        );

        if (result === 'OK') {
            console.log(`Lock acquired: ${key} by ${userName}`);
            return lock;
        }

        return null;
    }

    async releaseLock(projectId: string, filePath: string, userId: string): Promise<boolean> {
        const key = `lock:${projectId}:${filePath}`;
        const lock = await this.getLock(projectId, filePath);

        if (!lock || lock.holder !== userId) {
            console.warn(`Lock release failed: ${key} - not held by ${userId}`);
            return false;
        }

        await redis.del(key);
        console.log(`Lock released: ${key}`);
        return true;
    }

    async getLock(projectId: string, filePath: string): Promise<FileLock | null> {
        const key = `lock:${projectId}:${filePath}`;
        const data = await redis.get(key);

        if (!data) return null;

        try {
            return JSON.parse(data) as FileLock;
        } catch (error) {
            console.error('Failed to parse lock data:', error);
            return null;
        }
    }

    async refreshLock(projectId: string, filePath: string, userId: string): Promise<boolean> {
        const lock = await this.getLock(projectId, filePath);

        if (!lock || lock.holder !== userId) {
            return false;
        }

        const key = `lock:${projectId}:${filePath}`;
        const updatedLock: FileLock = {
            ...lock,
            expiresAt: Date.now() + LOCK_DURATION,
        };

        await redis.setex(
            key,
            Math.ceil(LOCK_DURATION / 1000),
            JSON.stringify(updatedLock)
        );

        console.log(`Lock refreshed: ${key}`);
        return true;
    }

    async isLocked(projectId: string, filePath: string): Promise<boolean> {
        return (await this.getLock(projectId, filePath)) !== null;
    }

    async isLockedByUser(projectId: string, filePath: string, userId: string): Promise<boolean> {
        const lock = await this.getLock(projectId, filePath);
        return lock !== null && lock.holder === userId;
    }

    async getAllProjectLocks(projectId: string): Promise<FileLock[]> {
        const pattern = `lock:${projectId}:*`;
        const keys = await redis.keys(pattern);
        const locks: FileLock[] = [];

        for (const key of keys) {
            const data = await redis.get(key);
            if (data) {
                try {
                    locks.push(JSON.parse(data));
                } catch (error) {
                    console.error(`Failed to parse lock data for ${key}:`, error);
                }
            }
        }

        return locks;
    }

    async forceReleaseLock(projectId: string, filePath: string): Promise<void> {
        const key = `lock:${projectId}:${filePath}`;
        await redis.del(key);
        console.log(`Force released lock: ${key}`);
    }

    // Cleanup expired locks (should be called periodically)
    async cleanupExpiredLocks(): Promise<number> {
        // Redis automatically handles expiration with TTL, but this can be used
        // for additional cleanup or logging
        const pattern = 'lock:*:*';
        const keys = await redis.keys(pattern);
        let cleaned = 0;

        for (const key of keys) {
            const ttl = await redis.ttl(key);
            if (ttl === -2) { // Key doesn't exist
                cleaned++;
            } else if (ttl === -1) { // Key exists but has no expiration
                await redis.del(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`Cleaned up ${cleaned} expired locks`);
        }

        return cleaned;
    }
}

export const lockManager = new LockManager();
