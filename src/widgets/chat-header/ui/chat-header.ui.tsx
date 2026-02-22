'use client';

import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { useChats } from 'src/entities/chat';
import { useAuthDialog } from 'src/features/auth/auth-dialog';
import { SettingsDropdown } from 'src/features/settings';
import { getClientConfig } from 'src/shared/config/env/client';
import { authClient } from 'src/shared/lib/auth/auth.client';
import { Button } from 'src/shared/ui/button';
import { SidebarTrigger } from 'src/shared/ui/sidebar';
import { AppTitle } from 'src/shared/ui/app-title';
import { YappLogo } from 'src/shared/ui/yapp-logo';
import { ChatItemMenu } from 'src/widgets/chat-item-menu';

export function ChatHeader() {
    const tChat = useTranslations('chat');
    const tAuth = useTranslations('auth');
    const router = useRouter();
    const { chats, selectedChatId, handleDeleteChat, isDeletingId } = useChats();
    const clientConfig = getClientConfig();
    const { data: session, isPending } = authClient.useSession();
    const { openSignIn, openSignUp } = useAuthDialog();

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
        <div className="bg-background flex h-11 shrink-0 items-center gap-2 px-4 pt-2">
            {session ? (
                <SidebarTrigger className="md:hidden" />
            ) : !isPending ? (
                <div className="flex items-center gap-2">
                    <YappLogo size={20} className="text-primary shrink-0" />
                    <AppTitle />
                </div>
            ) : null}
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
            {!session && !isPending && (
                <div className="ml-auto flex items-center gap-2">
                    <SettingsDropdown />
                    <Button variant="ghost" size="sm" onClick={openSignIn}>
                        {tAuth('signIn')}
                    </Button>
                    <Button size="sm" onClick={openSignUp}>
                        {tAuth('signUp')}
                    </Button>
                </div>
            )}
        </div>
    );
}
