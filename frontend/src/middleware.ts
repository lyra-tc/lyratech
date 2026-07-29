import createMiddleware from "next-intl/middleware";
import { routing } from "./routing";

export default createMiddleware(routing);

export const config = {
    matcher: ["/", "/((?!api|static|.*\\..*|_next|dashboard).*)"],
};
