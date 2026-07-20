import type {Pathnames} from "next-intl/navigation";

export const locales = ["es","en", "fr", "de"] as const;

export const localePrefix = "never";

export type Locales = typeof locales;

export const pathnames: Pathnames<typeof locales> = {
    "/": "/",
    "/about-us": {
        en: "/about-us",
        es: "/nosotros",
        de: "/ueber-uns",
        fr: "/a-propos",
    },
    "/services": {
        en: "/services",
        es: "/servicios",
        de: "/dienstleistungen",
        fr: "/services",
    },
    "/portfolio": {
        en: "/portfolio",
        es: "/portafolio",
        de: "/portfolio",
        fr: "/portfolio",
    },
    "/contact": {
        en: "/contact",
        es: "/contacto",
        de: "/kontakt",
        fr: "/contact",
    },
    "/coming-soon": {
        en: "/coming-soon",
        es: "/proximamente",
        de: "/demnaechst",
        fr: "/bientot-disponible",
    },
    "/ricardo": "/ricardo",
    "/ezzat": "/ezzat",
    "/daniel-contreras": "/daniel-contreras",
    "/daniel-queijeiro": "/daniel-queijeiro",
    "/galo": "/galo",
    "/business-card": "/business-card",
    "/dev": "/dev",
    "/legal": "/legal",
};
