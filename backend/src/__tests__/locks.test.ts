import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { lockManager } from '../services/locks';
import Redis from 'ioredis';

// Mock Redis for testing
const redis = new Redis();

describe('LockManager', () => {
    const projectId = 'test-project';
    const filePath = 'test-file.ts';
    const userId1 = 'user1';
    const userId2 = 'user2';
    const userName1 = 'User One';
    const userName2 = 'User Two';

    beforeEach(async () => {
        // Clean up any existing locks
        const keys = await redis.keys('lock:*');
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    });

    afterEach(async () => {
        // Cleanup after each test
        const keys = await redis.keys('lock:*');
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    });

    it('should acquire a lock successfully', async () => {
        const lock = await lockManager.acquireLock(projectId, filePath, userId1, userName1);

        expect(lock).toBeDefined();
        expect(lock?.holder).toBe(userId1);
        expect(lock?.holderName).toBe(userName1);
        expect(lock?.projectId).toBe(projectId);
        expect(lock?.filePath).toBe(filePath);
    });

    it('should prevent concurrent locks', async () => {
        // First user acquires lock
        await lockManager.acquireLock(projectId, filePath, userId1, userName1);

        // Second user tries to acquire same lock
        const lock2 = await lockManager.acquireLock(projectId, filePath, userId2, userName2);

        expect(lock2).toBeNull();
    });

    it('should release a lock', async () => {
        await lockManager.acquireLock(projectId, filePath, userId1, userName1);

        const released = await lockManager.releaseLock(projectId, filePath, userId1);

        expect(released).toBe(true);

        // Verify lock is gone
        const lock = await lockManager.getLock(projectId, filePath);
        expect(lock).toBeNull();
    });

    it('should not release a lock held by another user', async () => {
        await lockManager.acquireLock(projectId, filePath, userId1, userName1);

        const released = await lockManager.releaseLock(projectId, filePath, userId2);

        expect(released).toBe(false);
    });

    it('should refresh a lock', async () => {
        await lockManager.acquireLock(projectId, filePath, userId1, userName1);

        const lock1 = await lockManager.getLock(projectId, filePath);
        expect(lock1).toBeDefined();
        const expiresAt1 = lock1!.expiresAt;

        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 100));

        const refreshed = await lockManager.refreshLock(projectId, filePath, userId1);
        expect(refreshed).toBe(true);

        const lock2 = await lockManager.getLock(projectId, filePath);
        expect(lock2!.expiresAt).toBeGreaterThan(expiresAt1);
    });

    it('should check if file is locked', async () => {
        const isLockedBefore = await lockManager.isLocked(projectId, filePath);
        expect(isLockedBefore).toBe(false);

        await lockManager.acquireLock(projectId, filePath, userId1, userName1);

        const isLockedAfter = await lockManager.isLocked(projectId, filePath);
        expect(isLockedAfter).toBe(true);
    });

    it('should get all project locks', async () => {
        await lockManager.acquireLock(projectId, 'file1.ts', userId1, userName1);
        await lockManager.acquireLock(projectId, 'file2.ts', userId2, userName2);

        const locks = await lockManager.getAllProjectLocks(projectId);

        expect(locks).toHaveLength(2);
        expect(locks.some(l => l.filePath === 'file1.ts')).toBe(true);
        expect(locks.some(l => l.filePath === 'file2.ts')).toBe(true);
    });

    it('should force release a lock', async () => {
        await lockManager.acquireLock(projectId, filePath, userId1, userName1);

        await lockManager.forceReleaseLock(projectId, filePath);

        const lock = await lockManager.getLock(projectId, filePath);
        expect(lock).toBeNull();
    });
});
