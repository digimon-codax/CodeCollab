import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',

    database: {
        url: process.env.DATABASE_URL || '',
    },

    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
    },

    github: {
        clientId: process.env.GITHUB_CLIENT_ID || '',
        clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
        callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/auth/github/callback',
    },

    jwt: {
        secret: process.env.JWT_SECRET || 'change-this-secret-key',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },

    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    },

    s3: {
        bucketName: process.env.S3_BUCKET_NAME || '',
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },

    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    },

    logging: {
        level: process.env.LOG_LEVEL || 'info',
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
    },
};

// Validate required configuration
export function validateConfig() {
    const required = [
        'DATABASE_URL',
        'JWT_SECRET',
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        console.warn(`Warning: Missing environment variables: ${missing.join(', ')}`);
    }
}
