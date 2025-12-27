import { Request, Response } from 'express';
import { generateToken } from '../services/auth';
import { User } from '../models';
import bcrypt from 'bcryptjs';

// Mock GitHub OAuth for development
export async function githubCallback(req: Request, res: Response) {
    try {
        const { code } = req.body;

        if (!code) {
            res.status(400).json({ error: 'Authorization code required' });
            return;
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

export async function signup(req: Request, res: Response) {
    try {
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            res.status(400).json({ error: 'All fields are required' });
            return;
        }

        if (password.length < 6) {
            res.status(400).json({ error: 'Password must be at least 6 characters' });
            return;
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            res.status(400).json({ error: 'Email already registered' });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            email,
            password: hashedPassword,
            name,
            avatar: `https://avatars.githubusercontent.com/u/${Math.floor(Math.random() * 1000)}?v=4`,
        });

        const token = generateToken(user._id.toString(), user.email);

        res.status(201).json({
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                avatar: user.avatar,
            },
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Failed to create account' });
    }
}

export async function login(req: Request, res: Response) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }

        const user = await User.findOne({ email }).select('+password');
        if (!user || !user.password) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
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
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
}

export async function getCurrentUser(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.userId;

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const user = await User.findById(userId).select('-__v');

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
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

export async function logout(_req: Request, res: Response) {
    res.json({ message: 'Logged out successfully' });
}
