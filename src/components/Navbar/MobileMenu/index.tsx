"use client";

import React from "react";
import { IoClose } from "react-icons/io5";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface MobileMenuProps {
    onClose: () => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ onClose }) => {
    const t = useTranslations("navbar");

    return (
        <div className="fixed inset-0 bg-dark-blue z-50 flex flex-col justify-center items-center text-white">
            <button
                className="absolute top-4 right-4 text-3xl"
                onClick={onClose}
            >
                <IoClose />
            </button>

            <div className="flex flex-col gap-6 text-xl font-semibold text-center w-4/5 max-w-xs">
                <Link href="/"><span onClick={onClose} className="border-b pb-2 cursor-pointer">{t("home")}</span></Link>
                <Link href="/"><span onClick={onClose} className="border-b pb-2 cursor-pointer">{t("aboutUs")}</span></Link>
                <Link href="/"><span onClick={onClose} className="border-b pb-2 cursor-pointer">{t("services")}</span></Link>
                <Link href="/"><span onClick={onClose} className="border-b pb-2 cursor-pointer">{t("portafolio")}</span></Link>
                <Link href="/"><span onClick={onClose} className="border-b pb-2 cursor-pointer">{t("contact")}</span></Link>
            </div>
        </div>
    );
};

export default MobileMenu;
