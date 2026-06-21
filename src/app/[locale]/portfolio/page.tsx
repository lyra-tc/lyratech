import React from "react";
import Navbar from "@/components/Navbar/index";
import HeroPortfolio from "@/components/Portfolio/HeroPortfolio";
import ButtonLanguage from "@/components/ButtonLanguage";
import Footer from "@/components/Footer";

export default function PortfolioPage() {
    return (
        <div className="">
            <Navbar />
            <ButtonLanguage />
            <HeroPortfolio />
            <Footer />
        </div>
    );
}
