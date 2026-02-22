'use client';

import { Languages } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { authClient } from 'src/shared/lib/auth/auth.client';
import { trpc } from 'src/shared/api/trpc/client';
import { setLocaleCookie } from 'src/shared/lib/locale';
import {
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from 'src/shared/ui/dropdown-menu';

export function LocaleToggle() {
    const t = useTranslations('language');
    const currentLocale = useLocale();
    const router = useRouter();
    const { data: session } = authClient.useSession();
    const setLocale = trpc.user.setLocale.useMutation();

    function handleLocaleChange(newLocale: string) {
        setLocaleCookie(newLocale);
        if (session) {
            setLocale.mutate({ locale: newLocale as 'en' | 'ru' });
        }
        router.refresh();
    }

    return (
        <DropdownMenuSub>
            <DropdownMenuSubTrigger>
                <Languages className="mr-2 h-4 w-4" />
                <span>{t('title')}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
                <DropdownMenuRadioGroup value={currentLocale} onValueChange={handleLocaleChange}>
                    <DropdownMenuRadioItem value="en">
                        <span>{t('en')}</span>
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="ru">
                        <span>{t('ru')}</span>
                    </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
        </DropdownMenuSub>
    );
}
