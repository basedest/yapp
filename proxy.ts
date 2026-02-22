import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const LOCALE_COOKIE = 'NEXT_LOCALE';
const LOCALE_HEADER = 'X-NEXT-INTL-LOCALE';

function detectLocale(request: NextRequest): string {
    const { locales, defaultLocale } = routing;

    // 1. Cookie
    const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
    if (cookie && (locales as readonly string[]).includes(cookie)) {
        return cookie;
    }

    // 2. Accept-Language header
    const acceptLanguage = request.headers.get('Accept-Language');
    if (acceptLanguage) {
        const preferred = acceptLanguage
            .split(',')
            .map((part) => part.split(';')[0].trim().slice(0, 2))
            .find((lang) => (locales as readonly string[]).includes(lang));
        if (preferred) return preferred;
    }

    return defaultLocale;
}

export function proxy(request: NextRequest) {
    const locale = detectLocale(request);
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(LOCALE_HEADER, locale);
    return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico|.*\\..*).*)'],
};
