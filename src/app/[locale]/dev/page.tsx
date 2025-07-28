import React from "react";
//import Image from "next/image";
import Navbar from "@/components/Navbar/index";
import Hero from "@/components/Home/HeroHome";
import HelpAndSupport from "@/components/Home/HelpAndSupport";
import ButtonLanguage from "@/components/ButtonLanguage";


export default function Home() {
    return (
        <div className="">
            <Navbar />
            <Hero />
            <HelpAndSupport />
            <ButtonLanguage />
        </div>
    );
}


