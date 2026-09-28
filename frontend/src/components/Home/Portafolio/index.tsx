"use client";

import React, { useState, useEffect, useRef } from "react";
import { FaArrowRight, FaRegArrowAltCircleLeft, FaRegArrowAltCircleRight } from "react-icons/fa";
import { CiCirclePlus } from "react-icons/ci";
import { IoIosCloseCircleOutline } from "react-icons/io";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import ProjectLinkButtons from "@/components/Portfolio/ProjectLinkButtons";
import type { PortfolioProject } from "@/lib/api";
import { isUnoptimizedImage, pickDescription } from "@/lib/portfolio";

function Portafolio({ projects }: { projects: PortfolioProject[] }) {
    const t = useTranslations("portafolioHome");
    const tGrid = useTranslations("portfolioGrid");
    const tNavbar = useTranslations("navbar");
    const locale = useLocale();

    const linkLabels = {
        visit: t("viewMore"),
        playStore: tGrid("playStore"),
        appStore: tGrid("appStore"),
        watchVideo: tGrid("watchVideo"),
        closeVideo: tGrid("closeVideo"),
    };

    const [currentIndex, setCurrentIndex] = useState(0);
    const [visibleSlides, setVisibleSlides] = useState(1);
    const [isDragging, setIsDragging] = useState(false);
    const [dragTranslate, setDragTranslate] = useState(0);
    const [expandedSlideId, setExpandedSlideId] = useState<number | null>(null);
    const [animatingSlideId, setAnimatingSlideId] = useState<number | null>(null);

    const sliderRef = useRef<HTMLDivElement>(null);
    const slideRef = useRef<HTMLDivElement>(null);
    const [slideWidth, setSlideWidth] = useState(0);

    const startPos = useRef(0);
    const totalSlides = projects.length;

    // Ajustar visibleSlides según el tamaño de pantalla
    const updateVisibleSlides = () => {
        const width = window.innerWidth;
        const slidesVisible = width >= 1280 ? 4 : width >= 1024 ? 3 : width >= 768 ? 2 : 1;
        setVisibleSlides(slidesVisible);

        const maxIndex = Math.max(totalSlides - slidesVisible, 0);
        setCurrentIndex((prev) => Math.min(prev, maxIndex));
    };

    useEffect(() => {
        updateVisibleSlides();
        window.addEventListener("resize", updateVisibleSlides);
        return () => window.removeEventListener("resize", updateVisibleSlides);
    });

    useEffect(() => {
        if (slideRef.current) {
            setSlideWidth(slideRef.current.getBoundingClientRect().width);
        }
    }, [visibleSlides]);

    const maxIndex = Math.max(totalSlides - visibleSlides, 0);

    const handlePrev = () => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
    const handleNext = () => setCurrentIndex((prev) => (prev < maxIndex ? prev + 1 : 0));

    // --- Gestos Touch/Mouse ---
    const handleTouchStart = (e: React.TouchEvent) => {
        setIsDragging(true);
        startPos.current = e.touches[0].clientX;
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        startPos.current = e.clientX;
        e.preventDefault();
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        setDragTranslate(e.touches[0].clientX - startPos.current);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setDragTranslate(e.clientX - startPos.current);
    };

    const endDrag = () => {
        setIsDragging(false);
        if (dragTranslate < -50 && currentIndex < maxIndex) handleNext();
        else if (dragTranslate > 50 && currentIndex > 0) handlePrev();
        setDragTranslate(0);
    };

    // Animación + overlay
    const handlePlusClick = (id: number) => {
        setAnimatingSlideId(id);
    };
    const handleAnimationEnd = (id: number) => {
        if (animatingSlideId === id) {
            setAnimatingSlideId(null);
            setExpandedSlideId(id);
        }
    };
    const handleClose = () => setExpandedSlideId(null);

    return (
        <div id="portfolio" className="font-montserrat mb-32 md:mb-40 lg:mb-52">
            {/* Title + Description */}
            <div className="text-center px-10 md:px-16 lg:px-20 xl:px-28">
                <h2 className="uppercase font-extrabold text-2xl md:text-3xl lg:text-4xl xl:text-5xl">
                    {t("title")}
                </h2>
                <p className="mt-5 md:text-lg md:mt-8 lg:text-xl">
                    {t("description")}
                </p>
            </div>

            {/* Slider (hidden when the API returned nothing) */}
            {totalSlides > 0 && (
                <div className="relative overflow-hidden my-28 mx-6 md:mx-16 lg:mx-20 xl:mx-28">
                    <div
                        ref={sliderRef}
                        className={`flex ${!isDragging ? "transition-transform duration-300 ease-in-out" : ""}`}
                        style={{ transform: `translateX(${-currentIndex * slideWidth + dragTranslate}px)` }}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={endDrag}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={endDrag}
                        onMouseLeave={endDrag}
                    >
                        {projects.map((project, index) => {
                            const isExpanded = expandedSlideId === index;
                            return (
                                <div
                                    key={project.uuid}
                                    className="flex-shrink-0 flex flex-col items-center justify-center px-2"
                                    style={{ flex: `0 0 calc(100% / ${visibleSlides})` }}
                                    ref={index === 0 ? slideRef : null}
                                >
                                    <div className="relative rounded-[30px] h-80 border border-black w-full overflow-hidden flex flex-col justify-center">
                                        {/* Botón más con animación */}
                                        {!isExpanded && (
                                            <div className="pl-6 pt-6">
                                                <button
                                                    onClick={() => handlePlusClick(index)}
                                                    onTransitionEnd={() => handleAnimationEnd(index)}
                                                    className={`transform transition-transform duration-500 ease-in-out ${
                                                        animatingSlideId === index ? "rotate-[360deg] scale-125" : ""
                                                    }`}
                                                >
                                                    <CiCirclePlus className="text-dark-blue" size={45} />
                                                </button>
                                            </div>
                                        )}

                                        {/* Imagen */}
                                        {!isExpanded && (
                                            <div className="flex items-center justify-center py-10 px-4">
                                                <div className="relative h-[70px] w-[180px]">
                                                    <Image
                                                        alt={project.name}
                                                        src={project.logo_url}
                                                        fill
                                                        className="object-contain"
                                                        sizes="180px"
                                                        unoptimized={isUnoptimizedImage(project.logo_url)}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Título */}
                                        {!isExpanded && (
                                            <p className="pb-6 text-center text-xl">{project.name}</p>
                                        )}

                                        {/* Overlay expandido */}
                                        {isExpanded && (
                                            <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col justify-between text-white p-4">
                                                <button
                                                    onClick={handleClose}
                                                    className="absolute top-6 right-6 hover:text-gray-300"
                                                >
                                                    <IoIosCloseCircleOutline size={40} />
                                                </button>
                                                <div className="mt-28 text-center px-2">{pickDescription(project, locale)}</div>
                                                <div className="mb-10">
                                                    <ProjectLinkButtons project={project} labels={linkLabels} variant="pill" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Botones (ocultos si todos los proyectos caben en una sola vista) */}
                    {maxIndex > 0 && (
                        <div className="flex justify-center items-center mt-10 gap-4 mb-1">
                            <button onClick={handlePrev} className="text-dark-blue hover:scale-125 transition-transform">
                                <FaRegArrowAltCircleLeft size={30} />
                            </button>
                            <button onClick={handleNext} className="text-dark-blue hover:scale-125 transition-transform">
                                <FaRegArrowAltCircleRight size={30}/>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Call to Action */}
            <div
                className="bg-lyratech-light-purple flex flex-col justify-center items-center py-10 mx-6 px-10 rounded-[30px] md:mx-16 md:px-16 md:py-16 lg:py-10 lg:px-10 lg:mx-20 xl:mx-28">
                <h2 className="text-center font-bold md:text-2xl lg:text-3xl xl:text-4xl">
                    {t("callToActionTitle")}
                </h2>
                <p className="text-center my-6 md:text-lg lg:text-xl">
                    {t("callToActionText")}
                </p>
                <Link href={`${tNavbar("contactLink")}#contact-form`}>
                    <button
                        className="text-sm md:text-lg rounded-[15px] md:rounded-[20px] text-white px-8 py-3 md:px-12 bg-lyratech-purple font-montserrat-bold transition-transform duration-500 ease-in-out hover:scale-75">
                        <div className="flex flex-row justify-center items-center gap-3">
                            <p>{t("callToActionButton")}</p>
                            <FaArrowRight/>
                        </div>
                    </button>
                </Link>
            </div>
        </div>
    );
}

export default Portafolio;
