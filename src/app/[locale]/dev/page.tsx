import React from "react";
//import Image from "next/image";
import Navbar from "@/components/Navbar/index";
import Hero from "@/components/Home/HeroHome";
import AboutUs from "@/components/Home/AboutUs";
import Services from "@/components/Home/Services";
import Portafolio from "@/components/Home/Portafolio";
import HelpAndSupport from "@/components/Home/HelpAndSupport";
import ButtonLanguage from "@/components/ButtonLanguage";
import Footer from "@/components/Footer";

export default function Home() {
    return (
        <div className="">
            <Navbar />
            <ButtonLanguage />
            <Hero />
            <AboutUs />
            <Services />
            <Portafolio />
            <HelpAndSupport />
            <Footer />
        </div>
    );
}


