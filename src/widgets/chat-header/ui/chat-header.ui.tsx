'use client';

import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { useChats } from 'src/entities/chat';
import { getClientConfig } from 'src/shared/config/env/client';
import { Button } from 'src/shared/ui/button';
import { SidebarTrigger } from 'src/shared/ui/sidebar';
import { ChatItemMenu } from 'src/widgets/chat-item-menu';

export function ChatHeader() {
    const tChat = useTranslations('chat');
    const router = useRouter();
    const { chats, selectedChatId, handleDeleteChat, isDeletingId } = useChats();
    const clientConfig = getClientConfig();

    const selectedChat = selectedChatId ? chats.find((chat) => chat.id === selectedChatId) : undefined;
    const titleRef = useRef<HTMLSpanElement | null>(null);
    const [forceEllipsis, setForceEllipsis] = useState(false);

    useEffect(() => {
        if (!selectedChat || !titleRef.current) return;
        const titleEl = titleRef.current;
        const isOverflowing = titleEl.scrollWidth > titleEl.clientWidth;
        const shouldForceEllipsis =
            selectedChat.title.length >= clientConfig.chat.maxConversationTitleLength && !isOverflowing;
        queueMicrotask(() => setForceEllipsis(shouldForceEllipsis));
    }, [selectedChat?.id, selectedChat?.title, clientConfig.chat.maxConversationTitleLength, selectedChat]);

    return (
        <div className="bg-background flex h-11 shrink-0 items-center gap-2 px-4">
            <SidebarTrigger className="md:hidden" />
            <div className="flex min-w-0 flex-1 items-center">
                {selectedChat && (
                    <ChatItemMenu
                        chatId={selectedChat.id}
                        chatTitle={selectedChat.title}
                        onDelete={(chatId) => handleDeleteChat(chatId, () => router.push('/'))}
                        isDeleting={isDeletingId === selectedChat.id}
                        trigger={
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-foreground h-8 w-auto justify-start overflow-hidden px-2 text-left"
                                aria-label={tChat('conversationActions')}
                            >
                                <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
                                    <span
                                        className="block min-w-0 flex-1 overflow-hidden text-left text-sm font-medium text-ellipsis whitespace-nowrap"
                                        title={selectedChat.title}
                                        ref={titleRef}
                                    >
                                        {selectedChat.title}
                                        {forceEllipsis ? '...' : ''}
                                    </span>
                                    <ChevronDown className="size-4 shrink-0 opacity-70" />
                                </span>
                            </Button>
                        }
                    />
                )}
            </div>
        </div>
    );
}
