import type { PortfolioProject } from "@/lib/api";
import { PORTFOLIO_LOCALES, type PortfolioLocale } from "@/lib/portfolioConstants";

// Server components run inside the frontend container, where NEXT_PUBLIC_API_URL
// (a public domain) or "localhost" may not reach the backend — prefer the
// container-network URL when set (docker-compose wires it to http://backend:8000).
const API_URL =
  process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Published projects for the public site, fetched in server components and
 * cached for 60 s. Never throws: on any failure the caller gets [] and hides
 * the section instead of breaking the page.
 */
export async function getPublishedProjects(): Promise<PortfolioProject[]> {
  try {
    const res = await fetch(`${API_URL}/api/portfolio`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      console.error(`getPublishedProjects: ${res.status} ${res.statusText}`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("getPublishedProjects failed:", err);
    return [];
  }
}

export function pickDescription(project: PortfolioProject, locale: string): string {
  const key = (PORTFOLIO_LOCALES as readonly string[]).includes(locale)
    ? (locale as PortfolioLocale)
    : "es";
  return project.descriptions[key] || project.descriptions.es;
}

/** next/image's optimizer rejects SVGs and local blob: previews — render those as-is. */
export function isUnoptimizedImage(src: string): boolean {
  return src.startsWith("blob:") || /\.svg($|\?)/i.test(src);
}
