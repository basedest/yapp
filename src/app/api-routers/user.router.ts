import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from 'src/app/api-routers/init';
import { prisma } from 'src/shared/backend/prisma';
import { routing } from '~/i18n/routing';

export const userRouter = createTRPCRouter({
    getLocale: protectedProcedure.query(async ({ ctx }) => {
        const user = await prisma.user.findUnique({
            where: { id: ctx.userId },
            select: { locale: true },
        });
        return user?.locale ?? null;
    }),

    setLocale: protectedProcedure
        .input(z.object({ locale: z.enum(routing.locales) }))
        .mutation(async ({ ctx, input }) => {
            await prisma.user.update({
                where: { id: ctx.userId },
                data: { locale: input.locale },
            });
        }),
});
