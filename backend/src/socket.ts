import { Server, Socket } from 'socket.io';
import { verifyToken } from './services/auth';
import { documentSync } from './services/sync';
import { lockManager } from './services/locks';
import { presenceManager } from './services/presence';
import { terminalManager } from './services/terminal';
import { PrismaClient } from '@prisma/client';
import logger from './config/logger';
import * as Y from 'yjs';

const prisma = new PrismaClient();

declare module 'socket.io' {
    interface Socket {
        data: {
            userId: string;
            userName: string;
            projectId?: string;
        };
    }
}

export function setupSocketEvents(io: Server) {
    // Authentication middleware
    io.use(async (socket, next) => {
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new Error('Authentication token required'));
        }

        const payload = verifyToken(token);

        if (!payload) {
            return next(new Error('Invalid or expired token'));
        }

        // Load user info
        const user = await prisma.user.findUnique({
            where: { id: payload.userId }
        });

        if (!user) {
            return next(new Error('User not found'));
        }

        socket.data.userId = payload.userId;
        socket.data.userName = user.name;
        next();
    });

    io.on('connection', (socket: Socket) => {
        console.log(`✓ User connected: ${socket.data.userName} (${socket.id})`);

        // Join project room
        socket.on('project:join', async (data: { projectId: string }) => {
            try {
                const { projectId } = data;

                // Verify user has access to project
                const project = await prisma.project.findFirst({
                    where: {
                        id: projectId,
                        OR: [
                            { ownerId: socket.data.userId },
                            { collaborators: { some: { userId: socket.data.userId } } }
                        ]
                    }
                });

                if (!project) {
                    socket.emit('error', { message: 'Access denied to project' });
                    return;
                }

                socket.join(`project:${projectId}`);
                socket.data.projectId = projectId;

                // Send current presence to new user
                const presence = await presenceManager.getProjectPresence(projectId);
                socket.emit('presence:list', presence);

                // Broadcast new user joined
                socket.broadcast.to(`project:${projectId}`).emit('user:joined', {
                    userId: socket.data.userId,
                    userName: socket.data.userName,
                });

                console.log(`User ${socket.data.userName} joined project ${projectId}`);
            } catch (error) {
                console.error('Project join error:', error);
                socket.emit('error', { message: 'Failed to join project' });
            }
        });

        // Document synchronization
        socket.on('sync:update', async (data: {
            projectId: string;
            filePath: string;
            update: ArrayBuffer;
        }) => {
            try {
                const { projectId, filePath, update } = data;

                // Apply update to server-side Yjs document
                const updateArray = new Uint8Array(update);
                documentSync.applyUpdate(projectId, filePath, updateArray);

                // Broadcast to other users in the same file
                socket.broadcast.to(`project:${projectId}`).emit('sync:update', {
                    filePath,
                    update: updateArray,
                    userId: socket.data.userId,
                });
            } catch (error) {
                console.error('Sync update error:', error);
                socket.emit('error', { message: 'Failed to sync update' });
            }
        });

        // Request sync state for a file
        socket.on('sync:request', async (data: {
            projectId: string;
            filePath: string;
        }) => {
            try {
                const { projectId, filePath } = data;

                // Get or create Yjs document
                await documentSync.getOrCreateDocument(projectId, filePath);

                // Get current state
                const state = documentSync.getState(projectId, filePath);

                if (state) {
                    socket.emit('sync:state', {
                        filePath,
                        state: state,
                    });
                }
            } catch (error) {
                console.error('Sync request error:', error);
            }
        });

        // File locking
        socket.on('file:lock', async (data: {
            projectId: string;
            filePath: string;
        }) => {
            try {
                const { projectId, filePath } = data;

                const lock = await lockManager.acquireLock(
                    projectId,
                    filePath,
                    socket.data.userId,
                    socket.data.userName
                );

                if (lock) {
                    // Notify all users in project
                    io.to(`project:${projectId}`).emit('lock:acquired', {
                        filePath,
                        userId: socket.data.userId,
                        userName: socket.data.userName,
                        expiresAt: lock.expiresAt,
                    });
                } else {
                    const existingLock = await lockManager.getLock(projectId, filePath);
                    socket.emit('lock:failed', {
                        filePath,
                        reason: 'File is already locked',
                        holder: existingLock ? {
                            id: existingLock.holder,
                            name: existingLock.holderName,
                            expiresAt: existingLock.expiresAt,
                        } : null
                    });
                }
            } catch (error) {
                console.error('File lock error:', error);
                socket.emit('error', { message: 'Failed to acquire lock' });
            }
        });

        socket.on('file:unlock', async (data: {
            projectId: string;
            filePath: string;
        }) => {
            try {
                const { projectId, filePath } = data;

                const released = await lockManager.releaseLock(projectId, filePath, socket.data.userId);

                if (released) {
                    io.to(`project:${projectId}`).emit('lock:released', {
                        filePath,
                        userId: socket.data.userId,
                    });
                }
            } catch (error) {
                console.error('File unlock error:', error);
            }
        });

        socket.on('lock:refresh', async (data: {
            projectId: string;
            filePath: string;
        }) => {
            try {
                const { projectId, filePath } = data;
                await lockManager.refreshLock(projectId, filePath, socket.data.userId);
            } catch (error) {
                console.error('Lock refresh error:', error);
            }
        });

        // Presence updates
        socket.on('presence:update', async (data: {
            fileName: string;
            cursorLine: number;
            cursorColumn: number;
        }) => {
            try {
                const projectId = socket.data.projectId;
                if (!projectId) return;

                const user = await prisma.user.findUnique({
                    where: { id: socket.data.userId }
                });

                const presence = await presenceManager.updatePresence(projectId, {
                    userId: socket.data.userId,
                    userName: socket.data.userName,
                    userAvatar: user?.avatar || null,
                    fileName: data.fileName,
                    cursorLine: data.cursorLine,
                    cursorColumn: data.cursorColumn,
                    isTyping: false,
                });

                io.to(`project:${projectId}`).emit('presence:update', presence);
            } catch (error) {
                console.error('Presence update error:', error);
            }
        });

        // Typing indicator
        socket.on('user:typing', async (data: {
            fileName: string;
            isTyping: boolean;
        }) => {
            try {
                const projectId = socket.data.projectId;
                if (!projectId) return;

                await presenceManager.setTyping(
                    projectId,
                    socket.data.userId,
                    data.fileName,
                    data.isTyping
                );

                socket.broadcast.to(`project:${projectId}`).emit('user:typing', {
                    userId: socket.data.userId,
                    userName: socket.data.userName,
                    fileName: data.fileName,
                    isTyping: data.isTyping,
                });
            } catch (error) {
                console.error('Typing indicator error:', error);
            }
        });

        // Chat messages
        socket.on('chat:message', (data: { message: string }) => {
            const projectId = socket.data.projectId;
            if (!projectId) return;

            io.to(`project:${projectId}`).emit('chat:message', {
                userId: socket.data.userId,
                userName: socket.data.userName,
                message: data.message,
                timestamp: Date.now(),
            });
        });

        // Terminal events
        socket.on('terminal:start', (data: { projectId: string }) => {
            try {
                const sessionId = terminalManager.createSession(data.projectId, socket.data.userId);
                const session = terminalManager.getSession(sessionId);

                if (session) {
                    session.ptyProcess.onData((data) => {
                        socket.emit('terminal:data', data);
                    });

                    logger.info('Terminal session started', { sessionId, userId: socket.data.userId });
                }
            } catch (error) {
                logger.error('Terminal start error:', error);
            }
        });

        socket.on('terminal:input', (data: { projectId: string; data: string }) => {
            const sessionId = `${data.projectId}:${socket.data.userId}`;
            terminalManager.writeToSession(sessionId, data.data);
        });

        socket.on('terminal:resize', (data: { projectId: string; cols: number; rows: number }) => {
            const sessionId = `${data.projectId}:${socket.data.userId}`;
            terminalManager.resizeSession(sessionId, data.cols, data.rows);
        });

        socket.on('terminal:stop', (data: { projectId: string }) => {
            const sessionId = `${data.projectId}:${socket.data.userId}`;
            terminalManager.destroySession(sessionId);
            logger.info('Terminal session stopped', { sessionId });
        });

        // Disconnect handling
        socket.on('disconnect', async () => {
            console.log(`✗ User disconnected: ${socket.data.userName} (${socket.id})`);

            const projectId = socket.data.projectId;
            if (projectId) {
                // Remove presence
                await presenceManager.removePresence(projectId, socket.data.userId);

                // Notify others
                socket.broadcast.to(`project:${projectId}`).emit('user:left', {
                    userId: socket.data.userId,
                    userName: socket.data.userName,
                });

                // Release any locks held by this user
                const locks = await lockManager.getAllProjectLocks(projectId);
                for (const lock of locks) {
                    if (lock.holder === socket.data.userId) {
                        await lockManager.releaseLock(projectId, lock.filePath, socket.data.userId);
                        io.to(`project:${projectId}`).emit('lock:released', {
                            filePath: lock.filePath,
                            userId: socket.data.userId,
                            reason: 'User disconnected',
                        });
                    }
                }
            }
        });
    });

    // Periodic cleanup
    setInterval(async () => {
        await presenceManager.cleanupStalePresence();
        await lockManager.cleanupExpiredLocks();
    }, 60000); // Every minute
}
