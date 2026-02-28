import 'server-only';
import type { PrismaClient } from 'src/generated/prisma/client';
import type {
    IMessageRepository,
    ConversationInfo,
    CreateMessageInput,
    CreatedMessage,
} from 'src/shared/backend/ports';
import type { ChatMessage } from 'src/shared/backend/openrouter';

export class MessageRepository implements IMessageRepository {
    constructor(private readonly prisma: PrismaClient) {}

    async findConversation(conversationId: string): Promise<ConversationInfo | null> {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId, deletedAt: null },
            select: { userId: true, modelId: true, _count: { select: { messages: { where: { deletedAt: null } } } } },
        });
        if (!conversation) return null;
        return {
            userId: conversation.userId,
            messageCount: conversation._count.messages,
            modelId: conversation.modelId,
        };
    }

    async findContextMessages(conversationId: string, limit: number): Promise<ChatMessage[]> {
        const messages = await this.prisma.message.findMany({
            where: { conversationId, deletedAt: null },
            orderBy: { position: 'desc' },
            take: limit,
            select: { role: true, content: true },
        });
        return messages.reverse().map((msg) => ({
            role: msg.role as 'user' | 'assistant' | 'system',
            content: msg.content,
        }));
    }

    async getNextPosition(conversationId: string): Promise<number> {
        const last = await this.prisma.message.findFirst({
            where: { conversationId, deletedAt: null },
            orderBy: { position: 'desc' },
            select: { position: true },
        });
        return (last?.position ?? 0) + 1;
    }

    async createMessage(input: CreateMessageInput): Promise<CreatedMessage> {
        const message = await this.prisma.message.create({
            data: {
                conversationId: input.conversationId,
                role: input.role,
                content: input.content,
                tokenCount: input.tokenCount ?? 0,
                modelId: input.modelId ?? null,
                cost: input.cost ?? 0,
                position: input.position,
                inputCostPer1MSnapshot: input.inputCostPer1MSnapshot ?? null,
                outputCostPer1MSnapshot: input.outputCostPer1MSnapshot ?? null,
            },
        });
        return { id: message.id, createdAt: message.createdAt };
    }

    async updateMessageTokenCount(messageId: string, tokenCount: number): Promise<void> {
        await this.prisma.message.update({
            where: { id: messageId },
            data: { tokenCount },
        });
    }

    async deleteMessage(messageId: string): Promise<void> {
        await this.prisma.message.delete({ where: { id: messageId } });
    }

    async softDeleteMessage(messageId: string): Promise<void> {
        await this.prisma.message.update({
            where: { id: messageId },
            data: { deletedAt: new Date() },
        });
    }
}
