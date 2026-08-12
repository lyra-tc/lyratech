# SEO: Per-Page Metadata, Heading Hierarchy & Alt Text Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Adaptation note:** This frontend has no test framework (`frontend/package.json` has no `jest`/`vitest`/testing-library, no `"test"` script). "Verify" steps in this plan use `npm run build` + `curl`/`grep` against the built output instead of automated tests — the same method already used and proven in this session for the sitemap/robots/404 work.
>
> **Commit note:** The user commits everything themselves at the end, in one or a few batches of their own choosing. Each task below still lists a suggested "Commit" step (with a message) purely as a reference boundary/checkpoint — whoever executes this plan should stage and describe changes there, but must **not** run `git commit` automatically. Treat every "Commit" step as "stop here, this task is done" rather than an instruction to execute.

**Goal:** Fix the three concrete SEO gaps found in an audit of `frontend/`: (1) every page shares one static `<title>`/`<meta description>`, causing Google to show duplicate/generic snippets for different pages (confirmed by the user's screenshot of `lyratech.com.mx/nosotros`); (2) heading tags (`h1`-`h6`) are duplicated, skipped, or missing on several pages; (3) several images have missing-context or hardcoded-English `alt` text on a 4-locale site.

**Architecture:** Add per-page, per-locale `generateMetadata()` to each marketing page, backed by a new `metadata` namespace in the 4 `messages/*.json` files and two small shared helpers (`frontend/src/lib/site.ts` for the site's canonical domain, `frontend/src/lib/metadata.ts` for building `canonical`/`hreflang` alternates from the existing `pathnames` config). Fix headings and alt text in place, file by file, reusing existing translation keys where the content already exists and adding new small translation keys (in all 4 locales) where it doesn't.

**Tech Stack:** Next.js 15 App Router, next-intl (locales: es/en/fr/de, `localePrefix: "never"` with per-locale `pathnames`), Tailwind.

**Scope decision:** Phases 1-3 cover the 6 SEO-indexed marketing pages (home, about-us, services, portfolio, contact, legal) — these are what Google actually indexes and what the user's screenshot is about. Phase 4 covers the personal "digital business card" pages (`/ricardo`, `/ezzat`, `/galo`, `/maxime`, `/daniel-contreras`, `/daniel-queijeiro`, `/business-card`, `/ricardo-v3`, `/ricardo-v4`) — these are already blocked from indexing via `Disallow` rules added earlier this session in `frontend/src/app/robots.ts`, so fixing their headings/alt text is an accessibility nicety, not an SEO fix. Do Phase 4 last, and only if the user still wants it after Phases 1-3 ship.

---

## Phase 1 — Per-page, per-locale metadata

### Task 1: Shared site-URL helper

**Files:**
- Create: `frontend/src/lib/site.ts`
- Modify: `frontend/src/app/robots.ts`
- Modify: `frontend/src/app/sitemap.ts`

`robots.ts` and `sitemap.ts` each currently hardcode the same two lines (production URL fallback + `NEXT_PUBLIC_SITE_URL` resolution). Pulling them into one file avoids a third copy when metadata needs the same value.

- [ ] **Step 1: Create the helper**

```ts
// frontend/src/lib/site.ts
const productionSiteUrl = "https://lyratech.com.mx";

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || productionSiteUrl).replace(/\/$/, "");
export const isProductionSite = siteUrl === productionSiteUrl;
```

- [ ] **Step 2: Use it in `frontend/src/app/robots.ts`**

Replace:
```ts
const productionUrl = "https://lyratech.com.mx";
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || productionUrl).replace(/\/$/, "");
const isProduction = siteUrl === productionUrl;
```
with:
```ts
import { siteUrl, isProductionSite } from "@/lib/site";
```
and rename the two later usages of `isProduction` in that file to `isProductionSite`.

- [ ] **Step 3: Use it in `frontend/src/app/sitemap.ts`**

Replace:
```ts
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://lyratech.com.mx").replace(/\/$/, "");
```
with:
```ts
import { siteUrl } from "@/lib/site";
```

- [ ] **Step 4: Verify**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/site.ts frontend/src/app/robots.ts frontend/src/app/sitemap.ts
git commit -m "refactor: share siteUrl/isProductionSite between robots.ts and sitemap.ts"
```

---

### Task 2: `alternates` (canonical + hreflang) helper

**Files:**
- Create: `frontend/src/lib/metadata.ts`

Every marketing page has a real, distinct URL per locale already (e.g. `/about-us` en, `/nosotros` es, `/ueber-uns` de, `/a-propos` fr — see `frontend/src/config.ts`). That means proper `hreflang` alternates are possible with no new routing work — just reading the existing `pathnames` map.

- [ ] **Step 1: Write the helper**

```ts
// frontend/src/lib/metadata.ts
import { locales, pathnames } from "@/config";
import { siteUrl } from "@/lib/site";

type RouteKey = keyof typeof pathnames;

export function buildAlternates(routeKey: RouteKey, locale: string) {
    const value = pathnames[routeKey];
    const pathFor = (l: string) =>
        typeof value === "string" ? value : value[l as (typeof locales)[number]];

    const languages: Record<string, string> = {};
    for (const l of locales) {
        languages[l] = `${siteUrl}${pathFor(l)}`;
    }

    return {
        canonical: `${siteUrl}${pathFor(locale)}`,
        languages,
    };
}
```

- [ ] **Step 2: Verify**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json`
Expected: no errors (this file has no callers yet, but must type-check standalone).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/metadata.ts
git commit -m "feat: add buildAlternates helper for per-locale canonical/hreflang metadata"
```

---

### Task 3: Add the `metadata` translation namespace (4 locales)

**Files:**
- Modify: `frontend/src/messages/es.json`
- Modify: `frontend/src/messages/en.json`
- Modify: `frontend/src/messages/fr.json`
- Modify: `frontend/src/messages/de.json`

Titles are deliberately short — `frontend/src/app/[locale]/layout.tsx` (Task 4) sets a `title.template` of `"%s | LyraTech"`, so Next appends the brand name automatically. Descriptions are full sentences (~140-160 chars), grounded in copy that already exists elsewhere on each page (hero subtitles, `aboutUsIntro.description`, `servicesHome.description`, `footer.description`, etc.) so they read as genuinely different, on-brand summaries instead of invented copy.

- [ ] **Step 1: Insert into `frontend/src/messages/es.json`**

Add as a new top-level key (e.g. right after the closing `}` of `"privacy"`, before the file's final `}`):

```json
  "metadata": {
    "home": {
      "title": "Desarrollo de Software a la Medida",
      "description": "En LyraTech creamos software a la medida: automatizaciones con IA, proyectos a precio fijo y equipos dedicados. Convertimos tu idea en una solución digital real."
    },
    "aboutUs": {
      "title": "Sobre Nosotros",
      "description": "Conoce al equipo detrás de LyraTech: mentes brillantes que transforman ideas en soluciones digitales extraordinarias, desde Querétaro, México."
    },
    "services": {
      "title": "Servicios de Desarrollo de Software",
      "description": "Automatización de procesos, proyectos a precio fijo y equipos dedicados. Tecnología que transforma tu negocio, desde la idea hasta el lanzamiento."
    },
    "portfolio": {
      "title": "Portafolio de Proyectos",
      "description": "Descubre los proyectos que hemos desarrollado: apps financieras, plataformas de eventos, sitios corporativos y más soluciones digitales exitosas."
    },
    "contact": {
      "title": "Contáctanos",
      "description": "¿Tienes un proyecto en mente? Escríbenos y hablemos de cómo convertir tu idea en una solución digital real. Respondemos en menos de 24 horas."
    },
    "legal": {
      "title": "Términos y Aviso de Privacidad",
      "description": "Consulta los Términos y Condiciones y el Aviso de Privacidad de LyraTech para el uso de nuestro sitio web y servicios."
    }
  }
