import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation"
import { locales } from "./config";

export default getRequestConfig(async ({ requestLocale }) => {
    const locale = await requestLocale;

    if (!locale || !locales.includes(locale as never)) notFound();

    return {
        locale,
        messages: (
            await (locale === "es"
                ? import("./messages/es.json")
                : import(`./messages/${locale}.json`))
        ).default,
    };
});