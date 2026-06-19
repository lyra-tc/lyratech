"use client";

import React from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

export default function VisionMission() {
    const t = useTranslations("visionMission");

    const cards = [
        { titleKey: "visionTitle", descKey: "visionDesc" },
        { titleKey: "missionTitle", descKey: "missionDesc" },
    ] as const;

    return (
        <section className="py-20 px-6">
            <div className="flex flex-col sm:flex-row justify-center gap-6 max-w-4xl mx-auto">
                {cards.map((card, i) => (
                    <motion.div
                        key={card.titleKey}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: i * 0.12 }}
                        viewport={{ once: true }}
                        className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-[0_8px_24px_-4px_rgba(0,0,0,0.10)] px-10 py-14 flex flex-col items-center text-center"
                    >
                        <h2 className="font-montserrat-bold text-3xl md:text-4xl text-black mb-6">
                            {t(card.titleKey)}
                        </h2>
                        <p className="font-montserrat text-gray-500 text-sm md:text-base leading-relaxed">
                            {t(card.descKey)}
                        </p>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
