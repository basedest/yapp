import { toNextJsHandler } from 'better-auth/next-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from 'src/shared/backend/auth/auth.server';
import { logger } from 'src/shared/backend/logger';
import { isDisposableEmail } from 'src/shared/lib/is-disposable-email';

const handler = toNextJsHandler(auth);

async function withAuthErrorLogging(fn: (req: Request) => Promise<Response>, req: NextRequest): Promise<Response> {
    try {
        return await fn(req);
    } catch (err) {
        logger.error({ err, route: '/api/auth' }, 'Auth API error');
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(
    req: NextRequest,
    // Next.js route handler signature requires second param
    _context: { params: Promise<Record<string, string | string[]>> },
): Promise<Response> {
    return withAuthErrorLogging(handler.GET, req);
}

export async function POST(
    req: NextRequest,
    _context: { params: Promise<Record<string, string | string[]>> },
): Promise<Response> {
    if (req.nextUrl.pathname.endsWith('/sign-up/email')) {
        const body = (await req
            .clone()
            .json()
            .catch(() => null)) as { email?: unknown } | null;
        const email = typeof body?.email === 'string' ? body.email : null;
        if (email && isDisposableEmail(email)) {
            logger.warn({ domain: email.split('@')[1] }, 'blocked disposable email sign-up');
            return NextResponse.json({ message: 'disposable_email' }, { status: 422 });
        }
    }
    return withAuthErrorLogging(handler.POST, req);
}
