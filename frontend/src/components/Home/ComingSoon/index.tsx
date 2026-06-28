"use client";

import React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import Logo from "@/assets/images/Home/ComingSoon/Logo.png";

function ComingSoon() {
    const t = useTranslations("comingsoon");

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-[#b2b6f3] via-[#787fbd] to-[#272a33] text-white text-center">
            <div className="max-w-sm sm:max-w-md md:max-w-lg space-y-6 animate-fade-in">
                <div className="animate-scale-in mb-4">
                    <Image
                        alt="Lyra Tech Logo"
                        src={Logo}
                        width={120}
                        height={120}
                        className="mx-auto"
                        priority
                    />
                </div>

                <h1 className="text-4xl sm:text-5xl font-black tracking-tight drop-shadow-md">
                    {t("title")}
                </h1>

                <h2 className="text-lg sm:text-xl font-semibold uppercase tracking-widest text-white/90">
                    {t("subtitle")}
                </h2>

                <p className="text-sm sm:text-base text-white/80 max-w-prose mx-auto leading-relaxed">
                    {t("description")}
                </p>

                <div className="pt-4">
                    <a
                        className="inline-block px-8 py-3 rounded-full text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-lyratech-purple to-lyratech-blue hover:from-white hover:to-white hover:text-lyratech-blue transition-all duration-500 shadow-lg"
                        href="#"
                    >
                        {t("button")}
                    </a>
                </div>
            </div>
        </div>
    );
}

export default ComingSoon;
