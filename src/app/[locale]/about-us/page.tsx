import React from "react";
import Navbar from "@/components/Navbar/index";
import HeroAboutUs from "@/components/AboutUs/HeroAboutUs";
import ButtonLanguage from "@/components/ButtonLanguage";
import Footer from "@/components/Footer";

export default function AboutUsPage() {
    return (
        <div className="">
            <Navbar />
            <ButtonLanguage />
            <HeroAboutUs />
            <Footer />
        </div>
    );
}
