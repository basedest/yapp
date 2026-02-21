import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { getLocale, getMessages } from 'next-intl/server';
import { AppProviders } from 'src/app';
import './globals.css';
import { SidebarInset } from 'src/shared/ui/sidebar';
import { Analytics } from '@vercel/analytics/next';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    title: 'Promptify', // TODO: Add title with i18n
    description: 'Promptify is a AI chat platform with security and privacy in mind.', // TODO: Add description with i18n
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const locale = await getLocale();
    const messages = await getMessages();

    return (
        <html lang={locale} suppressHydrationWarning>
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <AppProviders locale={locale} messages={messages}>
                    <SidebarInset>{children}</SidebarInset>
                    <Analytics />
                </AppProviders>
            </body>
        </html>
    );
}
