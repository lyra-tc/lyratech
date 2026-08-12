import React from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildAlternates } from "@/lib/metadata";
import Navbar from "@/components/Navbar/index";
import HeroContact from "@/components/Contact/HeroContact";
import ContactForm from "@/components/Contact/ContactForm";
import FAQ from "@/components/Contact/FAQ";
import ButtonLanguage from "@/components/ButtonLanguage";
import DiagnosticGoFloatingButton from "@/components/Services/DiagnosticGo/FloatingButton";
import Footer from "@/components/Footer";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "metadata.contact" });

    return {
        title: t("title"),
        description: t("description"),
        alternates: buildAlternates("/contact", locale),
    };
}

export default function ContactPage() {
    return (
        <div className="">
            <Navbar />
            <ButtonLanguage />
            <DiagnosticGoFloatingButton />
            <HeroContact />
            <ContactForm />
            <FAQ />
            <Footer />
        </div>
    );
}
