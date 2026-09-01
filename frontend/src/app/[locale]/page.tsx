import React, { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildAlternates } from "@/lib/metadata";
import Navbar from "@/components/Navbar/index";
import Hero from "@/components/Home/HeroHome";
import AboutUs from "@/components/Home/AboutUs";
import Services from "@/components/Home/Services";
import Portafolio from "@/components/Home/Portafolio";
import HelpAndSupport from "@/components/Home/HelpAndSupport";
import ButtonLanguage from "@/components/ButtonLanguage";
import DiagnosticGoFloatingButton from "@/components/Services/DiagnosticGo/FloatingButton";
import Footer from "@/components/Footer";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "metadata.home" });

    return {
        // Home lives in the same route segment as [locale]/layout.tsx, so
        // that layout's title.template does not auto-apply here (it only
        // applies to genuinely nested segments) — append the brand suffix
        // explicitly to stay consistent with every other page's "X | LyraTech".
        title: `${t("title")} | LyraTech`,
        description: t("description"),
        alternates: buildAlternates("/", locale),
    };
}

export default function Home() {
    return (
        <div className="">
            <Navbar />
            <ButtonLanguage />
            <DiagnosticGoFloatingButton />
            <Suspense fallback={null}>
                <Hero />
            </Suspense>
            <AboutUs />
            <Services />
            <Portafolio />
            <HelpAndSupport />
            <Footer />
        </div>
    );
}


