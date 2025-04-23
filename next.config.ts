import type { NextConfig } from "next";
import withNextIntl from "next-intl/plugin";

const nextConfig: NextConfig = {
    /* config options here */
    output: "standalone",

    /* Configuration for remote images */
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "flagcdn.com",
            },
        ],
    },
    reactStrictMode: true,

    async rewrites() {
        return [
            // ==================
            // ==== About Us ====
            // ==================
            {
                source: "/:first/nosotros",
                destination: "/:first/about-us",
            },
            {
                source: "/:first/ueber-uns",
                destination: "/:first/about-us",
            },
            {
                source: "/:first/a-propos",
                destination: "/:first/about-us",
            },
        ];
    },
};
export default withNextIntl('./src/i18n.ts')(nextConfig);
