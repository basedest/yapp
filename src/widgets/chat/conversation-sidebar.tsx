'use client';

import { useTranslations } from 'next-intl';
import { ConversationCard } from 'src/entities/conversation/ui';
import { Button } from 'src/shared/ui/button';

type ConversationSidebarProps = {
    conversations: Array<{
        id: string;
        title: string;
        totalTokens: number;
        updatedAt: Date;
        _count: {
            messages: number;
        };
    }>;
    selectedConversationId?: string;
    onConversationSelect?: (id: string) => void;
    onNewChat?: () => void;
};

export function ConversationSidebar({
    conversations,
    selectedConversationId,
    onConversationSelect,
    onNewChat,
}: ConversationSidebarProps) {
    const t = useTranslations('chat');

    return (
        <div className="bg-muted/10 w-80 border-r p-4">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">{t('conversations')}</h2>
                <Button onClick={onNewChat} size="sm">
                    {t('newChat')}
                </Button>
            </div>
            <div className="space-y-2">
                {conversations.length > 0 ? (
                    conversations.map((conv) => (
                        <ConversationCard
                            key={conv.id}
                            id={conv.id}
                            title={conv.title}
                            messageCount={conv._count.messages}
                            totalTokens={conv.totalTokens}
                            updatedAt={conv.updatedAt}
                            isActive={conv.id === selectedConversationId}
                            onClick={() => onConversationSelect?.(conv.id)}
                        />
                    ))
                ) : (
                    <p className="text-muted-foreground text-center text-sm">{t('noConversations')}</p>
                )}
            </div>
        </div>
    );
}