```

- [ ] **Step 2: Insert into `frontend/src/messages/en.json`**

```json
  "metadata": {
    "home": {
      "title": "Custom Software Development",
      "description": "At LyraTech we build custom software: AI-powered automation, fixed-price projects, and dedicated teams. We turn your idea into a real digital product."
    },
    "aboutUs": {
      "title": "About Us",
      "description": "Meet the team behind LyraTech: brilliant minds turning ideas into extraordinary digital solutions, from Querétaro, Mexico."
    },
    "services": {
      "title": "Software Development Services",
      "description": "Process automation, fixed-price projects, and dedicated teams. Technology that transforms your business, from idea to launch."
    },
    "portfolio": {
      "title": "Our Project Portfolio",
      "description": "Explore the projects we've built: fintech apps, event platforms, corporate websites, and more successful digital solutions."
    },
    "contact": {
      "title": "Contact Us",
      "description": "Have a project in mind? Reach out and let's talk about turning your idea into a real digital solution. We reply within 24 hours."
    },
    "legal": {
      "title": "Terms & Privacy Policy",
      "description": "Read LyraTech's Terms and Conditions and Privacy Policy for using our website and services."
    }
  }
```

- [ ] **Step 3: Insert into `frontend/src/messages/fr.json`**

```json
  "metadata": {
    "home": {
      "title": "Développement de Logiciels sur Mesure",
      "description": "Chez LyraTech, nous créons des logiciels sur mesure : automatisation par IA, projets à prix fixe et équipes dédiées. Nous transformons votre idée en solution numérique réelle."
    },
    "aboutUs": {
      "title": "À Propos",
      "description": "Découvrez l'équipe derrière LyraTech : des esprits brillants qui transforment des idées en solutions numériques extraordinaires, depuis Querétaro, au Mexique."
    },
    "services": {
      "title": "Services de Développement Logiciel",
      "description": "Automatisation des processus, projets à prix fixe et équipes dédiées. Une technologie qui transforme votre entreprise, de l'idée au lancement."
    },
    "portfolio": {
      "title": "Portefeuille de Projets",
      "description": "Découvrez les projets que nous avons réalisés : applications fintech, plateformes d'événements, sites corporatifs et bien d'autres solutions numériques."
    },
    "contact": {
      "title": "Contactez-nous",
      "description": "Vous avez un projet en tête ? Contactez-nous et parlons de transformer votre idée en solution numérique réelle. Réponse sous 24 heures."
    },
    "legal": {
      "title": "Conditions Générales et Confidentialité",
      "description": "Consultez les Conditions Générales et la Politique de Confidentialité de LyraTech pour l'utilisation de notre site et de nos services."
    }
  }
```

- [ ] **Step 4: Insert into `frontend/src/messages/de.json`**

```json
  "metadata": {
    "home": {
      "title": "Maßgeschneiderte Softwareentwicklung",
      "description": "Bei LyraTech entwickeln wir maßgeschneiderte Software: KI-gestützte Automatisierung, Festpreisprojekte und dedizierte Teams. Wir verwandeln Ihre Idee in ein echtes digitales Produkt."
    },
    "aboutUs": {
      "title": "Über Uns",
      "description": "Lernen Sie das Team hinter LyraTech kennen: brillante Köpfe, die Ideen in außergewöhnliche digitale Lösungen verwandeln, aus Querétaro, Mexiko."
    },
    "services": {
      "title": "Softwareentwicklungsdienste",
      "description": "Prozessautomatisierung, Festpreisprojekte und dedizierte Teams. Technologie, die Ihr Unternehmen transformiert, von der Idee bis zum Launch."
    },
    "portfolio": {
      "title": "Unser Projektportfolio",
      "description": "Entdecken Sie die Projekte, die wir realisiert haben: Fintech-Apps, Eventplattformen, Unternehmenswebsites und weitere erfolgreiche digitale Lösungen."
    },
    "contact": {
      "title": "Kontaktieren Sie Uns",
      "description": "Haben Sie ein Projekt im Kopf? Kontaktieren Sie uns und lassen Sie uns Ihre Idee in eine echte digitale Lösung verwandeln. Antwort innerhalb von 24 Stunden."
    },
    "legal": {
      "title": "AGB und Datenschutz",
      "description": "Lesen Sie die Allgemeinen Geschäftsbedingungen und die Datenschutzerklärung von LyraTech für die Nutzung unserer Website und Dienste."
    }
  }
