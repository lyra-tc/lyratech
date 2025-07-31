"use client";

import React, { useRef, useState, useEffect, useCallback, CSSProperties } from "react";
import { useTranslations } from "next-intl";

type Service = {
    title: string;
    items: string[];
};

function Services() {
    const t = useTranslations("servicesHome");
    const indices = [0,1,2,3,4,5,6] as const;
    const servicesData: Service[] = [
        {
            title: t("serviceTitle1"),
            items: indices.map(i => t(`serviceItems1_${i}`)),
        },
        {
            title: t("serviceTitle2"),
            items: indices.map(i => t(`serviceItems2_${i}`)),
        },
        {
            title: t("serviceTitle3"),
            items: indices.map(i => t(`serviceItems3_${i}`)),
        },
    ];


    const containerRef = useRef<HTMLDivElement>(null);
    const [highlightStyle, setHighlightStyle] = useState<CSSProperties>({ opacity: 0 });

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const cards = Array.from(container.querySelectorAll<HTMLDivElement>(".card"));
        for (const card of cards) {
            const cardRect = card.getBoundingClientRect();
            const cardX = cardRect.left - rect.left;
            const cardY = cardRect.top - rect.top;

            if (
                x > cardX &&
                x < cardX + cardRect.width &&
                y > cardY &&
                y < cardY + cardRect.height
            ) {
                setHighlightStyle({
                    opacity: 1,
                    transform: `translate(${cardX}px, ${cardY}px) scale(1)`,
                    width: cardRect.width,
                    height: cardRect.height,
                });
                return;
            }
        }

        setHighlightStyle((prev) => ({
            ...prev,
            opacity: 0,
            transform: prev.transform?.toString().replace("scale(1)", "scale(0.98)") || "scale(0.98)",
        }));
    }, []);

    const handleMouseLeave = useCallback(() => {
        setHighlightStyle((prev) => ({
            ...prev,
            opacity: 0,
            transform: prev.transform?.toString().replace("scale(1)", "scale(0.95)") || "scale(0.95)",
        }));
    }, []);

    useEffect(() => {
        const handleResize = () => setHighlightStyle({ opacity: 0 });
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return (
        <div id="services" className="text-black flex flex-col items-center justify-center px-4 py-16 mb-10 md:mb-20 lg:mb-32">
            <div className="max-w-6xl w-full text-center px-6 md:px-12 lg:px-16 xl:px-20">
                <h2 className="text-3xl md:text-4xl font-montserrat-bold text-center lg:text-5xl mb-4 md:mb-6 lg:mb-8 uppercase">
                    {t("title")}
                </h2>
                <p className="text-black text-center font-montserrat text-base md:text-lg lg:text-xl xl:text-lg leading-[150%] mb-8 md:mb-12">
                    {t("description")}
                </p>

                <div
                    ref={containerRef}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    className="relative grid grid-cols-1 md:grid-cols-3 gap-0 bg-white rounded-[24px] overflow-hidden"
                >
                    {/* Cuadro flotante */}
                    <div
                        className="absolute z-0 bg-white border border-black rounded-[24px] pointer-events-none"
                        style={{
                            ...highlightStyle,
                            transition: "all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                            transformOrigin: "center center",
                        }}
                    />

                    {/* Tarjetas dinámicas */}
                    {servicesData.map((section, index) => (
                        <div key={index} className="relative z-10 card p-6 md:p-8 flex flex-col">
                            <div className="border-b border-black pb-4 mb-6 min-h-[4rem] md:min-h-[4.5rem] flex items-center justify-center">
                                <h3 className="font-montserrat-bold text-lg md:text-xl lg:text-2xl text-center text-gray-900 leading-tight">
                                    {section.title}
                                </h3>
                            </div>
                            <ul className="space-y-3 text-center md:text-left flex-1">
                                {section.items.map((item, i) => (
                                    <li key={i} className="flex items-start gap-3 justify-center md:justify-start">
                                        <span className="text-[#5e67af] text-base md:text-lg mt-1 flex-shrink-0">✓</span>
                                        <span className="text-gray-700 font-montserrat text-sm md:text-base leading-relaxed">
                      {item}
                    </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="mt-8 md:mt-12 flex justify-center">
                    <a href="mailto:ricardo.sierra@lyratech.com.mx" target="_blank" rel="noopener noreferrer">
                        <button
                            className="bg-[#5e67af] text-white w-[200px] md:w-[228px] h-14 md:h-16 rounded-[20px] shadow-[0px_6px_6px_0px_rgba(0,0,0,0.3)] hover:bg-[#525ba3] transition-colors duration-300 text-center font-montserrat-bold text-base md:text-lg leading-[150%] flex items-center justify-center">
                            {t("button")}
                        </button>
                    </a>
                </div>
            </div>
        </div>
    );
}

export default Services;
