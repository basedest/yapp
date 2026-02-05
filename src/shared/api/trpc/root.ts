import { createTRPCRouter } from './init';
import { conversationRouter } from 'src/entities/conversation/api';
import { messageRouter } from 'src/entities/message/api';
import { tokenTrackingRouter } from 'src/shared/lib/token-tracking/router';
import { piiDetectionRouter } from 'src/shared/lib/pii-detection/router';
import { piiDetectionAdminRouter } from 'src/shared/lib/pii-detection/admin-router';

/**
 * Root tRPC router
 * Combines all sub-routers
 */
export const appRouter = createTRPCRouter({
    conversation: conversationRouter,
    message: messageRouter,
    tokenTracking: tokenTrackingRouter,
    piiDetection: piiDetectionRouter,
    piiDetectionAdmin: piiDetectionAdminRouter,
});

export type AppRouter = typeof appRouter;
