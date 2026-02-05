import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'src/generated/prisma/client';
import { getServerConfig } from 'src/shared/config/env';

const config = getServerConfig();
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const adapter = new PrismaPg({
    connectionString: config.database.url,
});

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        adapter,
    });

if (config.nodeEnv !== 'production') {
    globalForPrisma.prisma = prisma;
}
