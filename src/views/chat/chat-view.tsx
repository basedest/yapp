'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { trpc } from 'src/shared/api/trpc/client';
import { ConversationSidebar, MessageList, MessageInput } from 'src/widgets/chat';

export function ChatView() {
    const t = useTranslations('chat');
    const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>();
    const [messageInput, setMessageInput] = useState('');

    const { data: conversations, isLoading: loadingConversations } = trpc.conversation.list.useQuery();

    const handleNewChat = () => {
        setSelectedConversationId(undefined);
        setMessageInput('');
    };

    const handleSendMessage = () => {
        if (!messageInput.trim()) return;

        // TODO: Implement message sending
        console.log('Send message:', messageInput);
        setMessageInput('');
    };

    if (loadingConversations) {
        return (
            <div className="flex h-screen items-center justify-center">
                <p className="text-muted-foreground">{t('loading')}</p>
            </div>
        );
    }

    const placeholderMessages = [
        {
            id: 'placeholder',
            role: 'assistant' as const,
            content: t('welcomeMessage'),
            tokenCount: 0,
            createdAt: new Date(),
        },
    ];

    return (
        <div className="flex h-screen">
            <ConversationSidebar
                conversations={conversations ?? []}
                selectedConversationId={selectedConversationId}
                onConversationSelect={setSelectedConversationId}
                onNewChat={handleNewChat}
            />

            <div className="flex flex-1 flex-col">
                <MessageList messages={placeholderMessages} />
                <MessageInput
                    value={messageInput}
                    onChange={setMessageInput}
                    onSubmit={handleSendMessage}
                    disabled={!selectedConversationId}
                />
            </div>
        </div>
    );
}
