"use client";

import React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import Logo from "@/assets/images/Footer/FooterLogo.png";
import { MdMailOutline } from "react-icons/md";
import { FiPhone } from "react-icons/fi";
import { HiOutlineLocationMarker } from "react-icons/hi";

function Footer() {
    const t = useTranslations("footer");
    const footerLinks = [
        {
            title: t("company"),
            links: [t("company1"), t("company2"), t("company3")],
        },
        {
            title: t("services"),
            links: [t("services1"), t("services2"), t("services3"), t("services4")],
        },
        {
            title: t("resources"),
            links: [t("resources1"), t("resources2"), t("resources3")],
        },
    ];

    return (
        <footer className="bg-gradient-to-br from-[#303950] to-[#141720] text-white font-montserrat">
            {/* Contenido principal */}
            <div className="px-6 md:px-10 lg:px-28 py-10 grid grid-cols-1 md:grid-cols-4 gap-y-10 gap-x-8">
                {/* Columna Logo + Texto */}
                <div className="flex flex-col gap-5 font-[100] items-center md:items-start">
                    <Image src={Logo} alt="Lyra Tech" className="w-40 h-auto" />
                    <p className="text-sm leading-relaxed">
                        {t("description")}
                    </p>
                    <div className="flex flex-col gap-2 text-sm">
                        <a href="#" className="flex items-center gap-2 relative group">
                            <MdMailOutline className="text-lg text-lyratech-purple"/>
                            <span className="relative after:content-[''] after:absolute after:left-0 after:-bottom-0.5
                              after:w-0 after:h-[2px] after:bg-white after:transition-all after:duration-300
                              group-hover:after:w-full">
                              lyratech@lyratech.com.mx
                            </span>
                        </a>

                        <a href="#" className="flex items-center gap-2 relative group">
                            <FiPhone className="text-lg text-lyratech-purple"/>
                            <span className="relative after:content-[''] after:absolute after:left-0 after:-bottom-0.5
                              after:w-0 after:h-[2px] after:bg-white after:transition-all after:duration-300
                              group-hover:after:w-full">
                              +52 55 6407 5229
                            </span>
                        </a>

                        <a href="#" className="flex items-center gap-2 relative group">
                            <HiOutlineLocationMarker className="text-lg text-lyratech-purple"/>
                            <span className="relative after:content-[''] after:absolute after:left-0 after:-bottom-0.5
                                after:w-0 after:h-[2px] after:bg-white after:transition-all after:duration-300
                                group-hover:after:w-full">
                                {t("location")}
                            </span>
                        </a>
                    </div>

                </div>

                {/* Columnas generadas con map */}
                {footerLinks.map((section, idx) => (
                    <div key={idx} className="flex flex-col items-center">
                        <h3 className="font-bold mb-4">{section.title}</h3>
                        <ul className="flex flex-col gap-2 text-sm text-gray-400">
                            {section.links.map((link, i) => (
                                <li key={i}>
                                    <a
                                        href="#"
                                        className="relative inline-block text-gray-400
                                          after:content-[''] after:absolute after:left-0 after:-bottom-0.5
                                          after:w-0 after:h-[3px] after:bg-gray-400
                                          after:transition-all after:duration-300 hover:after:w-full">
                                        {link}
                                    </a>
                                </li>
                            ))}
                        </ul>

                    </div>
                ))}
            </div>

            {/* Línea inferior */}
            <div className="bg-black text-center py-4 text-xs lg:text-lg">
                © 2025 LyraTech. Todos los derechos reservados.
            </div>
        </footer>
    );
}

export default Footer;
