import type { NextConfig } from "next";
import withNextIntl from "next-intl/plugin";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const isDev = process.env.NODE_ENV === "development";

// Dev/staging deploys reuse this same config, so we can't rely on NODE_ENV
// (it's "production" there too) to tell them apart from the real site.
const productionSiteUrl = "https://lyratech.com.mx";
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || productionSiteUrl).replace(/\/$/, "");
const isProductionSite = siteUrl === productionSiteUrl;

// Same hosts next/image is allowed to optimize — reused below so the CSP can't drift from it.
const imageRemoteHosts = ["flagcdn.com", "upload.wikimedia.org"];

// The booking iframe's origin is derived from NEXT_PUBLIC_BOOKING_URL so a URL change
// (e.g. switching providers) doesn't silently get blocked by a stale hardcoded CSP entry.
const bookingOrigin = process.env.NEXT_PUBLIC_BOOKING_URL
    ? new URL(process.env.NEXT_PUBLIC_BOOKING_URL).origin
    : "";

const CSP = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval' " : ""}https://challenges.cloudflare.com`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: ${imageRemoteHosts.map((h) => "https://" + h).join(" ")}`,
    "font-src 'self' data:",
    `connect-src 'self' ${apiUrl}`,
    `frame-src https://challenges.cloudflare.com https://calendar.google.com ${bookingOrigin}`.trim(),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
].join("; ");

const nextConfig: NextConfig = {
    /* config options here */
    output: "standalone",
    poweredByHeader: false,

    async headers() {
        return [
            {
                source: "/:path*",
                headers: [
                    { key: "Content-Security-Policy", value: CSP },
                    { key: "X-Frame-Options", value: "SAMEORIGIN" },
                    { key: "X-Content-Type-Options", value: "nosniff" },
                    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
                    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
                    ...(isProductionSite
                        ? []
                        : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]),
                ],
            },
        ];
    },

    /* Configuration for remote images */
    images: {
        remotePatterns: imageRemoteHosts.map((hostname) => ({
            protocol: "https" as const,
            hostname,
        })),
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
