import createMiddleware from "next-intl/middleware";
import { locales, pathnames, localePrefix } from "./config";

export default createMiddleware({
    locales,
    defaultLocale: "es",
    localePrefix: localePrefix as "always" | "never" | "as-needed",
    pathnames,
})
export const config = {
    matcher: ["/", "/((?!api|static|.*\\..*|_next|dashboard).*)"],
};
