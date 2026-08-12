import type { MetadataRoute } from "next";
import { pathnames } from "@/config";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://lyratech.com.mx").replace(/\/$/, "");

// Only the marketing pages meant for organic search. Personal business-card
// profiles, /dev, and the admin dashboard are intentionally left out.
const publicRouteKeys = [
    "/",
    "/about-us",
    "/services",
    "/portfolio",
    "/contact",
    "/legal",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
    const paths = new Set<string>();

    for (const key of publicRouteKeys) {
        const value = pathnames[key];
        if (typeof value === "string") {
            paths.add(value);
        } else {
            Object.values(value).forEach((path) => paths.add(path));
        }
    }

    return Array.from(paths).map((path) => ({
        url: path === "/" ? siteUrl : `${siteUrl}${path}`,
        lastModified: new Date(),
    }));
}
