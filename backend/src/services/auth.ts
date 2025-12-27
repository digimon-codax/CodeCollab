import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { config } from '../config/env';

const prisma = new PrismaClient();

export interface JWTPayload {
    userId: string;
    email: string;
    iat: number;
    exp: number;
}

export interface GitHubProfile {
    id: string;
    username: string;
    displayName: string;
    emails: Array<{ value: string; primary: boolean }>;
    photos: Array<{ value: string }>;
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
        return jwt.verify(token, config.jwt.secret) as JWTPayload;
    } catch (error) {
        console.error('JWT verification failed:', error);
        return null;
    }
}

export async function authenticateGithubUser(githubId: string, profile: GitHubProfile) {
    try {
        let user = await prisma.user.findUnique({
            where: { githubId }
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    githubId,
                    email: profile.emails[0]?.value || `${profile.username}@github.com`,
                    name: profile.displayName || profile.username,
                    avatar: profile.photos[0]?.value || null
                }
            });
        } else {
            // Update user info on each login
            user = await prisma.user.update({
                where: { id: user.id },
                data: {
                    name: profile.displayName || profile.username,
                    avatar: profile.photos[0]?.value || user.avatar,
                }
            });
        }

        return {
            token: generateToken(user.id, user.email),
            user,
        };
    } catch (error) {
        console.error('GitHub authentication error:', error);
        throw new Error('Authentication failed');
    }
}

export async function getUserById(userId: string) {
    return await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
            createdAt: true,
        }
    });
}