```

- [ ] **Step 5: Verify JSON is valid**

Run: `cd frontend && node -e "['es','en','fr','de'].forEach(l => JSON.parse(require('fs').readFileSync('src/messages/'+l+'.json','utf8')))"`
Expected: no output (no throw) = valid JSON in all 4 files.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/messages/es.json frontend/src/messages/en.json frontend/src/messages/fr.json frontend/src/messages/de.json
git commit -m "feat: add per-page SEO metadata copy in all 4 locales"
```

---

### Task 4: Site-wide metadata defaults in `[locale]/layout.tsx`

**Files:**
- Modify: `frontend/src/app/[locale]/layout.tsx`

This sets `metadataBase` (required for Next to resolve absolute URLs correctly), a `title.template` so every page's title automatically gets `| LyraTech` appended, and a locale-aware default (used by any page under `[locale]` that does **not** define its own `generateMetadata` — `/dev`, the personal business-card pages, `/ricardo-v3`, `/ricardo-v4`, `/coming-soon`, the 404 page).

- [ ] **Step 1: Read current imports**

Current top of file:
```tsx
import clsx from 'clsx';
import { setRequestLocale } from 'next-intl/server';
import { ReactNode } from 'react';
import { locales } from '@/config';
import '../globals.css';
import { NextIntlClientProvider } from 'next-intl';
import type { Metadata } from 'next';
import deMessages from '@/messages/de.json';
import enMessages from '@/messages/en.json';
import esMessages from '@/messages/es.json';
import frMessages from '@/messages/fr.json';
```

Add two imports:
```tsx
import { getTranslations } from 'next-intl/server';
import { siteUrl } from '@/lib/site';
```

- [ ] **Step 2: Replace `generateMetadata`**

Replace:
```tsx
export async function generateMetadata(): Promise<Metadata> {
    return {
        title: "Lyra Technologies",
        description: "Lyra Tech website",
        icons: [
            { rel: "icon", url: "/favicon-light.ico", media: "(prefers-color-scheme: light)" },
            { rel: "icon", url: "/favicon-dark.ico", media: "(prefers-color-scheme: dark)" },
        ],
    };
}
```
with:
```tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "metadata.home" });

    return {
        metadataBase: new URL(siteUrl),
        title: {
            template: "%s | LyraTech",
            default: `${t("title")} | LyraTech`,
        },
        description: t("description"),
        icons: [
            { rel: "icon", url: "/favicon-light.ico", media: "(prefers-color-scheme: light)" },
            { rel: "icon", url: "/favicon-dark.ico", media: "(prefers-color-scheme: dark)" },
        ],
    };
}
```

Note: `Props` (`{ children: ReactNode; params: Promise<{ locale: string }>; }`) is already declared earlier in this file, above `generateStaticParams` and `generateMetadata` — no reordering needed, just reuse it as the type for `generateMetadata`'s argument.

- [ ] **Step 3: Verify**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/[locale]/layout.tsx
git commit -m "feat: set metadataBase, title template, and locale-aware default metadata"
```

---

### Task 5: Per-page `generateMetadata` on the 6 marketing pages

**Files:**
- Modify: `frontend/src/app/[locale]/page.tsx` (home)
- Modify: `frontend/src/app/[locale]/about-us/page.tsx`
- Modify: `frontend/src/app/[locale]/services/page.tsx`
- Modify: `frontend/src/app/[locale]/portfolio/page.tsx`
- Modify: `frontend/src/app/[locale]/contact/page.tsx`
- Modify: `frontend/src/app/[locale]/legal/page.tsx`

Same pattern in all six files — add a `generateMetadata` export next to the existing default export. Shown in full for home and about-us; the other four follow identically with their own `routeKey`/namespace substituted (table below).

- [ ] **Step 1: `frontend/src/app/[locale]/page.tsx`**

Add these imports at the top (alongside the existing `React`/component imports):
```tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildAlternates } from "@/lib/metadata";
```

Add this export (anywhere above or below `export default function Home()`):
```tsx
export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "metadata.home" });

    return {
        // Home lives in the same route segment as [locale]/layout.tsx, so that
        // layout's title.template does NOT auto-apply here (confirmed empirically —
        // it only applies to genuinely nested segments like /about-us). Append the
        // brand suffix explicitly so home matches every other page's "X | LyraTech".
        title: `${t("title")} | LyraTech`,
        description: t("description"),
        alternates: buildAlternates("/", locale),
    };
}
```

- [ ] **Step 2: `frontend/src/app/[locale]/about-us/page.tsx`**

Same imports. Export:
```tsx
export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "metadata.aboutUs" });

    return {
        title: t("title"),
        description: t("description"),
        alternates: buildAlternates("/about-us", locale),
    };
}
```

- [ ] **Step 3: Repeat for the remaining 4 pages**

Same imports and export shape in each file, substituting the namespace and `buildAlternates` key:

| File | namespace | `buildAlternates` key |
|---|---|---|
| `frontend/src/app/[locale]/services/page.tsx` | `metadata.services` | `"/services"` |
| `frontend/src/app/[locale]/portfolio/page.tsx` | `metadata.portfolio` | `"/portfolio"` |
| `frontend/src/app/[locale]/contact/page.tsx` | `metadata.contact` | `"/contact"` |
| `frontend/src/app/[locale]/legal/page.tsx` | `metadata.legal` | `"/legal"` |

Example for `frontend/src/app/[locale]/legal/page.tsx`:
```tsx
export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "metadata.legal" });

    return {
        title: t("title"),
        description: t("description"),
        alternates: buildAlternates("/legal", locale),
    };
}
```

- [ ] **Step 4: Verify types**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/\[locale\]/page.tsx frontend/src/app/\[locale\]/about-us/page.tsx frontend/src/app/\[locale\]/services/page.tsx frontend/src/app/\[locale\]/portfolio/page.tsx frontend/src/app/\[locale\]/contact/page.tsx frontend/src/app/\[locale\]/legal/page.tsx
git commit -m "feat: add per-page, per-locale title/description/canonical/hreflang metadata"
```

