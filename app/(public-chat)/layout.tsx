import { headers } from 'next/headers';
import { getSession } from 'src/shared/backend/auth/auth.server';
import { AppSidebar } from 'src/widgets/sidebar';
import { AuthDialog } from 'src/features/auth/auth-dialog';

export default async function PublicChatLayout({ children }: { children: React.ReactNode }) {
    const session = await getSession(await headers());

    return (
        <div className="flex h-screen">
            {session && <AppSidebar />}
            <div className="flex flex-1 flex-col">{children}</div>
            <AuthDialog />
        </div>
    );
}
