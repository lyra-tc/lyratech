import React from "react";
import Navbar from "@/components/Navbar/index";
import HeroServices from "@/components/Services/HeroServices";
import DiagnosticoStrategico from "@/components/Services/DiagnosticoStrategico";
import ServicesCards from "@/components/Services/ServicesCards";
import ButtonLanguage from "@/components/ButtonLanguage";
import DiagnosticGoFloatingButton from "@/components/Services/DiagnosticGo/FloatingButton";
import Footer from "@/components/Footer";

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