---

### Task 6: Verify metadata end-to-end

**Files:** none (verification only)

- [ ] **Step 1: Build**

```bash
cd frontend
rm -rf .next
NEXT_PUBLIC_API_URL=http://localhost:8000 NEXT_PUBLIC_SITE_URL=https://lyratech.com.mx npm run build
```
Expected: build succeeds.

- [ ] **Step 2: Spot-check rendered HTML for 3 different pages/locales**

```bash
timeout 15 npm run start > /tmp/server.log 2>&1 &
sleep 5
echo "== / (es) =="
curl -s http://localhost:3000/ | grep -oE "<title>[^<]*</title>|<meta name=\"description\"[^>]*>|<link rel=\"canonical\"[^>]*>" | head -5
echo "== /nosotros (es about-us) =="
curl -s http://localhost:3000/nosotros | grep -oE "<title>[^<]*</title>|<meta name=\"description\"[^>]*>|<link rel=\"canonical\"[^>]*>|<link rel=\"alternate\" hrefLang[^>]*>" | head -10
echo "== /about-us (en) =="
curl -s http://localhost:3000/about-us | grep -oE "<title>[^<]*</title>|<meta name=\"description\"[^>]*>" | head -3
wait
```
Expected: `/` and `/nosotros` show **different** `<title>` and `<meta description>` values (this is the exact bug from the user's screenshot — verify it's fixed), `/nosotros` includes a `<link rel="canonical">` pointing at `.../nosotros` and `<link rel="alternate" hreflang="...">` entries for es/en/fr/de.

- [ ] **Step 3: Clean up**

```bash
rm -f /tmp/server.log
```

- [ ] **Step 4: No commit** (verification-only task)

---

## Phase 2 — Heading hierarchy fixes

### Task 7: Fix duplicate `<h1>` on Home (`/`) and `/dev`

**Files:**
- Modify: `frontend/src/components/Home/Portafolio/index.tsx:127`
- Modify: `frontend/src/components/Home/HelpAndSupport/index.tsx:46`

Both `/` and `/dev` render `HeroHome` (h1, correct — stays), `Home/Portafolio` (currently **also** h1), and `Home/HelpAndSupport` (currently **also** h1). A page must have exactly one `<h1>`; demote the latter two to `<h2>`.

- [ ] **Step 1: `frontend/src/components/Home/Portafolio/index.tsx`**

Replace:
```tsx
                <h1 className="uppercase font-extrabold text-2xl md:text-3xl lg:text-4xl xl:text-5xl">
                    {t("title")}
                </h1>
```
with:
```tsx
                <h2 className="uppercase font-extrabold text-2xl md:text-3xl lg:text-4xl xl:text-5xl">
                    {t("title")}
                </h2>
```

- [ ] **Step 2: `frontend/src/components/Home/HelpAndSupport/index.tsx`**

Replace:
```tsx
                <h1 className="font-bold text-2xl md:text-3xl lg:text-4xl xl:text-5xl uppercase">
                    {t("title")}
                </h1>
```
with:
```tsx
                <h2 className="font-bold text-2xl md:text-3xl lg:text-4xl xl:text-5xl uppercase">
                    {t("title")}
                </h2>
```

- [ ] **Step 3: Verify**

