import createMiddleware from "next-intl/middleware";
import { locales, pathnames, localePrefix } from "./config";

export default createMiddleware({
    locales,
    defaultLocale: "es",
    localePrefix: localePrefix as "always" | "never" | "as-needed",
    pathnames,
})
export const config = {
    // Ajusta el patrón para que coincida con los idiomas soportados en tu app
    matcher: ["/", "/((?!api|static|.*\\..*|_next).*)"],
};
