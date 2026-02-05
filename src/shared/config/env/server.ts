import 'server-only';
import { z } from 'zod';

const logLevelSchema = z.enum(['debug', 'info', 'warn', 'error', 'fatal', 'trace']);
const nodeEnvSchema = z.enum(['development', 'production', 'test']);

const rawServerEnvSchema = z.object({
    NODE_ENV: z.string().optional(),
    DATABASE_URL: z.url().min(1, 'DATABASE_URL is required'),
    BETTER_AUTH_URL: z.url().optional(),
    BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters long'),
    LOG_LEVEL: z.string().optional(),
});

const serverEnvSchema = rawServerEnvSchema.transform((raw): ServerConfig => {
    const nodeEnv = nodeEnvSchema.catch('development').parse(raw.NODE_ENV ?? 'development');
    const logLevel = logLevelSchema.catch(nodeEnv === 'development' ? 'debug' : 'info').parse(raw.LOG_LEVEL);

    const betterAuthBaseUrl = raw.BETTER_AUTH_URL?.trim() || 'http://localhost:3000';

    return {
        nodeEnv,
        database: {
            url: raw.DATABASE_URL,
        },
        auth: {
            secret: raw.BETTER_AUTH_SECRET,
            baseUrl: betterAuthBaseUrl,
        },
        logLevel,
    };
});

export type ServerConfig = {
    nodeEnv: 'development' | 'production' | 'test';
    database: { url: string };
    auth: { secret: string; baseUrl: string };
    logLevel: 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'trace';
};

function getRawEnv(): Record<string, string | undefined> {
    return {
        NODE_ENV: process.env.NODE_ENV,
        DATABASE_URL: process.env.DATABASE_URL,
        BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
        LOG_LEVEL: process.env.LOG_LEVEL,
    };
}

let cached: ServerConfig | null = null;

export function getServerConfig(): ServerConfig {
    if (cached) return cached;
    const raw = getRawEnv();
    const parsed = serverEnvSchema.safeParse(raw);
    if (!parsed.success) {
        const tree = z.treeifyError(parsed.error);
        const message = tree.errors[0] ?? parsed.error.message;
        throw new Error(`Server config validation failed: ${message}`);
    }
    cached = parsed.data;
    return parsed.data;
}
