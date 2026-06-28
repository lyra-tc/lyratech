import React from "react";
import Navbar from "@/components/Navbar/index";
import HeroAboutUs from "@/components/AboutUs/HeroAboutUs";
import AboutUsIntro from "@/components/AboutUs/AboutUsIntro";
import TeamSection from "@/components/AboutUs/TeamSection";
import VisionMission from "@/components/AboutUs/VisionMission";
import ButtonLanguage from "@/components/ButtonLanguage";
import Footer from "@/components/Footer";

export default function AboutUsPage() {
    return (
        <div className="">
            <Navbar />
            <ButtonLanguage />
            <HeroAboutUs />
            <TeamSection />
            <AboutUsIntro />
            <VisionMission />
            <Footer />
        </div>
    );
}
