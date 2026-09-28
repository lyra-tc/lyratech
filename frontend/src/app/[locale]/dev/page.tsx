import React, { Suspense } from "react";
import { getPublishedProjects } from "@/lib/portfolio";
import Navbar from "@/components/Navbar/index";
import Hero from "@/components/Home/HeroHome";
import AboutUs from "@/components/Home/AboutUs";
import Services from "@/components/Home/Services";
import Portafolio from "@/components/Home/Portafolio";
import HelpAndSupport from "@/components/Home/HelpAndSupport";
import ButtonLanguage from "@/components/ButtonLanguage";
import Footer from "@/components/Footer";

export default async function Home() {
    const projects = await getPublishedProjects();

    return (
        <div className="">
            <Navbar />
            <ButtonLanguage />
            <Suspense fallback={null}>
                <Hero />
            </Suspense>
            <AboutUs />
            <Services />
            <Portafolio projects={projects} />
            <HelpAndSupport />
            <Footer />
        </div>
    );
}


