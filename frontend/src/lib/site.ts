const productionSiteUrl = "https://lyratech.com.mx";

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || productionSiteUrl).replace(/\/$/, "");
export const isProductionSite = siteUrl === productionSiteUrl;
