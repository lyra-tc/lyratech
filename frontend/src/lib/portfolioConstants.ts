// Mirrors backend/app/schemas/portfolio.py and core/portfolio_files.py — keep both in sync.
export const PORTFOLIO_NAME_MAX = 40;
export const PORTFOLIO_DESCRIPTION_MAX = 120;
export const PORTFOLIO_TECH_MAX_COUNT = 10;
export const PORTFOLIO_TECH_MAX_LENGTH = 20;
export const PORTFOLIO_LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const PORTFOLIO_VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const PORTFOLIO_LOGO_ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml";
export const PORTFOLIO_VIDEO_ACCEPT = "video/mp4,video/webm";
export const PORTFOLIO_URL_MAX = 500;
export const PLAY_STORE_HOST = "play.google.com";
export const APP_STORE_HOST = "apps.apple.com";

export const PORTFOLIO_LOCALES = ["es", "en", "fr", "de"] as const;
export type PortfolioLocale = (typeof PORTFOLIO_LOCALES)[number];

export const PORTFOLIO_CATEGORIES = ["web", "mobile", "ai"] as const;
export type PortfolioCategory = (typeof PORTFOLIO_CATEGORIES)[number];

export const PORTFOLIO_CATEGORY_LABELS: Record<PortfolioCategory, string> = {
  web: "Web",
  mobile: "Móvil",
  ai: "IA & ML",
};

export const PORTFOLIO_LINK_TYPES = ["website", "store", "video"] as const;
export type PortfolioLinkType = (typeof PORTFOLIO_LINK_TYPES)[number];

export const PORTFOLIO_LINK_TYPE_LABELS: Record<PortfolioLinkType, string> = {
  website: "Sitio web",
  store: "Tiendas de apps",
  video: "Video",
};
