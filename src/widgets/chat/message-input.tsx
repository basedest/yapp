'use client';

import { useTranslations } from 'next-intl';
import { Button } from 'src/shared/ui/button';
import { Input } from 'src/shared/ui/input';

type MessageInputProps = {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    disabled?: boolean;
};

export function MessageInput({ value, onChange, onSubmit, disabled }: MessageInputProps) {
    const t = useTranslations('chat');

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
        }
    };

    return (
        <div className="bg-background border-t p-4">
            <div className="mx-auto max-w-3xl">
                <div className="flex gap-2">
                    <Input
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t('messageInputPlaceholder')}
                        disabled={disabled}
                        className="flex-1"
                    />
                    <Button onClick={onSubmit} disabled={disabled || !value.trim()}>
                        {t('send')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
