import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { lockManager } from '../services/locks';
import { documentSync } from '../services/sync';

const prisma = new PrismaClient();

export async function getFile(req: Request, res: Response) {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { projectId, path } = req.params;

        const file = await prisma.projectFile.findUnique({
            where: {
                projectId_path: { projectId: projectId, path: decodeURIComponent(path) }
            }
        });

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Get lock status
        const lock = await lockManager.getLock(projectId, file.path);

        res.json({
            ...file,
            locked: !!lock,
            lockHolder: lock ? { id: lock.holder, name: lock.holderName } : null,
            lockExpires: lock?.expiresAt,
        });
    } catch (error) {
        console.error('Get file error:', error);
        res.status(500).json({ error: 'Failed to get file' });
    }
}

export async function createFile(req: Request, res: Response) {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { projectId } = req.params;
        const { path, content = '', language } = req.body;

        if (!path) {
            return res.status(400).json({ error: 'File path is required' });
        }

        const file = await prisma.projectFile.create({
            data: {
                projectId,
                path,
                content,
                language,
            }
        });

        res.status(201).json(file);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'File already exists' });
        }
        console.error('Create file error:', error);
        res.status(500).json({ error: 'Failed to create file' });
    }
}

export async function updateFile(req: Request, res: Response) {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { projectId, path } = req.params;
        const { content } = req.body;
        const decodedPath = decodeURIComponent(path);

        // Check if file is locked by another user
        const lock = await lockManager.getLock(projectId, decodedPath);
        if (lock && lock.holder !== req.user.userId) {
            return res.status(423).json({
                error: 'File is locked by another user',
                lockHolder: lock.holderName,
            });
        }

        const file = await prisma.projectFile.update({
            where: {
                projectId_path: { projectId, path: decodedPath }
            },
            data: {
                content,
                updatedAt: new Date(),
            }
        });

        res.json(file);
    } catch (error) {
        console.error('Update file error:', error);
        res.status(500).json({ error: 'Failed to update file' });
    }
}

export async function deleteFile(req: Request, res: Response) {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { projectId, path } = req.params;
        const decodedPath = decodeURIComponent(path);

        // Release lock if held
        await lockManager.releaseLock(projectId, decodedPath, req.user.userId);

        await prisma.projectFile.delete({
            where: {
                projectId_path: { projectId, path: decodedPath }
            }
        });

        res.json({ message: 'File deleted successfully' });
    } catch (error) {
        console.error('Delete file error:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
}

export async function acquireLock(req: Request, res: Response) {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { projectId, path } = req.params;
        const decodedPath = decodeURIComponent(path);

        // Get user info
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const lock = await lockManager.acquireLock(projectId, decodedPath, req.user.userId, user.name);

        if (!lock) {
            const existingLock = await lockManager.getLock(projectId, decodedPath);
            return res.status(409).json({
                error: 'File is already locked',
                holder: existingLock ? {
                    id: existingLock.holder,
                    name: existingLock.holderName,
                } : null,
                expiresAt: existingLock?.expiresAt,
            });
        }

        res.json({
            locked: true,
            holder: {
                id: lock.holder,
                name: lock.holderName,
            },
            acquiredAt: lock.acquiredAt,
            expiresAt: lock.expiresAt,
        });
    } catch (error) {
        console.error('Acquire lock error:', error);
        res.status(500).json({ error: 'Failed to acquire lock' });
    }
}

export async function releaseLock(req: Request, res: Response) {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { projectId, path } = req.params;
        const decodedPath = decodeURIComponent(path);

        const released = await lockManager.releaseLock(projectId, decodedPath, req.user.userId);

        if (!released) {
            return res.status(400).json({ error: 'You do not hold the lock on this file' });
        }

        res.json({ message: 'Lock released successfully' });
    } catch (error) {
        console.error('Release lock error:', error);
        res.status(500).json({ error: 'Failed to release lock' });
    }
}

export async function getLockStatus(req: Request, res: Response) {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { projectId, path } = req.params;
        const decodedPath = decodeURIComponent(path);

        const lock = await lockManager.getLock(projectId, decodedPath);

        if (!lock) {
            return res.json({
                locked: false,
                holder: null,
                expiresAt: null,
            });
        }

        res.json({
            locked: true,
            holder: {
                id: lock.holder,
                name: lock.holderName,
            },
            acquiredAt: lock.acquiredAt,
            expiresAt: lock.expiresAt,
            isOwnedByCurrentUser: lock.holder === req.user.userId,
        });
    } catch (error) {
        console.error('Get lock status error:', error);
        res.status(500).json({ error: 'Failed to get lock status' });
    }
}

export async function refreshLock(req: Request, res: Response) {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { projectId, path } = req.params;
        const decodedPath = decodeURIComponent(path);

        const refreshed = await lockManager.refreshLock(projectId, decodedPath, req.user.userId);

        if (!refreshed) {
            return res.status(400).json({ error: 'Failed to refresh lock' });
        }

        const lock = await lockManager.getLock(projectId, decodedPath);

        res.json({
            message: 'Lock refreshed successfully',
            expiresAt: lock?.expiresAt,
        });
    } catch (error) {
        console.error('Refresh lock error:', error);
        res.status(500).json({ error: 'Failed to refresh lock' });
    }
}
