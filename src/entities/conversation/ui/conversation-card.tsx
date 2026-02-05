'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'src/shared/ui/card';
import { cn } from 'src/shared/lib/utils';

export type ConversationCardProps = {
    id: string;
    title: string;
    messageCount?: number;
    totalTokens?: number;
    updatedAt: Date;
    isActive?: boolean;
    onClick?: () => void;
    className?: string;
};

export function ConversationCard({
    title,
    messageCount,
    totalTokens,
    updatedAt,
    isActive,
    onClick,
    className,
}: ConversationCardProps) {
    const t = useTranslations('chat');
    const formattedDate = updatedAt.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: updatedAt.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });

    return (
        <Card
            className={cn(
                'hover:bg-accent cursor-pointer transition-colors',
                isActive && 'border-primary bg-accent',
                className,
            )}
            onClick={onClick}
        >
            <CardHeader className="pb-3">
                <CardTitle className="line-clamp-2 text-base leading-tight font-semibold">{title}</CardTitle>
                <CardDescription className="text-xs">{formattedDate}</CardDescription>
            </CardHeader>
            {(messageCount !== undefined || totalTokens !== undefined) && (
                <CardContent className="pb-4">
                    <div className="text-muted-foreground flex items-center gap-4 text-xs">
                        {messageCount !== undefined && (
                            <div className="flex items-center gap-1">
                                <span className="font-medium">{messageCount}</span>
                                <span>{messageCount === 1 ? t('message') : t('messages')}</span>
                            </div>
                        )}
                        {totalTokens !== undefined && totalTokens > 0 && (
                            <div className="flex items-center gap-1">
                                <span className="font-medium">{totalTokens.toLocaleString()}</span>
                                <span>{t('tokens')}</span>
                            </div>
                        )}
                    </div>
                </CardContent>
            )}
        </Card>
    );
}
