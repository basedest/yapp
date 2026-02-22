'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarTrigger,
    useSidebar,
} from 'src/shared/ui/sidebar';
import { Tooltip, TooltipTrigger, TooltipContent } from 'src/shared/ui/tooltip';
import { useChats } from 'src/entities/chat';
import { AppTitle } from '~/src/shared/ui/app-title';
import { YappLogo } from '~/src/shared/ui/yapp-logo';

export function AppSidebarHeader() {
    const { open } = useSidebar();
    const t = useTranslations('sidebar');
    const router = useRouter();
    const { handleNewChat } = useChats();

    return (
        <SidebarHeader>
            <SidebarMenu>
                <SidebarMenuItem>
                    {open ? (
                        <div className="flex items-center gap-1">
                            <SidebarMenuButton
                                onClick={() => {
                                    handleNewChat();
                                    router.push('/');
                                }}
                                size="lg"
                                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground flex-1"
                            >
                                <YappLogo size={24} className="shrink-0" />
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <AppTitle />
                                </div>
                            </SidebarMenuButton>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <SidebarTrigger />
                                </TooltipTrigger>
                                <TooltipContent side="right" align="center">
                                    {t('closeSidebar')}
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    ) : (
                        <div className="flex justify-center">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <SidebarTrigger />
                                </TooltipTrigger>
                                <TooltipContent side="right" align="center">
                                    {t('openSidebar')}
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    )}
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarHeader>
    );
}
