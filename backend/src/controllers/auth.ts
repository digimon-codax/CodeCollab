import { Request, Response } from 'express';
import { generateToken, verifyToken } from '../services/auth';
import { User } from '../models';

// Mock GitHub OAuth for development
export async function githubCallback(req: Request, res: Response) {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Authorization code required' });
        }

        // In development, create/find user based on code as identifier
        const githubId = `github_${code}`;
        const email = `${code}@example.com`;
        const name = code.charAt(0).toUpperCase() + code.slice(1);

        let user = await User.findOne({ githubId });

        if (!user) {
            user = await User.create({
                email,
                name,
                githubId,
                avatar: `https://avatars.githubusercontent.com/u/${Math.floor(Math.random() * 1000)}?v=4`,
            });
        }

        const token = generateToken(user._id.toString(), user.email);

        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                avatar: user.avatar,
            },
        });
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
}

export async function getCurrentUser(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const user = await User.findById(userId).select('-__v');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            id: user._id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            createdAt: user.createdAt,
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
}

export async function logout(req: Request, res: Response) {
    res.json({ message: 'Logged out successfully' });
}
