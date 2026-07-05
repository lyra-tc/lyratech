import React from "react";
import Navbar from "@/components/Navbar/index";
import HeroPortfolio from "@/components/Portfolio/HeroPortfolio";
import PortfolioGrid from "@/components/Portfolio/PortfolioGrid";
import ButtonLanguage from "@/components/ButtonLanguage";
import DiagnosticGoFloatingButton from "@/components/Services/DiagnosticGo/FloatingButton";
import Footer from "@/components/Footer";

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
