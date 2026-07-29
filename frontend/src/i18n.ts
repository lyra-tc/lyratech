import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation"
import { locales } from "./config";
import deMessages from "./messages/de.json";
import enMessages from "./messages/en.json";
import esMessages from "./messages/es.json";
import frMessages from "./messages/fr.json";

const messagesByLocale = {
    de: deMessages,
    en: enMessages,
    es: esMessages,
    fr: frMessages,
} as const;

export default getRequestConfig(async ({ requestLocale }) => {
    const locale = await requestLocale;

    if (!locale || !locales.includes(locale as never)) notFound();

    return {
        locale,
        messages: messagesByLocale[locale as keyof typeof messagesByLocale],
    };
});