Run: `cd frontend && npm run build` (or just `npx tsc --noEmit -p tsconfig.json` — JSX tag renames don't affect types, this is a visual/structural check, so also load `http://localhost:3000/` in a browser and confirm the page still looks identical — Tailwind classes are unchanged, only the tag name changed).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Home/Portafolio/index.tsx frontend/src/components/Home/HelpAndSupport/index.tsx
git commit -m "fix: demote duplicate h1s to h2 on home page (portfolio & help sections)"
```

---

### Task 8: Fix duplicate `<h1>` on `/legal`

**Files:**
- Modify: `frontend/src/components/Legal/PrivacyPolicy/index.tsx:24`

`/legal` renders both `TermsAndConditions` (h1 "Términos y Condiciones") and `PrivacyPolicy` (h1 "Aviso de Privacidad") on the same page. Keep Terms as the `h1` (renders first in the DOM) and demote Privacy to `h2`.

- [ ] **Step 1: Replace**

Replace:
```tsx
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    viewport={{ once: true }}
                    className="font-montserrat-bold text-3xl md:text-5xl text-black mb-4"
                >
                    {t("title")}
                </motion.h1>
```
with:
```tsx
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    viewport={{ once: true }}
                    className="font-montserrat-bold text-3xl md:text-5xl text-black mb-4"
                >
                    {t("title")}
                </motion.h2>
```

- [ ] **Step 2: Verify**

Load `http://localhost:3000/legal` after `npm run build && npm run start`, confirm both section titles still render identically (visual, since only the tag changed).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Legal/PrivacyPolicy/index.tsx
git commit -m "fix: demote Privacy Policy title from h1 to h2 (Terms already uses h1 on /legal)"
```

---

### Task 9: Add missing `<h2>` on `/portfolio`

**Files:**
- Modify: `frontend/src/components/Portfolio/PortfolioGrid/index.tsx:126-129`
- Modify: `frontend/src/messages/es.json`, `en.json`, `fr.json`, `de.json` (new key `portfolioGrid.sectionTitle`)

`/portfolio` currently jumps from the page's one `<h1>` (in `HeroPortfolio`) straight to nine `<h3>` project-name headings inside `PortfolioGrid` — no `<h2>` in between. Add a small section heading above the filter tabs.

- [ ] **Step 1: Add translation key to `frontend/src/messages/es.json`**, inside the existing `"portfolioGrid"` object:
```json
    "sectionTitle": "Todos los proyectos",
```
(place it as the first key in that object, before `"filterAll"`)

- [ ] **Step 2: Same key in `frontend/src/messages/en.json`**:
```json
    "sectionTitle": "All Projects",
```

- [ ] **Step 3: Same key in `frontend/src/messages/fr.json`**:
```json
    "sectionTitle": "Tous les Projets",
```

- [ ] **Step 4: Same key in `frontend/src/messages/de.json`**:
```json
    "sectionTitle": "Alle Projekte",
```

- [ ] **Step 5: Use it in `frontend/src/components/Portfolio/PortfolioGrid/index.tsx`**

Replace:
```tsx
        <section id="portfolio" className="px-6 py-12 md:py-16">
            <div className="max-w-6xl mx-auto">
                {/* Filter tabs */}
                <div className="flex flex-wrap gap-3 mb-10 justify-center">
```
with:
```tsx
        <section id="portfolio" className="px-6 py-12 md:py-16">
            <div className="max-w-6xl mx-auto">
                <h2 className="sr-only">{t("sectionTitle")}</h2>

                {/* Filter tabs */}
                <div className="flex flex-wrap gap-3 mb-10 justify-center">
```

Check the top of this component for how `t` is already obtained (it uses `useTranslations("portfolioGrid")` already, since `filterAll` etc. come from that namespace — reuse the same `t`). `sr-only` is a standard Tailwind utility (visually hidden, still readable by search engines/screen readers) — confirm it's available (it's a Tailwind core utility, no config needed) so the visual design doesn't change while the heading gap is fixed.

- [ ] **Step 6: Verify**

Run: `cd frontend && node -e "['es','en','fr','de'].forEach(l => JSON.parse(require('fs').readFileSync('src/messages/'+l+'.json','utf8')))"` then `npx tsc --noEmit -p tsconfig.json`.
Expected: no errors. Then build + load `/portfolio` in a browser — page should look unchanged (heading is visually hidden).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/Portfolio/PortfolioGrid/index.tsx frontend/src/messages/es.json frontend/src/messages/en.json frontend/src/messages/fr.json frontend/src/messages/de.json
git commit -m "fix: add missing h2 section heading on /portfolio (was h1 -> h3, skipping a level)"
```

---

### Task 10 (optional, low priority): De-duplicate flip-card headings on `/services`

**Files:**
- Modify: `frontend/src/components/Services/ServicesCards/index.tsx:94` and `:121`

`ServicesCards` renders each of the 3 service titles as `<h3>` **twice** — once for the card's front face (line 94-96), once for the back face of a CSS 3D flip (line 121-123). Only one face is visible at a time (the other is `backfaceHidden`-styled), but both exist in the DOM simultaneously, so a screen reader/crawler sees the same heading text twice per card. Not a broken hierarchy (no duplicate `h1`), just redundant headings. The back face also holds a working "volver" (back) button, so this fix keeps the back-face container fully interactive/reachable and only changes the redundant heading itself to a plain paragraph — the front-face `<h3>` (line 94-96, unchanged) remains the one real heading for that service, matching its `<p>` description right below it.

- [ ] **Step 1: Replace the back-face heading**

Replace (`frontend/src/components/Services/ServicesCards/index.tsx:121-123`):
```tsx
                                        <h3 className="font-montserrat-bold text-white text-lg leading-tight pr-4">
                                            {service.title}
                                        </h3>
```
with:
```tsx
                                        <p className="font-montserrat-bold text-white text-lg leading-tight pr-4">
                                            {service.title}
                                        </p>
```

- [ ] **Step 2: Verify** — build + load `/services`, click each card to flip it, confirm the back face still looks and behaves identically (only the tag changed, className unchanged).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Services/ServicesCards/index.tsx
git commit -m "fix: prevent duplicate h3 announcement on services flip-card back face"
```

---

### Task 11: Verify heading fixes end-to-end

**Files:** none (verification only)

- [ ] **Step 1: Build and start**

```bash
cd frontend
rm -rf .next
NEXT_PUBLIC_API_URL=http://localhost:8000 NEXT_PUBLIC_SITE_URL=https://lyratech.com.mx npm run build
timeout 15 npm run start > /tmp/server.log 2>&1 &
sleep 5
```

- [ ] **Step 2: Count `<h1>` per page — every count below must be exactly `1`**

```bash
for path in "" "nosotros" "servicios" "portafolio" "contacto" "legal"; do
  count=$(curl -s "http://localhost:3000/$path" | grep -o "<h1" | wc -l)
  echo "/$path -> $count h1"
done
```
Expected: every line prints `1`.

- [ ] **Step 3: Clean up**

```bash
rm -f /tmp/server.log
```

- [ ] **Step 4: No commit** (verification-only task)

---

## Phase 3 — Alt text fixes

### Task 12: Fix generic reused alt text on Home `/` (`Home/AboutUs`)

**Files:**
- Modify: `frontend/src/components/Home/AboutUs/index.tsx:54`

Two different images (`AboutUs1.png`, `AboutUs2.png`) both currently get the literal, hardcoded `alt="About Us"`. Each card already has a translated `card.title` — use it.

- [ ] **Step 1: Replace**

Replace:
```tsx
                                <Image alt="About Us" src={card.img} />
```
with:
```tsx
                                <Image alt={card.title} src={card.img} />
```

- [ ] **Step 2: Verify**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json`. Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Home/AboutUs/index.tsx
git commit -m "fix: use per-card translated title as image alt instead of generic 'About Us'"
```

---

### Task 13: Translate hardcoded alt text in `AboutUsIntro`

**Files:**
- Modify: `frontend/src/components/AboutUs/AboutUsIntro/index.tsx`
- Modify: `frontend/src/messages/es.json`, `en.json`, `fr.json`, `de.json` (new keys `aboutUsIntro.photoTeamAlt`, `aboutUsIntro.photoWorkspaceAlt`)

Every other string in this component comes from `useTranslations("aboutUsIntro")` except the `alts` array (`["Lyratech team", "Lyratech workspace"]`), which is hardcoded English and renders in that language regardless of the visitor's locale.

- [ ] **Step 1: Add keys to `frontend/src/messages/es.json`**, inside the `"aboutUsIntro"` object (anywhere, e.g. after `"description"`):
```json
    "photoTeamAlt": "Equipo de Lyratech trabajando",
    "photoWorkspaceAlt": "Espacio de trabajo de Lyratech",
```

- [ ] **Step 2: `frontend/src/messages/en.json`**:
```json
    "photoTeamAlt": "The Lyratech team at work",
    "photoWorkspaceAlt": "The Lyratech workspace",
```

- [ ] **Step 3: `frontend/src/messages/fr.json`**:
```json
    "photoTeamAlt": "L'équipe Lyratech au travail",
    "photoWorkspaceAlt": "L'espace de travail Lyratech",
```

- [ ] **Step 4: `frontend/src/messages/de.json`**:
```json
    "photoTeamAlt": "Das Lyratech-Team bei der Arbeit",
    "photoWorkspaceAlt": "Der Lyratech-Arbeitsbereich",
```

- [ ] **Step 5: Update the component**

Replace:
```tsx
const images = [Office1, Office2];
const alts   = ["Lyratech team", "Lyratech workspace"];
```
with:
```tsx
const images = [Office1, Office2];
```

Then inside `export default function AboutUsIntro()`, right after `const t = useTranslations("aboutUsIntro");`, add:
```tsx
    const alts = [t("photoTeamAlt"), t("photoWorkspaceAlt")];
```

The existing `alt={alts[idx]}` usage at line ~118 needs no change — `alts` is now translated instead of hardcoded.

- [ ] **Step 6: Verify**

Run: `cd frontend && node -e "['es','en','fr','de'].forEach(l => JSON.parse(require('fs').readFileSync('src/messages/'+l+'.json','utf8')))"` then `npx tsc --noEmit -p tsconfig.json`. Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/AboutUs/AboutUsIntro/index.tsx frontend/src/messages/es.json frontend/src/messages/en.json frontend/src/messages/fr.json frontend/src/messages/de.json
git commit -m "fix: translate AboutUsIntro image alt text instead of hardcoding English"
```

---

### Task 14: Fix decorative Navbar notch alt text

**Files:**
- Modify: `frontend/src/components/Navbar/index.tsx:164-169`

The notch is a clickable UI background graphic, not content — `alt="Lyra Tech Notch"` announces meaningless noise to screen readers on every single page (Navbar is site-wide). It should be `alt=""` so assistive tech skips it; the clickable affordance is already on the wrapping `div[role="button"]` two levels up, which has no accessible label of its own — that's a separate, smaller a11y gap this task does not need to fix (out of scope: it doesn't affect SEO or alt text).

