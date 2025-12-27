import { Request, Response } from 'express';
import { getUserById, generateToken } from '../services/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mock GitHub OAuth for development (replace with real OAuth in production)
export async function githubCallback(req: Request, res: Response) {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Missing authorization code' });
        }

        // In production, exchange code for GitHub access token
        // For now, create a mock user for development
        const mockGithubId = `github_${code}`;

        let user = await prisma.user.findUnique({
            where: { githubId: mockGithubId }
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    githubId: mockGithubId,
                    email: `user_${code}@codecollab.dev`,
                    name: `User ${code}`,
                    avatar: `https://avatars.githubusercontent.com/u/${Math.floor(Math.random() * 100000)}`,
                }
            });
        }

        const token = generateToken(user.id, user.email);

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar: user.avatar,
            }
        });
    } catch (error) {
        console.error('GitHub auth error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
}

export async function getCurrentUser(req: Request, res: Response) {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const user = await getUserById(req.user.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
}

export async function logout(req: Request, res: Response) {
    // With JWT, logout is handled client-side by removing the token
    res.json({ message: 'Logged out successfully' });
}
