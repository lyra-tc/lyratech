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
                    className="flex items-center gap-3 bg-white border border-gray-200 rounded-full px-10 py-4 shadow-sm mb-10 cursor-pointer transition-all duration-300 hover:bg-lyratech-light-purple hover:border-lyratech-purple hover:shadow-md"
                >
                    <HiOutlineUser className="text-lyratech-purple text-3xl transition-transform duration-300 group-hover:scale-110" />
                    <span className="font-montserrat text-gray-700 font-semibold text-lg">
                        {t("badge")}
                    </span>
                </motion.div>

                {/* Title */}
                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="font-montserrat-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-tight mb-8"
                >
                    <span className="text-black">{t("titleLine1")} </span>
                    <span className="text-lyratech-purple whitespace-nowrap">{t("titleLine2")}</span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="font-montserrat text-gray-500 text-base md:text-lg max-w-2xl leading-relaxed"
                >
                    {t("subtitle")}
                </motion.p>
            </div>
        </section>
    );
}