- [ ] **Step 1: Replace**

Replace:
```tsx
                <Image
                    alt="Lyra Tech Notch"
                    src={ClosedNotch}
                    className="w-full h-full"
                    priority
                />
```
with:
```tsx
                <Image
                    alt=""
                    src={ClosedNotch}
                    className="w-full h-full"
                    priority
                />
```

- [ ] **Step 2: Verify**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json`. Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Navbar/index.tsx
git commit -m "fix: mark decorative navbar notch image as alt=\"\" instead of mislabeling it"
```

---

### Task 15: Translate the language-switcher flag alt text

**Files:**
- Modify: `frontend/src/components/ButtonLanguage/LocaleSwitcher/index.tsx:74`
- Modify: `frontend/src/messages/es.json`, `en.json`, `fr.json`, `de.json` (new key `buttonLanguage.flagAlt`)

`alt={`${lang.label} Flag`}` — `lang.label` is translated, but the trailing word `"Flag"` is always English.

- [ ] **Step 1: Add key to `frontend/src/messages/es.json`**, inside `"buttonLanguage"`:
```json
    "flagAlt": "Bandera de {label}",
```

- [ ] **Step 2: `frontend/src/messages/en.json`**:
```json
    "flagAlt": "{label} flag",
```

- [ ] **Step 3: `frontend/src/messages/fr.json`**:
```json
    "flagAlt": "Drapeau {label}",
```

- [ ] **Step 4: `frontend/src/messages/de.json`**:
```json
    "flagAlt": "{label}-Flagge",
```

- [ ] **Step 5: Update the component**

Replace:
```tsx
                            <Image
                                src={lang.flag}
                                alt={`${lang.label} Flag`}
                                width={20}
                                height={14}
                                className="mr-2"
                            />
```
with:
```tsx
                            <Image
                                src={lang.flag}
                                alt={t("flagAlt", { label: lang.label })}
                                width={20}
                                height={14}
                                className="mr-2"
                            />
```

- [ ] **Step 6: Verify**

Run: `cd frontend && node -e "['es','en','fr','de'].forEach(l => JSON.parse(require('fs').readFileSync('src/messages/'+l+'.json','utf8')))"` then `npx tsc --noEmit -p tsconfig.json`. Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/ButtonLanguage/LocaleSwitcher/index.tsx frontend/src/messages/es.json frontend/src/messages/en.json frontend/src/messages/fr.json frontend/src/messages/de.json
git commit -m "fix: translate language-switcher flag alt text instead of hardcoding 'Flag'"
```

---

### Task 16: Descriptive, translated photo alt text in `TeamSection` (About Us page)

**Files:**
- Modify: `frontend/src/components/AboutUs/TeamSection/index.tsx:95`
- Modify: `frontend/src/messages/es.json`, `en.json`, `fr.json`, `de.json` (new key `teamSection.photoAlt`)

`alt={member.name}` on each team photo is just the bare name with no indication it's a photo — add "Photo of {name}" framing (translated).

- [ ] **Step 1: Add key to `frontend/src/messages/es.json`**, inside `"teamSection"`:
```json
    "photoAlt": "Foto de {name}",
