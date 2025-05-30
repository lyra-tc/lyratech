import {
    createLocalizedPathnamesNavigation,
    Pathnames,
} from "next-intl/navigation";

export const locales: string[] = ["en", "es", "de", "fr"] as const;
export const localePrefix = "never";
export const pathnames = {
    "/": "/",
    "/about-us": {
        en: "/about-us",
        es: "/nosotros",
        de: "/ueber-uns",
        fr: "/a-propos",
    },
} satisfies Pathnames<typeof locales>;

export const { Link, redirect, usePathname, useRouter } =
    createLocalizedPathnamesNavigation({
        locales,
        localePrefix,
        pathnames,
    });
