import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildAlternates } from "@/lib/metadata";
import Navbar from "@/components/Navbar/index";
import HeroPortfolio from "@/components/Portfolio/HeroPortfolio";
import PortfolioGrid from "@/components/Portfolio/PortfolioGrid";
import ButtonLanguage from "@/components/ButtonLanguage";
import DiagnosticGoFloatingButton from "@/components/Services/DiagnosticGo/FloatingButton";
import Footer from "@/components/Footer";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "metadata.portfolio" });

    return {
        title: t("title"),
        description: t("description"),
        alternates: buildAlternates("/portfolio", locale),
    };
}

export default function PortfolioPage() {
    return (
        <div className="">
            <Navbar />
            <ButtonLanguage />
            <DiagnosticGoFloatingButton />
            <HeroPortfolio />
            <PortfolioGrid />
            <Footer />
        </div>
    );
}