```

- [ ] **Step 2: `frontend/src/messages/en.json`**:
```json
    "photoAlt": "Photo of {name}",
```

- [ ] **Step 3: `frontend/src/messages/fr.json`**:
```json
    "photoAlt": "Photo de {name}",
```

- [ ] **Step 4: `frontend/src/messages/de.json`**:
```json
    "photoAlt": "Foto von {name}",
```

- [ ] **Step 5: Update the component**

Replace:
```tsx
                            <Image
                                src={member.image}
                                alt={member.name}
                                width={128}
                                height={128}
                                className="w-full h-full object-cover rounded-full"
                            />
```
with:
```tsx
                            <Image
                                src={member.image}
                                alt={t("photoAlt", { name: member.name })}
                                width={128}
                                height={128}
                                className="w-full h-full object-cover rounded-full"
                            />
```

(`t` already exists in this component from `useTranslations("teamSection")`.)

- [ ] **Step 6: Verify**

Run: `cd frontend && node -e "['es','en','fr','de'].forEach(l => JSON.parse(require('fs').readFileSync('src/messages/'+l+'.json','utf8')))"` then `npx tsc --noEmit -p tsconfig.json`. Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/AboutUs/TeamSection/index.tsx frontend/src/messages/es.json frontend/src/messages/en.json frontend/src/messages/fr.json frontend/src/messages/de.json
git commit -m "fix: add descriptive translated alt text to team member photos"
```

---

### Task 17: Verify alt-text fixes end-to-end

**Files:** none (verification only)

- [ ] **Step 1: Build and start**

```bash
cd frontend
rm -rf .next
NEXT_PUBLIC_API_URL=http://localhost:8000 NEXT_PUBLIC_SITE_URL=https://lyratech.com.mx npm run build
timeout 15 npm run start > /tmp/server.log 2>&1 &
sleep 5
```

- [ ] **Step 2: Spot-check**

```bash
echo "== / should show translated card titles as alt, not 'About Us' twice =="
curl -s http://localhost:3000/ | grep -oE 'alt="[^"]*"' | sort | uniq -c | sort -rn | head -10
echo "== /nosotros: navbar notch should be alt=\"\", team photos should say 'Foto de' =="
curl -s http://localhost:3000/nosotros | grep -oE 'alt="[^"]*"' | head -20
```
Expected: no `alt="About Us"` duplicate, no `alt="Lyra Tech Notch"`, team photo alts read `"Foto de <name>"` (es).

- [ ] **Step 3: Clean up**

```bash
rm -f /tmp/server.log
```

- [ ] **Step 4: No commit** (verification-only task)

---

## Phase 4 (optional — pages already blocked from indexing via `robots.txt`)

These fixes are accessibility-only (screen readers), not SEO, because `frontend/src/app/robots.ts` already disallows `/ricardo`, `/ricardo-v3`, `/ricardo-v4`, `/ezzat`, `/daniel-contreras`, `/daniel-queijeiro`, `/galo`, `/business-card`. Confirm with the user before spending time here — do Phases 1-3 first regardless.

### Task 18: Promote person-name `<p>` to `<h1>` on business-card pages

**Files:**
- Modify: `frontend/src/components/DigitalBusinessCardV2/Profile/index.tsx:64-71` (used by `/ricardo`, `/ezzat`, `/galo`, `/maxime`, `/daniel-contreras`, `/daniel-queijeiro`)
- Modify: `frontend/src/components/DigitalBusinessCard/Profile/index.tsx:40` (used by `/business-card`)
- Modify: `frontend/src/components/DigitalBusinessCardV3/Hero/index.tsx:154` (used by `/ricardo-v3`)
- Modify: `frontend/src/app/[locale]/ricardo-v4/page.tsx:17`

All four currently render the person's name as `<p>`/`<motion.p>` with zero `<h1>` anywhere on the page. Swap the tag only (keep the same `className` so nothing changes visually — Tailwind's preflight reset removes default heading margins).

- [ ] **Step 1: `frontend/src/components/DigitalBusinessCardV2/Profile/index.tsx`**

Replace:
```tsx
            <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }}
                className="text-xl md:text-2xl lg:text-3xl mt-3 md:mt-5 font-zendots text-white text-center leading-snug"
            >
                {name}
            </motion.p>
```
with:
```tsx
            <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }}
                className="text-xl md:text-2xl lg:text-3xl mt-3 md:mt-5 font-zendots text-white text-center leading-snug"
            >
                {name}
            </motion.h1>
```

- [ ] **Step 2: `frontend/src/components/DigitalBusinessCard/Profile/index.tsx`**

Replace:
```tsx
            <p className="text-3xl mt-4 font-zendots mx-5 text-center">{name}</p>
```
with:
```tsx
            <h1 className="text-3xl mt-4 font-zendots mx-5 text-center">{name}</h1>
```

- [ ] **Step 3: `frontend/src/components/DigitalBusinessCardV3/Hero/index.tsx`**

Replace:
```tsx
                        <p className="text-sm font-bold text-[#272a33] leading-none font-montserrat-bold">{name}</p>
```
with:
```tsx
                        <h1 className="text-sm font-bold text-[#272a33] leading-none font-montserrat-bold">{name}</h1>
```

- [ ] **Step 4: `frontend/src/app/[locale]/ricardo-v4/page.tsx`**

Replace:
```tsx
                        <p className="text-sm font-bold text-[#272a33] leading-none font-montserrat-bold">Ricardo Sierra Roa</p>
```
with:
```tsx
                        <h1 className="text-sm font-bold text-[#272a33] leading-none font-montserrat-bold">Ricardo Sierra Roa</h1>
```

