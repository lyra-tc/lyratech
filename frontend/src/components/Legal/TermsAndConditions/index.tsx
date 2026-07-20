"use client";

import React from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

export default function TermsAndConditions() {
    const t = useTranslations("terms");

    // Cada item de "sections" es un bloque { titleKey, bodyKey } que debes
    // definir en messages/{locale}.json bajo la key "terms".
    const sections = [
        { titleKey: "section1Title", bodyKey: "section1Body" },
        { titleKey: "section2Title", bodyKey: "section2Body" },
        { titleKey: "section3Title", bodyKey: "section3Body" },
        { titleKey: "section4Title", bodyKey: "section4Body" },
        { titleKey: "section5Title", bodyKey: "section5Body" },
    ] as const;

    return (
        <section id="terminos" className="py-20 px-6 scroll-mt-24">
            <div className="max-w-3xl mx-auto">
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    viewport={{ once: true }}
                    className="font-montserrat-bold text-3xl md:text-5xl text-black mb-4"
                >
                    {t("title")}
                </motion.h1>

                <p className="font-montserrat text-gray-400 text-sm mb-12">
                    {t("lastUpdated")}
                </p>

                <div className="flex flex-col gap-10">
                    {sections.map((s, i) => (
                        <motion.div
                            key={s.titleKey}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: i * 0.08 }}
                            viewport={{ once: true }}
                        >
                            <h2 className="font-montserrat-bold text-xl md:text-2xl text-lyratech-purple mb-3">
                                {t(s.titleKey)}
                            </h2>
                            <p className="font-montserrat text-gray-500 text-sm md:text-base leading-relaxed whitespace-pre-line">
                                {t(s.bodyKey)}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
