import React from "react";
import Navbar from "@/components/Navbar/index";
import Portafolio from "@/components/Home/Portafolio";
import ButtonLanguage from "@/components/ButtonLanguage";
import Footer from "@/components/Footer";

export default function PortfolioPage() {
    return (
        <div className="">
            <Navbar />
            <ButtonLanguage />
            <Portafolio />
            <Footer />
        </div>
    );
}
