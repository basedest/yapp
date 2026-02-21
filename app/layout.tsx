import type { Metadata } from 'next';
import { Geist, Geist_Mono, Righteous } from 'next/font/google';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
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

const righteous = Righteous({
    weight: '400',
    variable: '--font-righteous',
    subsets: ['latin'],
});

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getLocale();
    const t = await getTranslations({ locale, namespace: 'metadata' });
    return {
        title: t('title'),
        description: t('description'),
        icons: {
            icon: '/yapp-icon.svg',
        },
    };
}

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const locale = await getLocale();
    const messages = await getMessages();

    return (
        <html lang={locale} suppressHydrationWarning>
            <body className={`${geistSans.variable} ${geistMono.variable} ${righteous.variable} antialiased`}>
                <AppProviders locale={locale} messages={messages}>
                    <SidebarInset>{children}</SidebarInset>
                    <Analytics />
                </AppProviders>
            </body>
        </html>
    );
}
