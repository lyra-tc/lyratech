import React from "react";
import Navbar from "@/components/Navbar/index";
import HeroContact from "@/components/Contact/HeroContact";
import ContactForm from "@/components/Contact/ContactForm";
import FAQ from "@/components/Contact/FAQ";
import ButtonLanguage from "@/components/ButtonLanguage";
import DiagnosticGoFloatingButton from "@/components/Services/DiagnosticGo/FloatingButton";
import Footer from "@/components/Footer";

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
