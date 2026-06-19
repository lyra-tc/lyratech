"use client";

import React from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { HiOutlineUser } from "react-icons/hi";

export default function HeroAboutUs() {
    const t = useTranslations("heroAboutUs");

    return (
        <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
            {/* Decorative blobs */}
            <div className="absolute top-1/3 -left-20 w-80 h-80 bg-lyratech-light-purple rounded-full blur-3xl opacity-30 -z-10" />
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-lyratech-purple rounded-full blur-3xl opacity-10 -z-10" />
            <div className="absolute top-10 right-1/4 w-40 h-40 bg-lyratech-light-purple rounded-full blur-2xl opacity-20 -z-10" />

            <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    onClick={() => document.getElementById("team")?.scrollIntoView({ behavior: "smooth" })}
                    className="flex items-center gap-2 sm:gap-3 bg-white border border-gray-200 rounded-full px-6 py-3 sm:px-10 sm:py-4 shadow-sm mb-8 sm:mb-10 cursor-pointer transition-all duration-300 hover:bg-lyratech-light-purple hover:border-lyratech-purple hover:shadow-md"
                >
                    <HiOutlineUser className="text-lyratech-purple text-2xl sm:text-3xl" />
                    <span className="font-montserrat text-gray-700 font-semibold text-base sm:text-lg">
                        {t("badge")}
                    </span>
                </motion.div>

                {/* Title */}
                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="font-montserrat-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl leading-tight mb-6 sm:mb-8"
                >
                    <span className="text-black">{t("titleLine1")} </span>
                    <span className="text-lyratech-purple">{t("titleLine2")}</span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="font-montserrat text-gray-500 text-sm sm:text-base md:text-lg max-w-xl sm:max-w-2xl leading-relaxed px-2 sm:px-0"
                >
                    {t("subtitle")}
                </motion.p>
            </div>
        </section>
    );
}
