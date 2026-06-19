import React from "react";
import Navbar from "@/components/Navbar/index";
import Services from "@/components/Home/Services";
import ButtonLanguage from "@/components/ButtonLanguage";
import Footer from "@/components/Footer";

export default function ServicesPage() {
    return (
        <div className="">
            <Navbar />
            <ButtonLanguage />
            <Services />
            <Footer />
        </div>
    );
}
