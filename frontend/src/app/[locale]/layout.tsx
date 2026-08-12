import clsx from 'clsx';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { ReactNode } from 'react';
import { locales } from '@/config';
import '../globals.css';
import { NextIntlClientProvider } from 'next-intl';
import type { Metadata } from 'next';
import { siteUrl } from '@/lib/site';
import deMessages from '@/messages/de.json';
import enMessages from '@/messages/en.json';
import esMessages from '@/messages/es.json';
import frMessages from '@/messages/fr.json';

const messagesByLocale = {
    de: deMessages,
    en: enMessages,
    es: esMessages,
    fr: frMessages,
} as const;

type Props = {
    children: ReactNode;
    params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
    return locales.map((locale) => ({ locale }));
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "metadata.home" });

    return {
        metadataBase: new URL(siteUrl),
        title: {
            template: "%s | LyraTech",
            default: `${t("title")} | LyraTech`,
        },
        description: t("description"),
        icons: [
            { rel: "icon", url: "/favicon-light.ico", media: "(prefers-color-scheme: light)" },
            { rel: "icon", url: "/favicon-dark.ico", media: "(prefers-color-scheme: dark)" },
        ],
    };
}

export default async function LocaleLayout({ children, params }: Readonly<Props>) {
    const { locale } = await params;
    setRequestLocale(locale);

    return (
        <html className="h-full" lang={locale}>
        <body className={clsx('flex h-full flex-col')}>
        <NextIntlClientProvider
            messages={messagesByLocale[locale as keyof typeof messagesByLocale]}
            locale={locale}
        >
            {children}
        </NextIntlClientProvider>
        </body>
        </html>
    );
}
