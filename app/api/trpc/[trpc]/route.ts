import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from 'src/shared/api/trpc/root';
import { createTRPCContext } from 'src/shared/api/trpc/init';

const handler = (req: Request) =>
    fetchRequestHandler({
        endpoint: '/api/trpc',
        req,
        router: appRouter,
        createContext: createTRPCContext,
        onError: ({ path, error }) => {
            console.error(`tRPC Error on '${path}':`, error);
        },
    });

export { handler as GET, handler as POST };
