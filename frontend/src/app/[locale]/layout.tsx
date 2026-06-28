import clsx from 'clsx';
import { getMessages, unstable_setRequestLocale } from 'next-intl/server';
import { ReactNode } from 'react';
import { locales } from '@/config';
import '../globals.css';
import { NextIntlClientProvider } from 'next-intl';
import type { Metadata } from 'next';

type Props = {
    children: ReactNode;
    params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
    return locales.map((locale) => ({ locale }));
}

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: "Lyra Technologies",
        description: "Lyra Tech website",
        icons: [
            { rel: "icon", url: "/favicon-light.ico", media: "(prefers-color-scheme: light)" },
            { rel: "icon", url: "/favicon-dark.ico", media: "(prefers-color-scheme: dark)" },
        ],
    };
}

export default async function LocaleLayout({ children, params }: Props) {
    const { locale } = await params;
    unstable_setRequestLocale(locale);
    const messages = await getMessages();

    return (
        <html className="h-full" lang={locale}>
        <body className={clsx('flex h-full flex-col')}>
        <NextIntlClientProvider messages={messages} locale={locale}>
            {children}
        </NextIntlClientProvider>
        </body>
        </html>
    );
}
