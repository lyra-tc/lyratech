import React from "react";
import Navbar from "@/components/Navbar/index";
import HeroServices from "@/components/Services/HeroServices";
import Services from "@/components/Home/Services";
import ButtonLanguage from "@/components/ButtonLanguage";
import Footer from "@/components/Footer";

export default function ServicesPage() {
    return (
        <div className="">
            <Navbar />
            <ButtonLanguage />
            <HeroServices />
            <Footer />
        </div>
    );
}
