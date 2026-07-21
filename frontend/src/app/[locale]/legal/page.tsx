import React from "react";
import Navbar from "@/components/Navbar/index";
import ButtonLanguage from "@/components/ButtonLanguage";
import DiagnosticGoFloatingButton from "@/components/Services/DiagnosticGo/FloatingButton";
import TermsAndConditions from "@/components/Legal/TermsAndConditions";
import PrivacyPolicy from "@/components/Legal/PrivacyPolicy";
import Footer from "@/components/Footer";

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
