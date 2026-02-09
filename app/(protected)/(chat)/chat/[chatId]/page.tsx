import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { getSession } from 'src/shared/backend/auth/auth.server';
import { prisma } from 'src/shared/backend/prisma';
import { ChatView } from 'src/pages/chat';

type ChatPageProps = {
    params: Promise<{
        chatId: string;
    }>;
};

export default async function ChatPage({ params }: ChatPageProps) {
    const { chatId } = await params;
    const parsedChatId = z.string().cuid().safeParse(chatId);
    if (!parsedChatId.success) {
        notFound();
    }

    const session = await getSession(await headers());
    if (!session) return null;

    const conversation = await prisma.conversation.findFirst({
        where: {
            id: chatId,
            userId: session.user.id,
        },
        select: { id: true },
    });

    if (!conversation) {
        notFound();
    }

    return <ChatView chatId={chatId} />;
}
