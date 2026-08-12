import { locales, pathnames } from "@/config";
import { siteUrl } from "@/lib/site";

type RouteKey = keyof typeof pathnames;

export function buildAlternates(routeKey: RouteKey, locale: string) {
    const value = pathnames[routeKey];
    const pathFor = (l: string) =>
        typeof value === "string" ? value : value[l as (typeof locales)[number]];

    const languages: Record<string, string> = {};
    for (const l of locales) {
        languages[l] = `${siteUrl}${pathFor(l)}`;
    }

    return {
        canonical: `${siteUrl}${pathFor(locale)}`,
        languages,
    };
}
