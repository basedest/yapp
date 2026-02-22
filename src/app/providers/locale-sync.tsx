'use client';

import { useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { authClient } from 'src/shared/lib/auth/auth.client';
import { trpc } from 'src/shared/api/trpc/client';
import { setLocaleCookie } from 'src/shared/lib/locale';

export function LocaleSync() {
    const { data: session, isPending } = authClient.useSession();
    const currentLocale = useLocale();
    const router = useRouter();
    const didSync = useRef(false);

    const { data: dbLocale } = trpc.user.getLocale.useQuery(undefined, {
        enabled: !!session && !isPending,
    });

    const setLocale = trpc.user.setLocale.useMutation();

    useEffect(() => {
        if (isPending || !session || didSync.current) return;
        if (dbLocale === undefined) return; // query not yet resolved

        didSync.current = true;

        if (dbLocale === null) {
            // New user — save current locale to DB
            setLocale.mutate({ locale: currentLocale as 'en' | 'ru' });
        } else if (dbLocale !== currentLocale) {
            // Stored preference differs — apply it
            setLocaleCookie(dbLocale);
            router.refresh();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session, isPending, dbLocale, currentLocale]);

    return null;
}
