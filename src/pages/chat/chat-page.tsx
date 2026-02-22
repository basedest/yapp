'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { trpc } from 'src/shared/api/trpc/client';
import { useAuthDialog } from 'src/features/auth/auth-dialog';
import { getClientConfig } from 'src/shared/config/env/client';
import { authClient } from 'src/shared/lib/auth/auth.client';
import { MessageList } from 'src/widgets/message-list';
import { MessageInput } from 'src/widgets/message-input';
import { ErrorBanner } from 'src/widgets/error-banner';
import { useStreamMessage } from 'src/features/message/send-message/use-stream-message';
import { ChatHeader } from 'src/widgets/chat-header';
import { useChats } from 'src/entities/chat';
import { Skeleton } from 'src/shared/ui/skeleton';

const GREETING_COUNT = 8;

type ErrorType = 'network' | 'quota' | 'rateLimit' | 'session' | 'conversationLimit' | null;
type DisplayMessage = {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    tokenCount: number;
    createdAt: Date;
};
type MessageListItem = {
    id: string;
    role: string;
    content: string;
    tokenCount: number;
    createdAt: Date | string;
};

type ChatViewProps = {
    chatId?: string;
};

/**
 * Map tRPC error code to ErrorType
 */
function mapErrorType(error: unknown): ErrorType {
    if (error && typeof error === 'object' && 'data' in error) {
        const trpcError = error as { data?: { code?: string }; message?: string };
        const code = trpcError.data?.code;
        const message = trpcError.message?.toLowerCase() || '';

        if (code === 'TOO_MANY_REQUESTS') {
            return 'rateLimit';
        }
        if (code === 'FORBIDDEN' && (message.includes('quota') || message.includes('token'))) {
            return 'quota';
        }
        if (code === 'UNAUTHORIZED' || message.includes('session')) {
            return 'session';
        }
        if (code === 'BAD_REQUEST' && message.includes('maximum') && message.includes('conversations')) {
            return 'conversationLimit';
        }
    }
    return 'network';
}

