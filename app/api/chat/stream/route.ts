import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from 'src/shared/lib/auth';
import { prisma } from 'src/shared/lib/prisma';
import { getServerConfig } from 'src/shared/config/env';
import { logger } from 'src/shared/lib/logger';
import { enforceRateLimit } from 'src/shared/lib/rate-limit';
import { enforceQuota, trackTokenUsage, updateConversationTokens } from 'src/shared/lib/token-tracking';
import { getOpenRouterClient, type ChatMessage } from 'src/shared/lib/openrouter';

const requestSchema = z.object({
    conversationId: z.string().cuid(),
    content: z.string().min(1).max(4000),
});

/**
 * Sanitize user input: strip HTML tags and trim whitespace
 */
function sanitizeInput(input: string): string {
    return input.replace(/<[^>]*>/g, '').trim();
}

/**
 * Get last N messages for context window
 */
async function getContextMessages(conversationId: string, limit: number): Promise<ChatMessage[]> {
    const messages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
            role: true,
            content: true,
        },
    });

    // Reverse to get chronological order
    return messages.reverse().map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
    }));
}

export async function POST(request: NextRequest) {
    try {
        // Authenticate user
        const session = await auth.api.getSession({
            headers: request.headers,
        });

        if (!session?.user?.id) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const userId = session.user.id;

        // Parse and validate request body
        const body = await request.json();
        const parseResult = requestSchema.safeParse(body);

        if (!parseResult.success) {
            return new Response(JSON.stringify({ error: 'Invalid request', details: parseResult.error.issues }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const { conversationId, content } = parseResult.data;
        const sanitizedContent = sanitizeInput(content);

        if (sanitizedContent.length === 0) {
            return new Response(JSON.stringify({ error: 'Message cannot be empty' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Verify conversation ownership
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { userId: true, _count: { select: { messages: true } } },
        });

        if (!conversation) {
            return new Response(JSON.stringify({ error: 'Conversation not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (conversation.userId !== userId) {
            logger.warn({ conversationId, userId }, 'Unauthorized streaming access');
            return new Response(JSON.stringify({ error: 'Forbidden' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Check message count limit
        const config = getServerConfig();
        if (conversation._count.messages >= config.chat.maxMessagesPerConversation) {
            return new Response(
                JSON.stringify({
                    error: `Maximum ${config.chat.maxMessagesPerConversation} messages per conversation reached`,
                }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                },
            );
        }

        // Enforce rate limiting
        try {
            enforceRateLimit(userId);
        } catch (error) {
            return new Response(
                JSON.stringify({
                    error: error instanceof Error ? error.message : 'Rate limit exceeded',
                }),
                {
                    status: 429,
                    headers: { 'Content-Type': 'application/json' },
                },
            );
        }

        // Enforce token quota
        try {
            await enforceQuota(userId);
        } catch (error) {
            return new Response(
                JSON.stringify({
                    error: error instanceof Error ? error.message : 'Token quota exceeded',
                }),
                {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' },
                },
            );
        }

        // Save user message
        const userMessage = await prisma.message.create({
            data: {
                conversationId,
                role: 'user',
                content: sanitizedContent,
                tokenCount: 0, // Will be updated after AI response
            },
        });

        // Get context messages
        const contextMessages = await getContextMessages(conversationId, config.chat.contextWindowSize);

        // Add current user message to context
        const messages: ChatMessage[] = [...contextMessages, { role: 'user', content: sanitizedContent }];

        // Create streaming response
        const aiClient = getOpenRouterClient();
        let assistantContent = '';
        let totalTokens = 0;
        let assistantMessageId: string | null = null;

        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();

                try {
                    // Stream AI response
                    for await (const chunk of aiClient.createChatCompletionStream(messages)) {
                        if (chunk.choices[0]?.delta?.content) {
                            const content = chunk.choices[0].delta.content;
                            assistantContent += content;

                            // Send chunk to client
                            controller.enqueue(
                                encoder.encode(
                                    `data: ${JSON.stringify({
                                        type: 'content',
                                        content,
                                    })}\n\n`,
                                ),
                            );
                        }

                        // Get token usage from final chunk
                        if (chunk.usage) {
                            totalTokens = chunk.usage.total_tokens;
                        }
                    }

                    // If no token usage in stream, estimate
                    if (totalTokens === 0) {
                        totalTokens =
                            aiClient.estimateTokenCount(messages) +
                            aiClient.estimateTokenCount([{ role: 'assistant', content: assistantContent }]);
                    }

                    // Save assistant message
                    const assistantMessage = await prisma.message.create({
                        data: {
                            conversationId,
                            role: 'assistant',
                            content: assistantContent,
                            tokenCount: totalTokens,
                        },
                    });

                    assistantMessageId = assistantMessage.id;

                    // Update user message with token count
                    await prisma.message.update({
                        where: { id: userMessage.id },
                        data: { tokenCount: totalTokens },
                    });

                    // Track token usage
                    await trackTokenUsage(userId, totalTokens);
                    await updateConversationTokens(conversationId, totalTokens);

                    // Send completion event
                    controller.enqueue(
                        encoder.encode(
                            `data: ${JSON.stringify({
                                type: 'done',
                                userMessageId: userMessage.id,
                                assistantMessageId: assistantMessage.id,
                                totalTokens,
                            })}\n\n`,
                        ),
                    );

                    logger.info(
                        {
                            conversationId,
                            userId,
                            totalTokens,
                        },
                        'Streaming response completed',
                    );

                    controller.close();
                } catch (error) {
                    logger.error(
                        {
                            error,
                            conversationId,
                            userId,
                        },
                        'Streaming error',
                    );

                    // Send error event
                    controller.enqueue(
                        encoder.encode(
                            `data: ${JSON.stringify({
                                type: 'error',
                                error: 'Failed to get AI response',
                            })}\n\n`,
                        ),
                    );

                    // Clean up user message if no assistant message was created
                    if (!assistantMessageId) {
                        await prisma.message.delete({ where: { id: userMessage.id } }).catch(() => {
                            // Ignore cleanup errors
                        });
                    }

                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
            },
        });
    } catch (error) {
        logger.error({ error }, 'Streaming request failed');
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
