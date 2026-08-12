import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildAlternates } from "@/lib/metadata";
import Navbar from "@/components/Navbar/index";
import HeroServices from "@/components/Services/HeroServices";
import DiagnosticoStrategico from "@/components/Services/DiagnosticoStrategico";
import ServicesCards from "@/components/Services/ServicesCards";
import ButtonLanguage from "@/components/ButtonLanguage";
import DiagnosticGoFloatingButton from "@/components/Services/DiagnosticGo/FloatingButton";
import Footer from "@/components/Footer";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "metadata.services" });

    return {
        title: t("title"),
        description: t("description"),
        alternates: buildAlternates("/services", locale),
    };
}

export default function ServicesPage() {
    return (
        <div className="">
            <Navbar />
            <ButtonLanguage />
            <DiagnosticGoFloatingButton />
            <HeroServices />
            <DiagnosticoStrategico />
            <ServicesCards />
            <Footer />
        </div>
    );
}
