'use client';

import { Settings2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ThemeToggle } from 'src/features/theme/toggle-theme';
import { LocaleToggle } from 'src/features/locale';
import { Button } from 'src/shared/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from 'src/shared/ui/dropdown-menu';

export function SettingsDropdown() {
    const t = useTranslations('settings');

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t('title')}>
                    <Settings2 className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <ThemeToggle />
                <LocaleToggle />
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
