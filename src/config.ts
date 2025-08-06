import type {Pathnames} from "next-intl/navigation";

export const locales = ["es","en", "fr", "de"] as const;

export const localePrefix = "never";

export type Locales = typeof locales;

export const pathnames: Pathnames<typeof locales> = {
    "/": "/",
    "about-us": "about-us",
    "coming-soon": "coming-soon",
    "ricardo": "ricardo",
    "ezzat": "ezzat",
    "daniel-contreras": "daniel-contreras",
    "daniel-queijeiro": "daniel-queijeiro",
    "galo": "galo",
};