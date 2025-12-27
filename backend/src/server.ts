import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config, validateConfig } from './config/env';
import { setupSocketEvents } from './socket';
import { authMiddleware } from './middleware/auth';
import { requestLogger } from './middleware/requestLogger';
import logger from './config/logger';
import { connectDatabase } from './models';
import * as authController from './controllers/auth';
import * as projectsController from './controllers/projects';
import * as filesController from './controllers/files';

// Validate configuration
validateConfig();

const app: Express = express();
const httpServer = createServer(app);

// Socket.IO setup
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: config.cors.origin,
        credentials: true,
        methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
});

// Initialize Socket.IO events
setupSocketEvents(io);

// Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable for development
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(cors({
    origin: config.cors.origin,
    credentials: true,
}));

// Request logging
app.use(requestLogger);

// Rate limiting
const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', limiter);

// Health check
app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.nodeEnv,
    });
});

// API routes

// Auth routes (public)
app.post('/api/auth/github/callback', authController.githubCallback);
app.post('/api/auth/logout', authController.logout);
app.post('/api/auth/signup', authController.signup);
app.post('/api/auth/login', authController.login);

// Auth routes (protected)
app.get('/api/auth/user', authMiddleware, authController.getCurrentUser);

// Project routes
app.post('/api/projects', authMiddleware, projectsController.createProject);
app.get('/api/projects', authMiddleware, projectsController.listProjects);
app.get('/api/projects/:id', authMiddleware, projectsController.getProject);
app.put('/api/projects/:id', authMiddleware, projectsController.updateProject);
app.delete('/api/projects/:id', authMiddleware, projectsController.deleteProject);

// Collaborator routes
app.post('/api/projects/:id/collaborators', authMiddleware, projectsController.addCollaborator);
app.delete('/api/projects/:id/collaborators/:userId', authMiddleware, projectsController.removeCollaborator);

// Invite code routes
app.post('/api/projects/join', authMiddleware, projectsController.joinProjectByCode);
app.post('/api/projects/:id/invite-code/regenerate', authMiddleware, projectsController.regenerateInviteCode);

// File routes
app.get('/api/projects/:projectId/files/:path(*)', authMiddleware, filesController.getFile);
app.post('/api/projects/:projectId/files', authMiddleware, filesController.createFile);
app.post('/api/projects/:projectId/folders', authMiddleware, filesController.createFolder);
app.put('/api/projects/:projectId/files/:path(*)', authMiddleware, filesController.updateFile);
app.delete('/api/projects/:projectId/files/:path(*)', authMiddleware, filesController.deleteFile);

// File locking routes
app.post('/api/projects/:projectId/files/:path(*)/lock', authMiddleware, filesController.acquireLock);
app.delete('/api/projects/:projectId/files/:path(*)/unlock', authMiddleware, filesController.releaseLock);
app.get('/api/projects/:projectId/files/:path(*)/lock-status', authMiddleware, filesController.getLockStatus);
app.post('/api/projects/:projectId/files/:path(*)/lock-refresh', authMiddleware, filesController.refreshLock);

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        error: 'Not found',
        path: req.path,
    });
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: any) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        ...(config.nodeEnv === 'development' && { stack: err.stack }),
    });
});

// Start server
const PORT = config.port;

// Connect to MongoDB first
connectDatabase()
    .then(() => {
        httpServer.listen(PORT, () => {
            logger.info('═══════════════════════════════════════════════');
            logger.info('  CodeCollab Backend Server');
            logger.info('═══════════════════════════════════════════════');
            logger.info(`  🚀 Server running on: http://localhost:${PORT}`);
            logger.info(`  🌍 Environment: ${config.nodeEnv}`);
            logger.info(`  📡 Socket.IO ready for connections`);
            logger.info(`  🔒 CORS origin: ${config.cors.origin}`);
            logger.info('═══════════════════════════════════════════════');
        });
    })
    .catch((error) => {
        logger.error('Failed to start server:', error);
        process.exit(1);
    });

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    httpServer.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

export { app, io };
