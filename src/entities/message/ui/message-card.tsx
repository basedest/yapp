'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent } from 'src/shared/ui/card';
import { PiiMask, type PiiMaskRegion } from 'src/shared/ui/pii-mask';
import { cn } from 'src/shared/lib/utils';

export type MessageCardProps = {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    tokenCount?: number;
    className?: string;
    piiMaskRegions?: PiiMaskRegion[];
};

export function MessageCard({
    role,
    content,
    timestamp,
    tokenCount,
    className,
    piiMaskRegions = [],
}: MessageCardProps) {
    const t = useTranslations('chat');
    const isUser = role === 'user';
    const isAssistant = role === 'assistant';

    return (
        <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start', className)}>
            <Card
                className={cn('max-w-[80%]', isUser && 'bg-primary text-primary-foreground', isAssistant && 'bg-muted')}
            >
                <CardContent className="p-4">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <span
                                className={cn(
                                    'text-xs font-medium uppercase',
                                    isUser && 'text-primary-foreground/80',
                                    isAssistant && 'text-muted-foreground',
                                )}
                            >
                                {role}
                            </span>
                            <span
                                className={cn(
                                    'text-xs',
                                    isUser && 'text-primary-foreground/60',
                                    isAssistant && 'text-muted-foreground/60',
                                )}
                            >
                                {timestamp.toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </span>
                            {tokenCount !== undefined && tokenCount > 0 && (
                                <span
                                    className={cn(
                                        'ml-auto text-xs',
                                        isUser && 'text-primary-foreground/60',
                                        isAssistant && 'text-muted-foreground/60',
                                    )}
                                >
                                    {tokenCount} {t('tokens')}
                                </span>
                            )}
                        </div>
                        <div className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                            {piiMaskRegions.length > 0 ? (
                                <PiiMask text={content} maskRegions={piiMaskRegions} />
                            ) : (
                                <p>{content}</p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
