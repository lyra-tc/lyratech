"use client";

import React, { useState, useEffect, useRef } from "react";
import { FaArrowRight, FaRegArrowAltCircleLeft, FaRegArrowAltCircleRight } from "react-icons/fa";
import { CiCirclePlus } from "react-icons/ci";
import { IoIosCloseCircleOutline } from "react-icons/io";
import Image from "next/image";
import {useTranslations} from "next-intl";

import Avalia from "@/assets/images/Home/Portafolio/Avalia.png";
import MindScope from "@/assets/images/Home/Portafolio/MindScope.svg";
import NuovaVita from "@/assets/images/Home/Portafolio/NuovaVita.png";
import PlenusHopeMun from "@/assets/images/Home/Portafolio/PlenusHopeMun.png";
import PulsoVital from "@/assets/images/Home/Portafolio/PulsoVital.png";
import Verderaiz from "@/assets/images/Home/Portafolio/Verderaiz.png";


function Portafolio() {
    const t = useTranslations("portafolioHome");

    const projects = [
        { name: "Avalia Dental Group", img: Avalia, content: t("avalia"), link: "https://avaliadentalgroup.com/" },
        { name: "MindScope", img: MindScope, content: t("mindScope"), link: "https://mindscope-landing.netlify.app/" },
        { name: "Nuova Vita", img: NuovaVita, content: t("nuovaVita"), link: "https://nuova-vita.netlify.app/" },
        { name: "Plenus HopeMun", img: PlenusHopeMun, content: t("plenusHopeMun"), link: "https://plenus.edu.mx/hopemun/" },
        { name: "Pulso Vital", img: PulsoVital, content: t("pulsoVital"), link: "https://pulsovital.com.mx/" },
        { name: "Verderaiz", img: Verderaiz, content: t("verderaiz"), link: "https://verderaiz.com.mx/" },
    ];

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
    }, []);

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
        <div className="font-montserrat mb-32 md:mb-40 lg:mb-52">
            {/* Title + Description */}
            <div className="text-center px-10 md:px-16 lg:px-20 xl:px-28">
                <h1 className="uppercase font-extrabold text-2xl md:text-3xl lg:text-4xl xl:text-5xl">
                    {t("title")}
                </h1>
                <p className="mt-5 md:text-lg md:mt-8 lg:text-xl">
                    {t("description")}
                </p>
            </div>

            {/* Slider */}
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
                                key={index}
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
                                    <div className="flex items-center justify-center py-10 px-4">
                                        <Image alt={project.name} src={project.img} height={100} />
                                    </div>

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
                                            <div className="mt-28 text-center px-2">{project.content}</div>
                                            <div className="flex justify-center mb-10">
                                                <a href={project.link} target="_blank" rel="noopener noreferrer">
                                                    <button className="border border-white rounded-[20px] px-4 py-2 transform hover:scale-125 transition-transform duration-300">
                                                        {t("viewMore")}
                                                    </button>
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Botones */}
                <div className="flex justify-center items-center mt-10 gap-4 mb-1">
                    <button onClick={handlePrev} className="text-dark-blue hover:scale-125 transition-transform">
                        <FaRegArrowAltCircleLeft size={30} />
                    </button>
                    <button onClick={handleNext} className="text-dark-blue hover:scale-125 transition-transform">
                        <FaRegArrowAltCircleRight size={30}/>
                    </button>
                </div>
            </div>

            {/* Call to Action */}
            <div
                className="bg-lyratech-light-purple flex flex-col justify-center items-center py-10 mx-6 px-10 rounded-[30px] md:mx-16 md:px-16 md:py-16 lg:py-10 lg:px-10 lg:mx-20 xl:mx-28">
                <h2 className="text-center font-bold md:text-2xl lg:text-3xl xl:text-4xl">
                    {t("callToActionTitle")}
                </h2>
                <p className="text-center my-6 md:text-lg lg:text-xl">
                    {t("callToActionText")}
                </p>
                <button className="text-sm md:text-lg rounded-[12px] text-white px-3 py-3 md:px-12 bg-gradient-to-tr from-button-dark-purple to-button-light-purple shadow-button transition-transform duration-500 ease-in-out hover:scale-75">
                    <div className="flex flex-row justify-center items-center gap-3">
                        <p>{t("callToActionButton")}</p>
                        <FaArrowRight />
                    </div>
                </button>
            </div>
        </div>
    );
}

export default Portafolio;
