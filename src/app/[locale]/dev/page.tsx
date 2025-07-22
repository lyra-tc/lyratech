import React from "react";
//import Image from "next/image";
import Navbar from "@/components/Navbar/index";
import Hero from "@/components/Home/HeroHome";
import ButtonLanguage from "@/components/ButtonLanguage";


export default function Home() {
    return (
        <div className="">
            <Navbar />
            <Hero />
            <ButtonLanguage />
        </div>
    );
}


