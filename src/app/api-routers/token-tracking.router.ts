import { createTRPCRouter, protectedProcedure } from './init';
import { getServerConfig } from 'src/shared/config/env';
import { prisma } from 'src/shared/backend/prisma';
import { TokenTrackingService } from '~/src/shared/backend/token-tracking';
import { TOKEN_TRACKER } from '~/src/shared/backend/container';

export const tokenTrackingRouter = createTRPCRouter({
    /**
     * Get current token usage for the user
     */
    getUsage: protectedProcedure.query(async ({ ctx }) => {
        const TokenTracker = ctx.container.resolve<TokenTrackingService>(TOKEN_TRACKER);
        const usage = await TokenTracker.getCurrentUsage(ctx.userId);

        return {
            used: usage.used,
            limit: usage.limit,
            remaining: usage.remaining,
            percentage: Math.min(100, (usage.used / usage.limit) * 100),
            resetAt: usage.resetAt,
        };
    }),

    /**
     * Get all user quotas for the Settings/Usage page (cost-based + conversation usage)
     */
    getAccountQuotas: protectedProcedure.query(async ({ ctx }) => {
        const TokenTracker = ctx.container.resolve<TokenTrackingService>(TOKEN_TRACKER);

        const config = getServerConfig();
        const [tokenUsage, conversationCount] = await Promise.all([
            TokenTracker.getCurrentUsage(ctx.userId),
            prisma.conversation.count({ where: { userId: ctx.userId } }),
        ]);

        const conversationLimit = config.chat.maxConversationsPerUser;
        const conversationRemaining = Math.max(0, conversationLimit - conversationCount);
        const costPercentage =
            tokenUsage.costBudget > 0 ? Math.min(100, (tokenUsage.costUsed / tokenUsage.costBudget) * 100) : 0;

        return {
            usage: {
                percentage: costPercentage,
                resetAt: tokenUsage.resetAt,
                exceeded: tokenUsage.costUsed >= tokenUsage.costBudget,
            },
            conversation: {
                count: conversationCount,
                limit: conversationLimit,
                remaining: conversationRemaining,
            },
        };
    }),
});
