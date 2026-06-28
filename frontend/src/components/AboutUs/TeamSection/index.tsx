"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { BsPersonVcard } from "react-icons/bs";
import { HiOutlineMail } from "react-icons/hi";
import { FaLinkedinIn } from "react-icons/fa";

import DaniCImage from "@/assets/images/DigitalBusinessCard/DaniC.png";
import DaniQImage from "@/assets/images/DigitalBusinessCard/DaniQ.png";
import EzzatImage from "@/assets/images/DigitalBusinessCard/Ezzat.jpg";
import GaloImage from "@/assets/images/DigitalBusinessCard/Galo.jpg";
import RichieImage from "@/assets/images/DigitalBusinessCard/Richie.png";

const members = [
    {
        name: "Daniel Contreras Chávez",
        role: "Co-Founder & CEO",
        image: DaniCImage,
        email: "daniel.contreras@lyratech.com.mx",
        cardUrl: "/daniel-contreras",
        linkedinUrl: "https://www.linkedin.com/in/daniel-contreras-ch%C3%A1vez-22b304292/",
        descKey: "desc1",
    },
    {
        name: "Daniel Queijeiro Albo",
        role: "Co-Founder & COO",
        image: DaniQImage,
        email: "daniel.queijeiro@lyratech.com.mx",
        cardUrl: "/daniel-queijeiro",
        linkedinUrl: "https://www.linkedin.com/in/daniel-queijeiro-albo-0377a2292/",
        descKey: "desc2",
    },
    {
        name: "Ezzat Alzahouri Campos",
        role: "Co-Founder & CTO",
        image: EzzatImage,
        email: "ezzat.alzahouri@lyratech.com.mx",
        cardUrl: "/ezzat",
        linkedinUrl: "https://www.linkedin.com/in/ezzat-alzahouri/",
        descKey: "desc3",
    },
    {
        name: "Galo Del Río Viggiano",
        role: "Co-Founder & CMO",
        image: GaloImage,
        email: "galo.viggiano@lyratech.com.mx",
        cardUrl: "/galo",
        linkedinUrl: "https://www.linkedin.com/in/galo-alejandro-del-r%C3%ADo-viggiano-9a8923348/",
        descKey: "desc4",
    },
    {
        name: "Ricardo Sierra Roa",
        role: "Co-Founder & CFO",
        image: RichieImage,
        email: "ricardo.sierra@lyratech.com.mx",
        cardUrl: "/ricardo",
        linkedinUrl: "https://www.linkedin.com/in/ricardo-sierra-roa",
        descKey: "desc5",
    },
];

export default function TeamSection() {
    const t = useTranslations("teamSection");

    return (
        <section id="team" className="py-20 px-6">
            <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="font-montserrat-bold text-4xl md:text-5xl text-center text-black mb-16"
            >
                {t("title")}
            </motion.h2>

            <div className="flex flex-wrap justify-center gap-6 max-w-5xl mx-auto">
                {members.map((member, i) => (
                    <motion.div
                        key={member.name}
                        onClick={() => window.open(member.cardUrl, "_blank")}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: i * 0.08 }}
                        viewport={{ once: true }}
                        className="w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] bg-white border border-gray-100 rounded-2xl shadow-[0_8px_24px_-4px_rgba(0,0,0,0.12)] p-7 flex flex-col items-center text-center hover:shadow-[0_16px_40px_-6px_rgba(0,0,0,0.18)] transition-shadow duration-300 cursor-pointer"
                    >
                        {/* Avatar */}
                        <div className="w-32 h-32 rounded-full bg-white flex items-center justify-center mb-5 overflow-hidden ring-4 ring-lyratech-light-purple">
                            <Image
                                src={member.image}
                                alt={member.name}
                                width={128}
                                height={128}
                                className="w-full h-full object-cover rounded-full"
                            />
                        </div>

                        {/* Name & Role */}
                        <p className="font-montserrat-bold text-black text-lg leading-snug mb-1">
                            {member.name}
                        </p>
                        <p className="font-montserrat text-lyratech-purple text-sm mb-4">
                            {member.role}
                        </p>

                        {/* Description */}
                        <p className="font-montserrat text-gray-400 text-sm leading-relaxed mb-6">
                            {t(member.descKey as "desc1")}
                        </p>

                        {/* Social icons */}
                        <div className="flex items-center gap-3 mt-auto">
                            <a
                                href={member.cardUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Tarjeta digital"
                                onClick={(e) => e.stopPropagation()}
                                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-lyratech-light-purple hover:text-lyratech-purple transition-all duration-200 text-base"
                            >
                                <BsPersonVcard />
                            </a>
                            <a
                                href={`mailto:${member.email}`}
                                title="Correo"
                                onClick={(e) => e.stopPropagation()}
                                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-lyratech-light-purple hover:text-lyratech-purple transition-all duration-200 text-base"
                            >
                                <HiOutlineMail />
                            </a>
                            <a
                                href={member.linkedinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="LinkedIn"
                                onClick={(e) => e.stopPropagation()}
                                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-lyratech-light-purple hover:text-lyratech-purple transition-all duration-200 text-base"
                            >
                                <FaLinkedinIn />
                            </a>
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
