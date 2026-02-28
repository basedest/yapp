export interface ITokenTracker {
    /**
     * Check quota before operation and throw if exceeded.
     * @throws Error if quota is exceeded
     */
    enforceQuota(userId: string): Promise<void>;

    /**
     * Track token usage and cost for a user.
     */
    trackUsage(userId: string, tokenCount: number, cost?: number): Promise<void>;

    /**
     * Update conversation total tokens and cost.
     */
    updateConversationTokens(conversationId: string, tokenCount: number, cost?: number): Promise<void>;
}
