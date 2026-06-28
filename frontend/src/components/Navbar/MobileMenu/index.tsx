"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { IoClose } from "react-icons/io5";
import { useTranslations } from "next-intl";

interface MobileMenuProps {
    onClose: () => void;
}

function MenuItem({
    label,
    href,
    onNavigate,
}: {
    label: string;
    href: string;
    onNavigate: (href: string) => void;
}) {
    const [lineVisible, setLineVisible] = useState(false);
    const [lineOrigin, setLineOrigin] = useState<"left" | "right">("left");
    const [isAnimating, setIsAnimating] = useState(false);

    const handleMouseEnter = () => {
        if (isAnimating) return;
        setLineOrigin("left");
        setLineVisible(true);
    };

    const handleMouseLeave = () => {
        if (isAnimating) return;
        setLineOrigin("right");
        setLineVisible(false);
    };

    const handleClick = async () => {
        if (isAnimating) return;
        setIsAnimating(true);
        // Línea aparece de izquierda a derecha
        setLineOrigin("left");
        setLineVisible(true);
        await new Promise<void>(r => setTimeout(r, 300));
        // Línea se borra de izquierda a derecha
        setLineOrigin("right");
        setLineVisible(false);
        await new Promise<void>(r => setTimeout(r, 300));
        setIsAnimating(false);
        onNavigate(href);
    };

    return (
        <button
            className="relative w-full text-center py-5 cursor-pointer"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
        >
            <span className="relative inline-block">
                {label}
                <motion.div
                    className="absolute -bottom-1 left-0 right-0 h-[2px] bg-white"
                    animate={{ scaleX: lineVisible ? 1 : 0 }}
                    style={{ transformOrigin: lineOrigin }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                />
            </span>
        </button>
    );
}

const MobileMenu: React.FC<MobileMenuProps> = ({ onClose }) => {
    const t = useTranslations("navbar");
    const router = useRouter();
    const [isClosing, setIsClosing] = useState(false);
    const [xFlat, setXFlat] = useState(false);

    const links = [
        { label: t("home"),       href: t("homeLink") },
        { label: t("aboutUs"),    href: t("aboutUsLink") },
        { label: t("services"),   href: t("servicesLink") },
        { label: t("portafolio"), href: t("portafolioLink") },
        { label: t("contact"),    href: t("contactLink") },
    ];

    const handleClose = async () => {
        // X se aplasta como un guión
        setXFlat(true);
        await new Promise<void>(r => setTimeout(r, 150));
        // Menú sube
        setIsClosing(true);
    };

    const handleNavigate = (href: string) => {
        setIsClosing(true);
        router.push(href);
    };

    return (
        <AnimatePresence onExitComplete={onClose}>
            {!isClosing && (
                <motion.div
                    className="fixed inset-0 bg-dark-blue z-50 flex flex-col justify-center items-center text-white font-montserrat"
                    initial={{ y: "-100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "-100%" }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                >
                    {/* Botón de cerrar: X → guión */}
                    <motion.button
                        className="absolute top-4 right-4 text-3xl"
                        animate={{ scaleY: xFlat ? 0 : 1 }}
                        transition={{ duration: 0.15, ease: "easeIn" }}
                        onClick={handleClose}
                    >
                        <IoClose />
                    </motion.button>

                    {/* Items del menú con divisores */}
                    <div className="flex flex-col text-xl font-semibold text-center w-4/5 max-w-xs">
                        {links.map((link, i) => (
                            <React.Fragment key={link.href}>
                                {i > 0 && (
                                    <div className="w-full h-px bg-white/20" />
                                )}
                                <MenuItem
                                    label={link.label}
                                    href={link.href}
                                    onNavigate={handleNavigate}
                                />
                            </React.Fragment>
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MobileMenu;
