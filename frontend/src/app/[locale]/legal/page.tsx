import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildAlternates } from "@/lib/metadata";
import Navbar from "@/components/Navbar/index";
import ButtonLanguage from "@/components/ButtonLanguage";
import DiagnosticGoFloatingButton from "@/components/Services/DiagnosticGo/FloatingButton";
import TermsAndConditions from "@/components/Legal/TermsAndConditions";
import PrivacyPolicy from "@/components/Legal/PrivacyPolicy";
import Footer from "@/components/Footer";

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

export default function LegalPage() {
    return (
        <div className="">
            <Navbar />
            <ButtonLanguage />
            <DiagnosticGoFloatingButton />
            <TermsAndConditions />
            <PrivacyPolicy />
            <Footer />
        </div>
    );
}
