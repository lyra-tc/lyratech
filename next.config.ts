// next.config.ts
import { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
    output: "standalone",

    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "flagcdn.com"
            }
        ]
    },

    reactStrictMode: true,

    async rewrites() {
        return [
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
        ]
    }
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);