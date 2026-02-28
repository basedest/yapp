import type { ChatMessage } from 'src/shared/backend/openrouter';

export interface ConversationInfo {
    userId: string;
    messageCount: number;
    modelId: string;
}

export interface CreateMessageInput {
    conversationId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    tokenCount?: number;
    modelId?: string;
    cost?: number; // micro-USD integer
    position: number;
    inputCostPer1MSnapshot?: number; // micro-USD
    outputCostPer1MSnapshot?: number; // micro-USD
}

export interface CreatedMessage {
    id: string;
    createdAt: Date;
}

export interface IMessageRepository {
    findConversation(conversationId: string): Promise<ConversationInfo | null>;

    findContextMessages(conversationId: string, limit: number): Promise<ChatMessage[]>;

    getNextPosition(conversationId: string): Promise<number>;

    createMessage(input: CreateMessageInput): Promise<CreatedMessage>;

    updateMessageTokenCount(messageId: string, tokenCount: number): Promise<void>;

    /** Hard delete — only for error rollback before assistant message is created */
    deleteMessage(messageId: string): Promise<void>;

    /** Soft delete — sets deletedAt, preserves audit trail */
    softDeleteMessage(messageId: string): Promise<void>;
}
