"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
//import Logo from "@/assets/images/Home/Hero/CrystalLogo.png";
import Logo from "@/assets/images/Home/Hero/SolidLogo.png";
//import Logo from "@/assets/images/Home/Hero/Logo.png";

function HeroHome() {
    const t = useTranslations("heroHome");

    return (
        <div id="home" className="text-black flex flex-col items-center justify-center md:flex-row md:mt-16 xl:mt-2 mb-16 md:mb-16">
            {/*Logo*/}
            <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="mt-10 md:order-1 md:w-1/3 lg:w-1/2"
            >
                <Image
                    alt="Lyra Tech Logo"
                    src={Logo}
                    className="px-16 md:px-10 lg:px-32 xl:pr-72"
                    priority
                />
            </motion.div>

            {/*Text*/}
            <div className="flex flex-col mt-10 gap-y-8 md:w-2/3 lg:w-1/2 lg:pl-32 xl:pl-40">
                <motion.h1
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
                    className="text-4xl font-montserrat-bold text-center px-10 md:text-left md:px-12 lg:text-5xl lg:px-0 xl:text-6xl"
                >
                    {t("title")}
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                    className="text-center px-6 font-montserrat text-lg md:text-left md:px-12 lg:px-0 xl:text-xl"
                >
                    {t("subtitle")}
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
                    className="flex flex-col px-10 md:px-12 lg:px-0 font-montserrat-bold gap-y-3 md:flex-row md:gap-3 md:gap-y-0"
                >
                    <a href="https://wa.me/525564075229" target="_blank" rel="noopener noreferrer" className="text-center bg-lyratech-purple text-white py-3 px-6 xl:px-10 rounded-[15px] lg:text-sm lg:py-5 lg:rounded-[20px] xl:text-lg xl:py-4 transition-transform duration-500 ease-in-out hover:scale-75">
                        {t("buttonContact1")}
                    </a>
                    <a href="tel:+525564075229" target="_blank" rel="noopener noreferrer" className="text-center border border-black py-3 px-3 xl:px-10 rounded-[15px] lg:text-sm lg:py-5 lg:rounded-[20px] xl:text-lg xl:py-4 transition-transform duration-500 ease-in-out hover:scale-75">
                        {t("buttonContact2")}
                    </a>
                </motion.div>
            </div>
        </div>
    );
}

export default HeroHome;
