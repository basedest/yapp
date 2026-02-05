import { redirect } from 'next/navigation';
import { auth } from 'src/shared/lib/auth';
import { ChatView } from 'src/views/chat';

export default async function Home() {
    const session = await auth.api.getSession({
        headers: await (async () => {
            const { headers } = await import('next/headers');
            return headers();
        })(),
    });

    if (!session) {
        redirect('/login');
    }

    return <ChatView />;
}
