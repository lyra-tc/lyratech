"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { HiOutlineStar } from "react-icons/hi";
import { MdOutlineFavorite, MdOutlineGpsFixed, MdOutlineBolt, MdOutlineEmojiEmotions } from "react-icons/md";
import Office1 from "@/assets/images/AboutUs/AboutUsIntro/LyratechOffice1.png";
import Office2 from "@/assets/images/AboutUs/AboutUsIntro/LyratechOffice2.png";

const features = [
    { icon: MdOutlineFavorite,      titleKey: "feat1Title", descKey: "feat1Desc" },
    { icon: MdOutlineGpsFixed,      titleKey: "feat2Title", descKey: "feat2Desc" },
    { icon: MdOutlineBolt,          titleKey: "feat3Title", descKey: "feat3Desc" },
    { icon: MdOutlineEmojiEmotions, titleKey: "feat4Title", descKey: "feat4Desc" },
] as const;

const images = [Office1, Office2];
const alts   = ["Lyratech team", "Lyratech workspace"];

export default function AboutUsIntro() {
    const t = useTranslations("aboutUsIntro");
    const [front, setFront] = useState(0);

    return (
        <section id="about-us-intro" className="py-24 px-6 md:px-16 lg:px-24 xl:px-32">
            <div className="flex flex-col lg:flex-row gap-16 xl:gap-20 items-center max-w-screen-xl mx-auto">

                {/* ── Left — text + features ─────────────────── */}
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                    className="w-full lg:w-1/2 flex flex-col gap-7"
                >
                    {/* Badge */}
                    <div className="flex items-center gap-2 bg-lyratech-light-purple rounded-full px-4 py-1.5 w-fit">
                        <HiOutlineStar className="text-lyratech-purple text-base" />
                        <span className="font-montserrat text-lyratech-purple font-semibold text-sm">
                            {t("badge")}
                        </span>
                    </div>

                    {/* Title */}
                    <h2 className="font-montserrat-bold text-4xl sm:text-5xl xl:text-6xl leading-tight text-black">
                        {t("titleBlack")}{" "}
                        <span className="text-lyratech-purple">{t("titlePurple")}</span>
                        <br />
                        {t("titleBlack2")}
                    </h2>

                    {/* Description */}
                    <p className="font-montserrat text-gray-500 text-base xl:text-lg leading-relaxed">
                        {t("description")}
                    </p>

                    {/* Features grid */}
                    <div className="grid grid-cols-2 gap-x-10 gap-y-8 mt-2">
                        {features.map(({ icon: Icon, titleKey, descKey }, i) => (
                            <motion.div
                                key={titleKey}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: i * 0.08 }}
                                viewport={{ once: true }}
                                className="flex flex-col gap-2"
                            >
                                <div className="w-11 h-11 rounded-lg bg-lyratech-purple flex items-center justify-center shrink-0">
                                    <Icon className="text-white text-xl" />
                                </div>
                                <p className="font-montserrat-bold text-black text-sm md:text-base">
                                    {t(titleKey)}
                                </p>
                                <p className="font-montserrat text-gray-400 text-xs md:text-sm leading-snug">
                                    {t(descKey)}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* ── Right — deck images ─────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.15 }}
                    viewport={{ once: true }}
                    className="w-full lg:w-1/2 flex items-center justify-center"
                >
                    {/*
                      The outer box is padded top-right so the peeking back
                      image has room to breathe without overlapping siblings.
                    */}
                    <div
                        className="relative mx-auto w-[78%] sm:w-[88%] lg:w-full h-[260px] sm:h-[340px] lg:h-[420px]"
                        style={{ paddingTop: "9%", paddingRight: "9%" }}
                    >
                        {images.map((src, idx) => {
                            const isFront = idx === front;
                            return (
                                <motion.div
                                    key={idx}
                                    onClick={() => setFront(prev => (prev === 0 ? 1 : 0))}
                                    animate={{
                                        x:       isFront ? "0%"  : "12%",
                                        y:       isFront ? "0%"  : "-12%",
                                        scale:   isFront ? 1     : 0.90,
                                        opacity: isFront ? 1     : 0.48,
                                        zIndex:  isFront ? 10    : 1,
                                    }}
                                    transition={{ type: "spring", stiffness: 270, damping: 28 }}
                                    className="absolute inset-0 cursor-pointer rounded-2xl overflow-hidden shadow-[0_14px_36px_-8px_rgba(0,0,0,0.20)]"
                                >
                                    <Image
                                        src={src}
                                        alt={alts[idx]}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 1024px) 90vw, 45vw"
                                    />
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>

            </div>
        </section>
    );
}