- [ ] **Step 5: Verify**

Build + load `/ricardo`, `/business-card`, `/ricardo-v3`, `/ricardo-v4` in a browser. Confirm no visual change (only the tag changed, className identical).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/DigitalBusinessCardV2/Profile/index.tsx frontend/src/components/DigitalBusinessCard/Profile/index.tsx frontend/src/components/DigitalBusinessCardV3/Hero/index.tsx "frontend/src/app/[locale]/ricardo-v4/page.tsx"
git commit -m "fix: promote person name to h1 on digital business card pages (were 0 headings)"
```

---

### Task 19: Translated photo alt text on business-card pages

**Files:**
- Modify: `frontend/src/components/DigitalBusinessCardV2/Profile/index.tsx` (import `useTranslations`, add call)
- Modify: `frontend/src/components/DigitalBusinessCard/Profile/index.tsx` (re-enable the already-commented `useTranslations` import)
- Modify: `frontend/src/components/DigitalBusinessCardV3/Hero/index.tsx` (import `useTranslations`, add call)
- Modify: `frontend/src/messages/es.json`, `en.json`, `fr.json`, `de.json` (new namespace `businessCard`)

- [ ] **Step 1: Add namespace to `frontend/src/messages/es.json`** (new top-level key):
```json
  "businessCard": {
    "photoAlt": "Foto de {name}"
  },
```

- [ ] **Step 2: `frontend/src/messages/en.json`**:
```json
  "businessCard": {
    "photoAlt": "Photo of {name}"
  },
```

- [ ] **Step 3: `frontend/src/messages/fr.json`**:
```json
  "businessCard": {
    "photoAlt": "Photo de {name}"
  },
```

- [ ] **Step 4: `frontend/src/messages/de.json`**:
```json
  "businessCard": {
    "photoAlt": "Foto von {name}"
  },
```

- [ ] **Step 5: `frontend/src/components/DigitalBusinessCardV2/Profile/index.tsx`**

Add import:
```tsx
import { useTranslations } from "next-intl";
```
Inside `function Profile({ imageSrc, name, position }: Readonly<ProfileProps>) {`, add as the first line of the function body:
```tsx
    const t = useTranslations("businessCard");
```
Replace:
```tsx
                        <Image
                            src={imageSrc}
                            alt={name}
                            width={160}
                            height={160}
                            className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-full object-cover"
                            priority
                        />
```
with:
```tsx
                        <Image
                            src={imageSrc}
                            alt={t("photoAlt", { name })}
                            width={160}
                            height={160}
                            className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-full object-cover"
                            priority
                        />
```

- [ ] **Step 6: `frontend/src/components/DigitalBusinessCard/Profile/index.tsx`**

Replace:
```tsx
//import { useTranslations } from "next-intl";
```
with:
```tsx
import { useTranslations } from "next-intl";
```
Replace:
```tsx
function Profile({ imageSrc, name, position }: ProfileProps) {
    //const t = useTranslations("profileCard");
```
with:
```tsx
function Profile({ imageSrc, name, position }: ProfileProps) {
    const t = useTranslations("businessCard");
```
Replace:
```tsx
                    <Image
                        src={imageSrc}
                        alt={name}
                        width={240}
                        height={240}
                        className="w-40 h-40 rounded-full"
                        priority
                    />
```
with:
```tsx
                    <Image
                        src={imageSrc}
                        alt={t("photoAlt", { name })}
                        width={240}
                        height={240}
                        className="w-40 h-40 rounded-full"
                        priority
                    />
```

- [ ] **Step 7: `frontend/src/components/DigitalBusinessCardV3/Hero/index.tsx`**

Add import:
```tsx
import { useTranslations } from "next-intl";
```
Inside `export default function Hero({ name, role, company, phone, email }: HeroProps) {`, add as the first line of the function body:
```tsx
    const t = useTranslations("businessCard");
```
Replace:
```tsx
                    <Image src={RichieBase} alt={name} priority />
```
with:
```tsx
                    <Image src={RichieBase} alt={t("photoAlt", { name })} priority />
```

- [ ] **Step 8: Verify**

Run: `cd frontend && node -e "['es','en','fr','de'].forEach(l => JSON.parse(require('fs').readFileSync('src/messages/'+l+'.json','utf8')))"` then `npx tsc --noEmit -p tsconfig.json`. Expected: no errors. Then build + load `/ricardo`, `/business-card`, `/ricardo-v3`.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/DigitalBusinessCardV2/Profile/index.tsx frontend/src/components/DigitalBusinessCard/Profile/index.tsx frontend/src/components/DigitalBusinessCardV3/Hero/index.tsx frontend/src/messages/es.json frontend/src/messages/en.json frontend/src/messages/fr.json frontend/src/messages/de.json
git commit -m "fix: translated descriptive alt text for business-card profile photos"
```

---

## Self-review notes

- **Spec coverage:** metadata (Phase 1) ✓, headings (Phase 2, includes the 3 concrete structural bugs found: home/dev duplicate h1, legal duplicate h1, portfolio h1→h3 skip) ✓, alt text (Phase 3, all 5 issues from the audit) ✓, multilingual requirement ✓ (every new string is added to all 4 `messages/*.json` files). Business-card pages (Phase 4) explicitly deprioritized with reasoning, not silently dropped.
- **Not included by design:** Open Graph / Twitter card images (no existing OG asset in the repo to point to — would need new design assets, out of scope for this pass; flag to the user separately if wanted), and the minor Services flip-card duplicate-h3 issue is marked optional (Task 10) since it doesn't change page indexing.
- **Verification approach:** every phase ends with a build + `curl`/`grep` check against real rendered HTML, matching how the sitemap/robots/404 work was verified earlier in this session (no test framework exists in this repo to write unit tests against).
