import type { NextConfig } from "next";
import withNextIntl from "next-intl/plugin";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const isDev = process.env.NODE_ENV === "development";

// Dev/staging deploys reuse this same config, so we can't rely on NODE_ENV
// (it's "production" there too) to tell them apart from the real site.
const productionSiteUrl = "https://lyratech.com.mx";
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || productionSiteUrl).replace(/\/$/, "");
const isProductionSite = siteUrl === productionSiteUrl;

// Portfolio logos/videos are served straight from MinIO (public-read bucket prefix).
// Parsed eagerly (and thrown on a malformed value) instead of silently falling
// back to "no MinIO host", which would quietly break portfolio media in prod.
function parseMediaUrl(): URL | null {
    if (!process.env.NEXT_PUBLIC_MEDIA_URL) return null;
    try {
        return new URL(process.env.NEXT_PUBLIC_MEDIA_URL);
    } catch (err) {
        throw new Error(
            `NEXT_PUBLIC_MEDIA_URL is not a valid URL: ${process.env.NEXT_PUBLIC_MEDIA_URL} (${(err as Error).message})`
        );
    }
}
const mediaUrl = parseMediaUrl();
const mediaOrigin = mediaUrl ? mediaUrl.origin : "";

// Plain https hosts next/image is allowed to optimize — reused below so the CSP
// can't drift from it. MinIO is kept separate (see mediaRemotePattern) since it
// may use a non-https scheme and/or a non-default port (e.g. local dev).
const imageRemoteHosts = ["flagcdn.com", "upload.wikimedia.org"];

const mediaRemotePattern: { protocol: "http" | "https"; hostname: string; port?: string } | null = mediaUrl
    ? {
          protocol: mediaUrl.protocol.replace(":", "") as "http" | "https",
          hostname: mediaUrl.hostname,
          ...(mediaUrl.port ? { port: mediaUrl.port } : {}),
      }
    : null;

// The booking iframe's origin is derived from NEXT_PUBLIC_BOOKING_URL so a URL change
// (e.g. switching providers) doesn't silently get blocked by a stale hardcoded CSP entry.
const bookingOrigin = process.env.NEXT_PUBLIC_BOOKING_URL
    ? new URL(process.env.NEXT_PUBLIC_BOOKING_URL).origin
    : "";

const CSP = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval' " : ""}https://challenges.cloudflare.com`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${[...imageRemoteHosts.map((h) => "https://" + h), ...(mediaOrigin ? [mediaOrigin] : [])].join(" ")}`,
    `media-src 'self' blob: ${mediaOrigin}`.trim(),
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
        remotePatterns: [
            ...imageRemoteHosts.map((hostname) => ({
                protocol: "https" as const,
                hostname,
            })),
            ...(mediaRemotePattern ? [mediaRemotePattern] : []),
        ],
    },
    reactStrictMode: true,

    async redirects() {
        return [
            // The placeholder "coming soon" landing page is gone now that the
            // real site is live — send any old links/bookmarks/search results home.
            {
                source: "/coming-soon",
                destination: "/",
                permanent: true,
            },
            {
                source: "/proximamente",
                destination: "/",
                permanent: true,
            },
            {
                source: "/demnaechst",
                destination: "/",
                permanent: true,
            },
            {
                source: "/bientot-disponible",
                destination: "/",
                permanent: true,
            },
        ];
    },

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
