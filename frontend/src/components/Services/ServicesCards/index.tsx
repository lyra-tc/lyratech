"use client";

import React, { useState, CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import Link from "next/link";
import {
    HiOutlineLightningBolt,
    HiOutlineClipboardCheck,
    HiOutlineUserGroup,
    HiOutlineArrowRight,
    HiOutlineCheck,
} from "react-icons/hi";

const backfaceHidden: CSSProperties = { backfaceVisibility: "hidden" };
const preserve3d: CSSProperties = { transformStyle: "preserve-3d" };

export default function ServicesCards() {
    const t = useTranslations("servicesCards");
    const locale = useLocale();
    const [flipped, setFlipped] = useState<number | null>(null);

    const services = [
        {
            number: "01",
            Icon: HiOutlineLightningBolt,
            title: t("s1Title"),
            description: t("s1Desc"),
            features: [t("s1F1"), t("s1F2"), t("s1F3"), t("s1F4"), t("s1F5")],
        },
        {
            number: "02",
            Icon: HiOutlineClipboardCheck,
            title: t("s2Title"),
            description: t("s2Desc"),
            features: [t("s2F1"), t("s2F2"), t("s2F3"), t("s2F4"), t("s2F5"), t("s2F6")],
        },
        {
            number: "03",
            Icon: HiOutlineUserGroup,
            title: t("s3Title"),
            description: t("s3Desc"),
            features: [t("s3F1"), t("s3F2"), t("s3F3"), t("s3F4"), t("s3F5")],
        },
    ];

    return (
        <section className="px-6 py-16 md:py-24">
            <div className="max-w-6xl mx-auto">
                {/* Section header */}
                <div className="mb-14">
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {services.map((service, index) => {
                        const isFlipped = flipped === index;
                        return (
                            <div
                                key={index}
                                className="relative h-[480px] md:h-[500px]"
                                style={{ perspective: "1200px" }}
                            >
                                <div
                                    className="absolute inset-0"
                                    style={{
                                        ...preserve3d,
                                        transition: "transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
                                        transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                                    }}
                                >
                                    {/* Front */}
                                    <div
                                        className="absolute inset-0 border border-gray-200 rounded-[24px] bg-white p-8 flex flex-col shadow-sm"
                                        style={backfaceHidden}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <span className="font-montserrat-bold text-7xl text-gray-100 leading-none select-none">
                                                {service.number}
                                            </span>
                                            <div className="bg-lyratech-light-purple/40 p-3 rounded-2xl">
                                                <service.Icon className="text-lyratech-purple text-2xl" />
                                            </div>
                                        </div>

                                        <h3 className="font-montserrat-bold text-xl text-gray-900 mb-3">
                                            {service.title}
                                        </h3>
                                        <p className="font-montserrat text-gray-500 text-sm leading-relaxed flex-1">
                                            {service.description}
                                        </p>

                                        <div className="mt-6 flex items-end justify-end">
                                            <button
                                                onClick={() => setFlipped(index)}
                                                className="flex items-center gap-2 bg-lyratech-purple text-white px-4 py-2 rounded-full font-montserrat-bold text-sm hover:bg-[#5058a0] transition-colors duration-200"
                                            >
                                                {t("verMas")}
                                                <HiOutlineArrowRight className="text-base" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Back */}
                                    <div
                                        className="absolute inset-0 border border-lyratech-purple/40 rounded-[24px] bg-lyratech-blue p-8 flex flex-col"
                                        style={{
                                            ...backfaceHidden,
                                            transform: "rotateY(180deg)",
                                        }}
                                    >
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="font-montserrat-bold text-white text-lg leading-tight pr-4">
                                                {service.title}
                                            </h3>
                                            <button
                                                onClick={() => setFlipped(null)}
                                                className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
                                                aria-label="Volver"
                                            >
                                                <HiOutlineArrowRight className="text-xl rotate-180" />
                                            </button>
                                        </div>

                                        <ul className="flex flex-col gap-3 flex-1">
                                            {service.features.map((feature, i) => (
                                                <li key={i} className="flex items-start gap-3">
                                                    <HiOutlineCheck className="text-lyratech-purple text-base mt-0.5 flex-shrink-0" />
                                                    <span className="font-montserrat text-gray-300 text-sm leading-relaxed">
                                                        {feature}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>

                                        <div className="mt-6 pt-5 border-t border-white/10">
                                            <Link href={`/${locale}/contact`}>
                                                <button className="w-full bg-lyratech-purple text-white rounded-xl py-3 font-montserrat-bold text-sm hover:bg-[#5058a0] transition-colors duration-200">
                                                    {t("ctaContact")}
                                                </button>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
