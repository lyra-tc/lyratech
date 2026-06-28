"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { HiOutlineCheck, HiOutlineLightBulb } from "react-icons/hi";
import BookingModal from "@/components/shared/BookingModal";

export default function DiagnosticoStrategico() {
    const t = useTranslations("diagnostico");
    const [active, setActive] = useState<number | null>(null);
    const [showBooking, setShowBooking] = useState(false);

    const plans = [
        {
            key: "express",
            name: t("p1Name"),
            duration: t("p1Duration"),
            features: [t("p1F1"), t("p1F2"), t("p1F3")],
            featured: false,
        },
        {
            key: "standard",
            name: t("p2Name"),
            duration: t("p2Duration"),
            features: [t("p2F1"), t("p2F2"), t("p2F3")],
            featured: true,
        },
        {
            key: "pro",
            name: t("p3Name"),
            duration: t("p3Duration"),
            features: [t("p3F1"), t("p3F2"), t("p3F3"), t("p3F4"), t("p3F5")],
            featured: false,
        },
    ];

    return (
        <>
            <section id="diagnostico" className="px-6 py-16 md:py-24 bg-gray-50/60">
                <div className="max-w-6xl mx-auto">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16">
                        <div>
                            <p className="font-montserrat text-xs text-lyratech-purple uppercase tracking-widest mb-3">
                                {t("label")}
                            </p>
                            <h2 className="font-montserrat-bold text-3xl md:text-4xl lg:text-5xl text-gray-900 leading-tight">
                                {t("title")}
                            </h2>
                            <p className="font-montserrat text-gray-500 text-base mt-4 max-w-xl leading-relaxed">
                                {t("subtitle")}
                            </p>
                        </div>

                        {/* Credit policy pill */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                            className="flex-shrink-0 bg-lyratech-purple text-white rounded-2xl px-6 py-5 max-w-xs"
                        >
                            <p className="font-montserrat-bold text-3xl mb-1">100%</p>
                            <p className="font-montserrat text-sm text-lyratech-light-purple leading-snug">
                                {t("creditPolicy")}
                            </p>
                        </motion.div>
                    </div>

                    {/* Plan cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {plans.map((plan, index) => {
                            const isActive = active === index;
                            return (
                                <motion.div
                                    key={plan.key}
                                    initial={{ opacity: 0, y: 24 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4, delay: index * 0.1 }}
                                    onClick={() => setActive(isActive ? null : index)}
                                    className={`relative rounded-[24px] flex flex-col cursor-pointer select-none
                                        transition-all duration-300
                                        ${plan.featured
                                            ? `border-2 bg-white
                                               ${isActive
                                                   ? "border-lyratech-purple shadow-[0_16px_40px_rgba(95,102,174,0.35)] -translate-y-2"
                                                   : "border-lyratech-purple shadow-[0_8px_32px_rgba(95,102,174,0.2)] hover:shadow-[0_16px_40px_rgba(95,102,174,0.35)] hover:-translate-y-2"
                                               }`
                                            : `border bg-white
                                               ${isActive
                                                   ? "border-lyratech-purple/60 shadow-[0_12px_32px_rgba(95,102,174,0.18)] -translate-y-1"
                                                   : "border-gray-200 shadow-sm hover:border-lyratech-purple/40 hover:shadow-[0_12px_32px_rgba(95,102,174,0.15)] hover:-translate-y-1"
                                               }`
                                        }`}
                                >
                                    {plan.featured && (
                                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                                            <span className="bg-lyratech-purple text-white text-xs font-montserrat-bold px-4 py-1.5 rounded-full uppercase tracking-wider whitespace-nowrap shadow-sm">
                                                {t("featured")}
                                            </span>
                                        </div>
                                    )}

                                    <div className={`p-8 flex flex-col flex-1 ${plan.featured ? "pt-10" : "pt-8"}`}>
                                        <h3 className="font-montserrat-bold text-xl text-gray-900 mb-1">
                                            {plan.name}
                                        </h3>
                                        <p className="font-montserrat text-sm text-gray-400 mb-1">
                                            {plan.duration}
                                        </p>
                                        <div className="w-8 h-0.5 bg-lyratech-purple mt-3 mb-6" />

                                        <ul className="flex flex-col gap-3 flex-1">
                                            {plan.features.map((feature, i) => (
                                                <li key={i} className="flex items-start gap-3">
                                                    <HiOutlineCheck className="text-lyratech-purple text-base mt-0.5 flex-shrink-0" />
                                                    <span className="font-montserrat text-gray-600 text-sm leading-relaxed">
                                                        {feature}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>

                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Bottom CTA */}
                    <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
                        <div className="flex items-center gap-2 text-gray-500">
                            <HiOutlineLightBulb className="text-lyratech-purple text-xl flex-shrink-0" />
                            <p className="font-montserrat text-sm leading-relaxed max-w-md text-left">
                                {t("ctaNote")}
                            </p>
                        </div>
                        <button
                            onClick={() => setShowBooking(true)}
                            className="flex-shrink-0 bg-lyratech-purple text-white font-montserrat-bold text-sm px-7 py-3 rounded-[15px] lg:rounded-[20px] transition-transform duration-500 ease-in-out hover:scale-75"
                        >
                            {t("ctaButton")}
                        </button>
                    </div>
                </div>
            </section>

            <BookingModal
                isOpen={showBooking}
                onClose={() => setShowBooking(false)}
                title={t("ctaButton")}
            />
        </>
    );
}
