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
            {
                protocol: "https",
                hostname: "upload.wikimedia.org",
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
            // =====================
            // ==== Coming Soon ====
            // =====================
            {
                source: "/:first/proximamente",
                destination: "/:first/coming-soon",
            },
            {
                source: "/:first/demnaechst",
                destination: "/:first/coming-soon",
            },
            {
                source: "/:first/bientot-disponible",
                destination: "/:first/coming-soon",
            },
            // =================
            // ==== Contact ====
            // =================
            {
                source: "/:first/contacto",
                destination: "/:first/contact",
            },
            {
                source: "/:first/kontakt",
                destination: "/:first/contact",
            },
            // ==================
            // ==== Services ====
            // ==================
            {
                source: "/:first/servicios",
                destination: "/:first/services",
            },
            {
                source: "/:first/dienstleistungen",
                destination: "/:first/services",
            },
            // ===================
            // ==== Portfolio ====
            // ===================
            {
                source: "/:first/portafolio",
                destination: "/:first/portfolio",
            },
        ];
    },
};
export default withNextIntl('./src/i18n.ts')(nextConfig);
