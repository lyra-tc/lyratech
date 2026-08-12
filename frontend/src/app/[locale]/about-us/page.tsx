import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildAlternates } from "@/lib/metadata";
import Navbar from "@/components/Navbar/index";
import HeroAboutUs from "@/components/AboutUs/HeroAboutUs";
import AboutUsIntro from "@/components/AboutUs/AboutUsIntro";
import TeamSection from "@/components/AboutUs/TeamSection";
import VisionMission from "@/components/AboutUs/VisionMission";
import ButtonLanguage from "@/components/ButtonLanguage";
import DiagnosticGoFloatingButton from "@/components/Services/DiagnosticGo/FloatingButton";
import Footer from "@/components/Footer";

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

export default function AboutUsPage() {
    return (
        <div className="">
            <Navbar />
            <ButtonLanguage />
            <DiagnosticGoFloatingButton />
            <HeroAboutUs />
            <TeamSection />
            <AboutUsIntro />
            <VisionMission />
            <Footer />
        </div>
    );
}
