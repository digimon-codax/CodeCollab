import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/auth';

declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                email: string;
            };
        }
    }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Missing token' });
    }

    const payload = verifyToken(token);

    if (!payload) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = { userId: payload.userId, email: payload.email };
    next();
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const payload = verifyToken(token);

        if (payload) {
            req.user = { userId: payload.userId, email: payload.email };
        }
    }

    next();
}
