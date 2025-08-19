"use client";

import React from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import Image from "next/image";
import AboutUs1 from "@/assets/images/Home/AboutUs/AboutUs1.png";
import AboutUs2 from "@/assets/images/Home/AboutUs/AboutUs2.png";

export default function ScrollStack() {
    const t = useTranslations("aboutUsHome");
    const cards = [
        {
            title: t("titleCard1"),
            text: t("descriptionCard1"),
            button: t("buttonCard1"),
            img: AboutUs1
        },
        {
            title: t("titleCard2"),
            text: t("descriptionCard2"),
            button: t("buttonCard2"),
            img: AboutUs2
        },
    ];

    return (
        <div id="about-us" className="relative w-full font-montserrat">
            {cards.map((card, i) => (
                <section
                    key={i}
                    className="sticky top-0 h-screen flex items-center justify-center"
                    style={{ zIndex: i + 1 }}
                >
                    <motion.div
                        initial={{ scale: 1.1, y: 50, opacity: 0 }} // Empieza más grande y un poco abajo
                        whileInView={{ scale: 1, y: i === 0 ? 0 : -30, opacity: 1 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        viewport={{ once: false, amount: 0.6 }}
                        className="bg-beige rounded-3xl shadow-contact w-[80%] md:w-[80%] lg:w-[60%] xl:w-[60%] px-10 flex flex-col items-center text-center py-14 lg:py-20 relative"
                    >
                        <div className="flex flex-col lg:flex-row items-center justify-center lg:gap-10">
                            <div className="lg:w-1/2">
                                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 lg:text-left">{card.title}</h2>
                                <p className="mb-8 text-justify lg:text-xs xl:text-base">{card.text}</p>
                                <div className="flex flex-col justify-start items-start">
                                    <a className="bg-[#5F67AF] text-white px-6 py-3 shadow-button rounded-[10px] lg:rounded-[15px] transition-transform duration-500 ease-in-out hover:scale-75">
                                        {card.button}
                                    </a>
                                </div>
                            </div>
                            <div className="mt-14 md:mt-6 lg:w-1/2">
                                <Image alt="About Us" src={card.img} />
                            </div>
                        </div>
                    </motion.div>
                </section>
            ))}
        </div>
    );
}
