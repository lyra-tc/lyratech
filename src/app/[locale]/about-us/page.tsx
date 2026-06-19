import React from "react";
import Navbar from "@/components/Navbar/index";
import HeroAboutUs from "@/components/AboutUs/HeroAboutUs";
import TeamSection from "@/components/AboutUs/TeamSection";
import ButtonLanguage from "@/components/ButtonLanguage";
import Footer from "@/components/Footer";

export default function AboutUsPage() {
    return (
        <div className="">
            <Navbar />
            <ButtonLanguage />
            <HeroAboutUs />
            <TeamSection />
            <Footer />
        </div>
    );
}
