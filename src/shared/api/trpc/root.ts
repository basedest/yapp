import { createTRPCRouter } from './init';
import { conversationRouter } from 'src/entities/conversation/api';

/**
 * Root tRPC router
 * Combines all sub-routers
 */
export const appRouter = createTRPCRouter({
    conversation: conversationRouter,
});

export type AppRouter = typeof appRouter;
