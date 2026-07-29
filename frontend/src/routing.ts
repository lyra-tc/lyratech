import { defineRouting } from "next-intl/routing";
import { locales, localePrefix, pathnames } from "./config";

export const routing = defineRouting({
    locales,
    defaultLocale: "es",
    localePrefix,
    pathnames,
});
