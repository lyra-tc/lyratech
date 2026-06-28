import React from "react";
import Navbar from "@/components/Navbar/index";
import HeroContact from "@/components/Contact/HeroContact";
import ContactForm from "@/components/Contact/ContactForm";
import FAQ from "@/components/Contact/FAQ";
import HelpAndSupport from "@/components/Home/HelpAndSupport";
import ButtonLanguage from "@/components/ButtonLanguage";
import Footer from "@/components/Footer";

export default function ContactPage() {
    return (
        <div className="">
            <Navbar />
            <ButtonLanguage />
            <HeroContact />
            <ContactForm />
            <FAQ />
            <Footer />
        </div>
    );
}
