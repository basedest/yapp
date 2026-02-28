import 'server-only';
import type { PrismaClient } from 'src/generated/prisma/client';
import { logger } from 'src/shared/backend/logger';
import { toMicroUSD } from 'src/shared/config/models';

export type ChatTokenConfig = {
    dailyTokenLimit: number;
    dailyCostBudgetUsd: number;
};

export type TokenUsageResult = {
    used: number;
    limit: number;
    remaining: number;
    resetAt: Date;
    costUsed: number;
    costBudget: number;
};

export type QuotaCheckResult = {
    allowed: boolean;
    usage: TokenUsageResult;
};

/**
 * Get today's date at midnight UTC for daily token tracking
 */
function getTodayUTC(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Get tomorrow's date at midnight UTC (reset time)
 */
function getTomorrowUTC(): Date {
    const today = getTodayUTC();
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    return tomorrow;
}

/**
 * Token tracking service for quota enforcement and usage tracking
 */
export class TokenTrackingService {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly config: ChatTokenConfig,
    ) {}

    async enforceQuota(userId: string): Promise<void> {
        const check = await this.checkQuota(userId);
        if (!check.allowed) {
            const resetTime = check.usage.resetAt.toISOString();
            logger.warn(
                { userId, costUsed: check.usage.costUsed, costBudget: check.usage.costBudget },
                'User exceeded daily cost quota',
            );
            throw new Error(`Daily quota exceeded. Quota resets at ${resetTime}.`);
        }
    }

    async trackUsage(userId: string, tokenCount: number, cost?: number): Promise<void> {
        const today = getTodayUTC();
        try {
            await this.prisma.tokenUsage.upsert({
                where: {
                    userId_date: { userId, date: today },
                },
                update: {
                    totalTokens: { increment: tokenCount },
                    ...(cost != null ? { totalCost: { increment: cost } } : {}),
                },
                create: {
                    userId,
                    date: today,
                    totalTokens: tokenCount,
                    totalCost: cost ?? 0,
                },
            });
            logger.debug({ userId, tokenCount, cost, date: today }, 'Token usage tracked');
        } catch (error) {
            logger.error({ error, userId, tokenCount }, 'Failed to track token usage');
            throw error;
        }
    }

    async updateConversationTokens(conversationId: string, tokenCount: number, cost?: number): Promise<void> {
        try {
            await this.prisma.conversation.update({
                where: { id: conversationId },
                data: {
                    totalTokens: { increment: tokenCount },
                    ...(cost != null ? { totalCost: { increment: cost } } : {}),
                },
            });
            logger.debug({ conversationId, tokenCount, cost }, 'Conversation tokens updated');
        } catch (error) {
            logger.error({ error, conversationId, tokenCount }, 'Failed to update conversation tokens');
            throw error;
        }
    }

    async getCurrentUsage(userId: string): Promise<TokenUsageResult> {
        const today = getTodayUTC();
        const usage = await this.prisma.tokenUsage.findUnique({
            where: { userId_date: { userId, date: today } },
        });
        const used = usage?.totalTokens ?? 0;
        const costUsed = usage?.totalCost ?? 0; // micro-USD
        const limit = this.config.dailyTokenLimit;
        const costBudget = toMicroUSD(this.config.dailyCostBudgetUsd); // micro-USD
        const remaining = Math.max(0, limit - used);
        return { used, limit, remaining, resetAt: getTomorrowUTC(), costUsed, costBudget };
    }

    async checkQuota(userId: string): Promise<QuotaCheckResult> {
        const usage = await this.getCurrentUsage(userId);
        // Cost-based quota check takes priority
        const allowed = usage.costUsed < usage.costBudget;
        logger.debug({ userId, costUsed: usage.costUsed, costBudget: usage.costBudget, allowed }, 'Cost quota check');
        return { allowed, usage };
    }
}
