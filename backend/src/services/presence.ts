import { redis } from './redis';

export interface UserPresence {
    userId: string;
    userName: string;
    userAvatar: string | null;
    fileName: string;
    cursorLine: number;
    cursorColumn: number;
    isTyping: boolean;
    lastUpdate: number;
    color: string;
}

export class PresenceManager {
    // User colors for cursor visualization
    private userColors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
        '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
        '#52D7A6', '#FF9FF3', '#54A0FF', '#FF6348'
    ];

    private colorAssignments: Map<string, string> = new Map();

    async updatePresence(projectId: string, presence: Partial<UserPresence> & { userId: string }) {
        const key = `presence:${projectId}:${presence.userId}`;

        // Get existing presence or create new
        const existing = await this.getPresence(projectId, presence.userId);

        const fullPresence: UserPresence = {
            userId: presence.userId,
            userName: presence.userName || existing?.userName || 'Anonymous',
            userAvatar: presence.userAvatar ?? existing?.userAvatar ?? null,
            fileName: presence.fileName || existing?.fileName || '',
            cursorLine: presence.cursorLine ?? existing?.cursorLine ?? 0,
            cursorColumn: presence.cursorColumn ?? existing?.cursorColumn ?? 0,
            isTyping: presence.isTyping ?? false,
            lastUpdate: Date.now(),
            color: this.getUserColor(presence.userId),
        };

        await redis.setex(
            key,
            60, // 1 minute TTL - users must send heartbeat
            JSON.stringify(fullPresence)
        );

        return fullPresence;
    }

    async getPresence(projectId: string, userId: string): Promise<UserPresence | null> {
        const key = `presence:${projectId}:${userId}`;
        const data = await redis.get(key);

        if (!data) return null;

        try {
            return JSON.parse(data) as UserPresence;
        } catch (error) {
            console.error('Failed to parse presence data:', error);
            return null;
        }
    }

    async getProjectPresence(projectId: string): Promise<UserPresence[]> {
        const keys = await redis.keys(`presence:${projectId}:*`);
        const presences: UserPresence[] = [];

        for (const key of keys) {
            const data = await redis.get(key);
            if (data) {
                try {
                    presences.push(JSON.parse(data));
                } catch (error) {
                    console.error('Failed to parse presence:', error);
                }
            }
        }

        return presences;
    }

    async removePresence(projectId: string, userId: string) {
        const key = `presence:${projectId}:${userId}`;
        await redis.del(key);
        console.log(`Removed presence: ${userId} from ${projectId}`);
    }

    async setTyping(projectId: string, userId: string, fileName: string, isTyping: boolean) {
        const existing = await this.getPresence(projectId, userId);

        if (existing) {
            await this.updatePresence(projectId, {
                userId,
                fileName,
                isTyping,
            });
        }
    }

    async updateCursor(
        projectId: string,
        userId: string,
        fileName: string,
        line: number,
        column: number
    ) {
        const existing = await this.getPresence(projectId, userId);

        if (existing) {
            await this.updatePresence(projectId, {
                userId,
                fileName,
                cursorLine: line,
                cursorColumn: column,
            });
        }
    }

    private getUserColor(userId: string): string {
        if (this.colorAssignments.has(userId)) {
            return this.colorAssignments.get(userId)!;
        }

        const color = this.userColors[this.colorAssignments.size % this.userColors.length];
        this.colorAssignments.set(userId, color);
        return color;
    }

    async cleanupStalePresence(): Promise<number> {
        // Redis automatically handles expiration with TTL
        // This is mainly for logging and monitoring
        const pattern = 'presence:*:*';
        const keys = await redis.keys(pattern);
        let cleaned = 0;

        for (const key of keys) {
            const ttl = await redis.ttl(key);
            if (ttl === -2) { // Key doesn't exist
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`Cleaned up ${cleaned} stale presence records`);
        }

        return cleaned;
    }
}

export const presenceManager = new PresenceManager();