export function ChatView({ chatId }: ChatViewProps) {
    const t = useTranslations('chat');
    const tAuth = useTranslations('auth');
    const utils = trpc.useUtils();
    const clientConfig = getClientConfig();
    const { data: session, isPending: sessionPending } = authClient.useSession();
    const { openSignIn } = useAuthDialog();
    const [streamError, setStreamError] = useState<string | null>(null);
    const [optimisticMessage, setOptimisticMessage] = useState<DisplayMessage | null>(null);
    const [pendingChatId, setPendingChatId] = useState<string | null>(null);
    const [greetingIndex] = useState(() => Math.floor(Math.random() * GREETING_COUNT));

    const {
        loadingChats,
        selectedChatId,
        messageInput,
        setSelectedChatId,
        setMessageInput,
        handleNewChat,
        createChatMutation,
        deleteChatMutation,
    } = useChats();
    const activeChatId = chatId ?? selectedChatId;
    const { data: messages, isLoading: loadingMessages } = trpc.message.list.useQuery(
        { conversationId: activeChatId! },
        { enabled: !!activeChatId && !!session },
    );

    const { isStreaming, streamingContent, piiMaskRegions, sendMessage } = useStreamMessage();

    useEffect(() => {
        if (chatId && chatId !== selectedChatId) {
            setSelectedChatId(chatId);
            return;
        }

        if (!chatId && selectedChatId && pendingChatId === null && !isStreaming && !createChatMutation.isPending) {
            handleNewChat();
        }
    }, [
        chatId,
        selectedChatId,
        pendingChatId,
        setSelectedChatId,
        handleNewChat,
        isStreaming,
        createChatMutation.isPending,
    ]);

    const error: ErrorType = useMemo(() => {
        if (streamError) {
            if (streamError.includes('quota') || streamError.includes('token')) {
                return 'quota';
            }
            if (streamError.includes('rate limit')) {
                return 'rateLimit';
            }
            if (streamError.includes('Unauthorized') || streamError.includes('session')) {
                return 'session';
            }
            return 'network';
        }
        if (createChatMutation.error) {
            return mapErrorType(createChatMutation.error);
        }
        if (deleteChatMutation.error) {
            return mapErrorType(deleteChatMutation.error);
        }
        return null;
    }, [streamError, createChatMutation.error, deleteChatMutation.error]);

    const handleSendMessage = async () => {
        if (!messageInput.trim() || isStreaming || createChatMutation.isPending) return;
        if (!session) {
            openSignIn();
            return;
        }

        const content = messageInput.trim();
        setStreamError(null);

        // Create optimistic message to show immediately
        const tempMessage = {
            id: 'temp-' + Date.now(),
            role: 'user' as const,
            content,
            tokenCount: 0,
            createdAt: new Date(),
        };

        // Clear input and show optimistic message immediately
        setMessageInput('');
        setOptimisticMessage(tempMessage);

        // If no chat is selected, create one first
        if (!activeChatId) {
            // Generate title from first message (truncate to maxConversationTitleLength)
            const title = content.slice(0, clientConfig.chat.maxConversationTitleLength);
            createChatMutation.mutate(
                { title },
                {
                    onSuccess: async (chat) => {
                        setPendingChatId(chat.id);
                        await sendMessage({
                            conversationId: chat.id,
                            content,
                            onComplete: async () => {
                                await utils.message.list.invalidate({ conversationId: chat.id });
                                setOptimisticMessage(null);
                                await utils.chat.list.invalidate();
                                await utils.tokenTracking.getUsage.invalidate();
                                // Stay on root page, update URL only - avoids remount/empty-state flicker
                                if (typeof window !== 'undefined') {
                                    const locale = window.location.pathname.split('/').filter(Boolean)[0] ?? 'en';
                                    window.history.replaceState(null, '', `/${locale}/chat/${chat.id}`);
                                }
                            },
                            onError: (error) => {
                                setStreamError(error);
                                setOptimisticMessage(null);
                            },
                        });
                    },
                    onError: () => {
                        setOptimisticMessage(null);
                    },
                },
            );
        } else {
            await sendMessage({
                conversationId: activeChatId,
                content,
                onComplete: async () => {
                    await utils.message.list.invalidate({ conversationId: activeChatId });
                    setOptimisticMessage(null);
                    await utils.chat.list.invalidate();
                    await utils.tokenTracking.getUsage.invalidate();
                },
                onError: (error) => {
                    setStreamError(error);
                    setOptimisticMessage(null);
                },
            });
        }
    };

    if (loadingChats && !!session) {
        return (
            <div className="flex flex-1 flex-col">
                <ChatHeader />
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="mx-auto max-w-3xl space-y-4">
                        <div className="flex justify-start py-3">
                            <div className="w-[75%] space-y-2 p-4">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-4/5" />
                                <Skeleton className="h-4 w-3/5" />
                            </div>
                        </div>
                        <div className="flex justify-end py-3">
                            <Skeleton className="h-10 w-2/5 rounded-2xl" />
                        </div>
                        <div className="flex justify-start py-3">
                            <div className="w-[75%] space-y-2 p-4">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const baseMessages: DisplayMessage[] = activeChatId
        ? (messages ?? []).map((msg: MessageListItem) => ({
              ...msg,
              role: msg.role as DisplayMessage['role'],
              createdAt: new Date(msg.createdAt),
          }))
        : [];

    // Add optimistic message if it exists and doesn't duplicate a real message.
    const displayMessages = optimisticMessage
        ? baseMessages.some((m) => m.content === optimisticMessage.content && m.role === 'user')
            ? baseMessages
            : [...baseMessages, optimisticMessage]
        : baseMessages;

    // Only show empty chat greeting when truly idle with no chat activity in progress
    const isEmptyChat =
        !activeChatId && !optimisticMessage && !pendingChatId && !isStreaming && !createChatMutation.isPending;

    const errorBannerEl = (
        <ErrorBanner
            error={error}
            onDismiss={() => {
                setStreamError(null);
                createChatMutation.reset();
                deleteChatMutation.reset();
            }}
        />
    );

    const messageInputEl = (
        <MessageInput
            value={messageInput}
            onChange={setMessageInput}
            onSubmit={handleSendMessage}
            disabled={false}
            isSubmitting={isStreaming || createChatMutation.isPending}
            isAtBottom={!isEmptyChat}
        />
    );

    if (isEmptyChat) {
        return (
            <div className="flex flex-1 flex-col pb-4">
                <ChatHeader />
                {errorBannerEl}
                <div className="flex flex-1 flex-col md:items-center md:justify-center md:gap-6">
                    <div className="flex flex-1 items-center justify-center p-4 md:flex-none md:p-0">
                        <h1 className="text-foreground text-center text-3xl font-semibold tracking-tight md:text-4xl">
                            {!session && !sessionPending ? t('guestGreeting') : t(`greetings.${greetingIndex}`)}
                        </h1>
                    </div>
                    <div className="w-full md:max-w-3xl md:px-4">{messageInputEl}</div>
                </div>
                {!session && !sessionPending && (
                    <p className="text-muted-foreground dark:text-muted-foreground/40 text-center text-xs">
                        {tAuth('agreeToContinue')}{' '}
                        <Link href="/terms" className="hover:text-primary underline underline-offset-4">
                            {tAuth('termsOfService')}
                        </Link>{' '}
                        {tAuth('and')}{' '}
                        <Link href="/privacy-policy" className="hover:text-primary underline underline-offset-4">
                            {tAuth('privacyPolicy')}
                        </Link>
                        .
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col">
            <ChatHeader />
            {errorBannerEl}
            <MessageList
                messages={displayMessages}
                isLoading={loadingMessages && !isStreaming && !optimisticMessage}
                isStreaming={isStreaming}
                streamingContent={streamingContent}
                streamingPiiMaskRegions={piiMaskRegions}
            />
            {messageInputEl}
        </div>
    );
}
