import Redis from 'ioredis';
import { config } from '../config/env';

class RedisService {
    private client: Redis | null = null;

    getClient(): Redis {
        if (!this.client) {
            console.log(`Connecting to Redis at: ${config.redis.url.split('@').pop()} (sanitized)`);

            this.client = new Redis(config.redis.url, {
                maxRetriesPerRequest: 3,
                retryStrategy(times) {
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                },
                // Prevents crashing if the server is unreachable
                enableOfflineQueue: true,
            });

            this.client.on('error', (err) => {
                console.error('Redis Connection Error:', err.message);
                if (err.message.includes('ECONNREFUSED')) {
                    console.warn('⚠️ Redis is not reachable. Check your REDIS_URL environment variable.');
                }
            });

            this.client.on('connect', () => {
                console.log('✅ Connected to Redis successfully');
            });
        }
        return this.client;
    }
}

export const redisService = new RedisService();
export const redis = redisService.getClient();
