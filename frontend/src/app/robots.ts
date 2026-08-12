import type { MetadataRoute } from "next";
import { siteUrl, isProductionSite } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
    // Dev/staging deploys share this same code but must never be indexed —
    // otherwise Google ends up with duplicate content next to production.
    if (!isProductionSite) {
        return {
            rules: {
                userAgent: "*",
                disallow: "/",
            },
        };
    }

    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: [
                "/dashboard",
                "/dev",
                "/ricardo",
                "/ricardo-v3",
                "/ricardo-v4",
                "/ezzat",
                "/daniel-contreras",
                "/daniel-queijeiro",
                "/galo",
                "/business-card",
            ],
        },
        sitemap: `${siteUrl}/sitemap.xml`,
    };
}
