"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { FaPhone } from "react-icons/fa6";
import Logo from "@/assets/images/Navbar/White_Logo.png";
import ClosedNotch from "@/assets/images/Navbar/ClosedNotch.png";
import MobileMenu from "./MobileMenu";
import { useTranslations } from "next-intl";

function Navbar() {
    const t = useTranslations("navbar");
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const notchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                notchRef.current &&
                !notchRef.current.contains(event.target as Node)
            ) {
                setIsExpanded(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleLogoClick = () => {
        if (isMobile) {
            setIsMobileMenuOpen(true);
        } else {
            setIsExpanded((prev) => !prev);
        }
    };

    return (
        <div className="w-full pb-0 font-montserrat">
            {/* Barra superior */}
            <div className="bg-dark-blue -mb-[1px]">
                <div className="relative flex justify-center items-center h-12 translate-y-4">
                    {/* Botón de Contáctanos */}
                    <div className="hidden md:flex absolute right-8 top-16">
                        <Link href="/">
                            <button className="flex items-center gap-2 bg-dark-blue text-white text-lg font-semibold px-6 py-5 rounded-full transition-transform duration-500 ease-in-out hover:scale-75 active:scale-90">
                                <FaPhone className="text-lg" />
                                {t("contact")}
                            </button>
                        </Link>
                    </div>

                    {/* Grupo de navegación */}
                    <div className="flex items-center gap-6 text-white text-sm font-semibold">
                        {/* Textos izquierda */}
                        <AnimatePresence>
                            {!isMobile && isExpanded && (
                                <motion.div
                                    className="flex gap-4"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <Link href="/">
                                        <span className="relative text-lg after:block after:h-[2px] after:bg-white after:scale-x-0 after:origin-left after:transition-transform after:duration-300 hover:after:scale-x-100 cursor-pointer">
                                            {t("home")}
                                        </span>
                                    </Link>
                                    <Link href="/">
                                        <span className="relative text-lg after:block after:h-[2px] after:bg-white after:scale-x-0 after:origin-left after:transition-transform after:duration-300 hover:after:scale-x-100 cursor-pointer">
                                            {t("aboutUs")}
                                        </span>
                                    </Link>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Logo */}
                        <Image
                            alt="Lyra Tech Logo"
                            src={Logo}
                            width={20}
                            height={20}
                            className="cursor-pointer"
                            onClick={handleLogoClick}
                            priority
                        />

                        {/* Textos derecha */}
                        <AnimatePresence>
                            {!isMobile && isExpanded && (
                                <motion.div
                                    className="flex gap-4"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <Link href="/">
                                        <span className="relative text-lg after:block after:h-[2px] after:bg-white after:scale-x-0 after:origin-left after:transition-transform after:duration-300 hover:after:scale-x-100 cursor-pointer">
                                            {t("services")}
                                        </span>
                                    </Link>
                                    <Link href="/">
                                        <span className="relative text-lg after:block after:h-[2px] after:bg-white after:scale-x-0 after:origin-left after:transition-transform after:duration-300 hover:after:scale-x-100 cursor-pointer">
                                            {t("portafolio")}
                                        </span>
                                    </Link>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Notch visible solo en md+ */}
            <div
                ref={notchRef}
                onClick={!isMobile ? () => setIsExpanded((prev) => !prev) : undefined}
                className={`mx-auto cursor-pointer transition-all duration-500 ease-in-out
                    w-32 h-8 md:h-9
                    ${!isMobile && isExpanded ? "md:w-[700px] lg:w-[1000px]" : "md:w-44"}
                `}
            >
                <Image
                    alt="Lyra Tech Notch"
                    src={ClosedNotch}
                    className="w-full h-full"
                    priority
                />
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <MobileMenu onClose={() => setIsMobileMenuOpen(false)} />
            )}
        </div>
    );
}

export default Navbar;
