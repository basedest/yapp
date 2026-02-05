'use client';

import { MessageCard } from 'src/entities/message/ui';

type Message = {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    tokenCount: number;
    createdAt: Date;
};

type MessageListProps = {
    messages: Message[];
};

export function MessageList({ messages }: MessageListProps) {
    return (
        <div className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-3xl space-y-4">
                {messages.map((message) => (
                    <MessageCard
                        key={message.id}
                        role={message.role}
                        content={message.content}
                        timestamp={message.createdAt}
                        tokenCount={message.tokenCount}
                    />
                ))}
            </div>
        </div>
    );
}
