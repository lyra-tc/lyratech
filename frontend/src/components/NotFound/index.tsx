"use client";

import React from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { HiOutlineExclamationCircle } from "react-icons/hi";
import { Link } from "@/navigation";

export default function NotFound() {
    const t = useTranslations("notFound");

    return (
        <section className="relative min-h-[80vh] flex flex-col items-center justify-center px-6 overflow-hidden text-center">
            <div className="absolute top-1/3 -left-20 w-80 h-80 bg-lyratech-light-purple rounded-full blur-3xl opacity-30 -z-10" />
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-lyratech-purple rounded-full blur-3xl opacity-10 -z-10" />

            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center gap-2 sm:gap-3 bg-white border border-gray-200 rounded-full px-6 py-3 sm:px-10 sm:py-4 shadow-sm mb-8 sm:mb-10"
            >
                <HiOutlineExclamationCircle className="text-lyratech-purple text-2xl sm:text-3xl" />
                <span className="font-montserrat text-gray-700 font-semibold text-base sm:text-lg">
                    {t("badge")}
                </span>
            </motion.div>

            <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="font-montserrat-bold text-6xl sm:text-7xl md:text-8xl leading-tight mb-6 text-lyratech-purple"
            >
                404
            </motion.h1>

            <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="font-montserrat text-gray-500 text-sm sm:text-base md:text-lg max-w-xl mx-auto leading-relaxed mb-10 px-2 sm:px-0"
            >
                {t("description")}
            </motion.p>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
            >
                <Link
                    href="/"
                    className="inline-block px-8 py-3 rounded-full text-sm font-bold uppercase tracking-wider text-white bg-gradient-to-r from-lyratech-purple to-lyratech-blue hover:opacity-90 transition-all duration-300 shadow-lg"
                >
                    {t("button")}
                </Link>
            </motion.div>
        </section>
    );
}
