import React from "react";
import Navbar from "@/components/Navbar/index";
import HelpAndSupport from "@/components/Home/HelpAndSupport";
import ButtonLanguage from "@/components/ButtonLanguage";
import Footer from "@/components/Footer";

export default function ContactPage() {
    return (
        <div className="">
            <Navbar />
            <ButtonLanguage />
            <HelpAndSupport />
            <Footer />
        </div>
    );
}
