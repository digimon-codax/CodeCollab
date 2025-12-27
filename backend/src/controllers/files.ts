import { Request, Response } from 'express';
import { ProjectCollaborator, ProjectFile } from '../models';
import { lockManager } from '../services/locks';

export async function getFile(req: Request, res: Response) {
    try {
        const { projectId, path } = req.params;
        const userId = (req as any).user?.userId;

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const hasAccess = await ProjectCollaborator.findOne({ projectId, userId });

        if (!hasAccess) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        const file = await ProjectFile.findOne({ projectId, path });

        if (!file) {
            res.status(404).json({ error: 'File not found' });
            return;
        }

        res.json({
            id: file._id,
            path: file.path,
            content: file.content,
            language: file.language,
            createdAt: file.createdAt,
            updatedAt: file.updatedAt,
        });
    } catch (error) {
        console.error('Get file error:', error);
        res.status(500).json({ error: 'Failed to get file' });
    }
}

export async function createFile(req: Request, res: Response) {
    try {
        const { projectId } = req.params;
        const { path, content, language } = req.body;
        const userId = (req as any).user?.userId;

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const hasAccess = await ProjectCollaborator.findOne({ projectId, userId });

        if (!hasAccess || hasAccess.role === 'viewer') {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        const existing = await ProjectFile.findOne({ projectId, path });

        if (existing) {
            res.status(400).json({ error: 'File already exists' });
            return;
        }

        const file = await ProjectFile.create({
            projectId,
            path,
            content: content || '',
            language: language || 'plaintext',
        });

        res.status(201).json({
            id: file._id,
            path: file.path,
            content: file.content,
            language: file.language,
            createdAt: file.createdAt,
        });
    } catch (error) {
        console.error('Create file error:', error);
        res.status(500).json({ error: 'Failed to create file' });
    }
}

export async function createFolder(req: Request, res: Response) {
    try {
        const { projectId } = req.params;
        const { path } = req.body;
        const userId = (req as any).user?.userId;

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const hasAccess = await ProjectCollaborator.findOne({ projectId, userId });

        if (!hasAccess || hasAccess.role === 'viewer') {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        // Create a placeholder file to represent the folder
        const folderMarkerPath = `${path}/.gitkeep`;
        const existing = await ProjectFile.findOne({ projectId, path: folderMarkerPath });

        if (existing) {
            res.status(400).json({ error: 'Folder already exists' });
            return;
        }

        const file = await ProjectFile.create({
            projectId,
            path: folderMarkerPath,
            content: '',
            language: 'plaintext',
        });

        res.status(201).json({
            id: file._id,
            path: path,
            message: 'Folder created successfully',
        });
    } catch (error) {
        console.error('Create folder error:', error);
        res.status(500).json({ error: 'Failed to create folder' });
    }
}

export async function updateFile(req: Request, res: Response) {
    try {
        const { projectId, path } = req.params;
        const { content } = req.body;
        const userId = (req as any).user?.userId;

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const hasAccess = await ProjectCollaborator.findOne({ projectId, userId });

        if (!hasAccess || hasAccess.role === 'viewer') {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        // Check if file is locked by someone else
        const lock = await lockManager.getLock(projectId, path);
        if (lock && lock.holder !== userId) {
            res.status(423).json({
                error: 'File is locked by another user',
                lockedBy: lock.holderName,
            });
            return;
        }

        const file = await ProjectFile.findOneAndUpdate(
            { projectId, path },
            { content },
            { new: true }
        );

        if (!file) {
            res.status(404).json({ error: 'File not found' });
            return;
        }

        res.json({
            id: file._id,
            path: file.path,
            content: file.content,
            updatedAt: file.updatedAt,
        });
    } catch (error) {
        console.error('Update file error:', error);
        res.status(500).json({ error: 'Failed to update file' });
    }
}

export async function deleteFile(req: Request, res: Response) {
    try {
        const { projectId, path } = req.params;
        const userId = (req as any).user?.userId;

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const hasAccess = await ProjectCollaborator.findOne({ projectId, userId });

        if (!hasAccess || hasAccess.role === 'viewer') {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        await ProjectFile.deleteOne({ projectId, path });

        res.json({ message: 'File deleted successfully' });
    } catch (error) {
        console.error('Delete file error:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
}

export async function acquireLock(req: Request, res: Response) {
    try {
        const { projectId, path } = req.params;
        const userId = (req as any).user?.userId;
        const userName = (req as any).user?.email || 'User';

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const hasAccess = await ProjectCollaborator.findOne({ projectId, userId });

        if (!hasAccess || hasAccess.role === 'viewer') {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        const lock = await lockManager.acquireLock(projectId, path, userId, userName);

        if (!lock) {
            const existingLock = await lockManager.getLock(projectId, path);
            res.status(423).json({
                error: 'File is already locked',
                lock: existingLock,
            });
            return;
        }

        res.json(lock);
    } catch (error) {
        console.error('Acquire lock error:', error);
        res.status(500).json({ error: 'Failed to acquire lock' });
    }
}

export async function releaseLock(req: Request, res: Response) {
    try {
        const { projectId, path } = req.params;
        const userId = (req as any).user?.userId;

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const released = await lockManager.releaseLock(projectId, path, userId);

        if (!released) {
            res.status(400).json({ error: 'Lock not held by this user' });
            return;
        }

        res.json({ message: 'Lock released successfully' });
    } catch (error) {
        console.error('Release lock error:', error);
        res.status(500).json({ error: 'Failed to release lock' });
    }
}

export async function getLockStatus(req: Request, res: Response) {
    try {
        const { projectId, path } = req.params;
        const userId = (req as any).user?.userId;

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const lock = await lockManager.getLock(projectId, path);

        res.json({
            locked: !!lock,
            lock: lock || null,
        });
    } catch (error) {
        console.error('Get lock status error:', error);
        res.status(500).json({ error: 'Failed to get lock status' });
    }
}

export async function refreshLock(req: Request, res: Response) {
    try {
        const { projectId, path } = req.params;
        const userId = (req as any).user?.userId;

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const refreshed = await lockManager.refreshLock(projectId, path, userId);

        if (!refreshed) {
            res.status(400).json({ error: 'Lock not held by this user' });
            return;
        }

        res.json({ message: 'Lock refreshed successfully' });
    } catch (error) {
        console.error('Refresh lock error:', error);
        res.status(500).json({ error: 'Failed to refresh lock' });
    }
}
