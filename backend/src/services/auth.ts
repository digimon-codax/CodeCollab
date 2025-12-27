import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { User } from '../models';

export interface JWTPayload {
    userId: string;
    email: string;
}

export function generateToken(userId: string, email: string): string {
    return jwt.sign(
        { userId, email },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
    );
}

export function verifyToken(token: string): JWTPayload | null {
    try {
        const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
        return decoded;
    } catch (error) {
        return null;
    }
}

export async function authenticateGithubUser(
    githubId: string,
    email: string,
    name: string,
    avatar: string | null
) {
    try {
        let user = await User.findOne({ githubId });

        if (!user) {
            user = await User.create({
                githubId,
                email,
                name,
                avatar,
            });
        } else {
            // Update existing user
            user.name = name;
            user.avatar = avatar;
            await user.save();
        }

        const token = generateToken(user._id.toString(), user.email);

        return {
            user,
            token,
        };
    } catch (error) {
        console.error('GitHub auth error:', error);
        throw error;
    }
}

export async function getUserById(userId: string) {
    return await User.findById(userId).select('-__v');
}
