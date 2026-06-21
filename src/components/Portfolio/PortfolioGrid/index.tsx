"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { HiOutlineArrowRight } from "react-icons/hi";

import Finnova from "@/assets/images/Home/Portafolio/Finnova.png";
import RavePass from "@/assets/images/Home/Portafolio/RavePass.svg";
import Indeleble from "@/assets/images/Home/Portafolio/Indeleble.png";
import PulsoVital from "@/assets/images/Home/Portafolio/PulsoVital.png";
import CSV from "@/assets/images/Home/Portafolio/CSV.png";
import Verderaiz from "@/assets/images/Home/Portafolio/Verderaiz.png";
import NuovaVita from "@/assets/images/Home/Portafolio/NuovaVita.png";
import MindScope from "@/assets/images/Home/Portafolio/MindScope.svg";
import OnceUponATime from "@/assets/images/Home/Portafolio/OnceUponATime.png";

type Category = "all" | "web" | "mobile" | "ai";

export default function PortfolioGrid() {
    const t = useTranslations("portafolioHome");
    const tGrid = useTranslations("portfolioGrid");
    const [activeFilter, setActiveFilter] = useState<Category>("all");

    const projects: {
        name: string;
        img: string | { src: string };
        description: string;
        link: string;
        tech: string[];
        categories: Category[];
    }[] = [
        {
            name: "Finnova",
            img: Finnova,
            description: t("finnova"),
            link: "https://finnova.com.mx/",
            tech: ["React Native", "Node.js", "PostgreSQL", "LangChain"],
            categories: ["mobile", "ai"],
        },
        {
            name: "RavePass",
            img: RavePass,
            description: t("ravepass"),
            link: "https://www.ravepass.com.mx/",
            tech: ["React", "Supabase"],
            categories: ["web"],
        },
        {
            name: "Indeleble",
            img: Indeleble,
            description: t("indeleble"),
            link: "https://indeleble.com.mx/",
            tech: ["Next.js"],
            categories: ["web"],
        },
        {
            name: "Pulso Vital",
            img: PulsoVital,
            description: t("pulsoVital"),
            link: "https://pulsovital.com.mx/",
            tech: ["Next.js", "Node.js", "PostgreSQL"],
            categories: ["web", "ai"],
        },
        {
            name: "CSV Logistics",
            img: CSV,
            description: t("csv"),
            link: "https://www.csvlogistics.com.mx/",
            tech: ["Next.js"],
            categories: ["web"],
        },
        {
            name: "Verderaiz",
            img: Verderaiz,
            description: t("verderaiz"),
            link: "https://verderaiz.com.mx/",
            tech: ["Next.js", "PHP", "WordPress", "MySQL"],
            categories: ["web"],
        },
        {
            name: "Nuova Vita",
            img: NuovaVita,
            description: t("nuovaVita"),
            link: "https://nuova-vita.netlify.app/",
            tech: ["Next.js"],
            categories: ["web"],
        },
        {
            name: "MindScope",
            img: MindScope,
            description: t("mindScope"),
            link: "https://mindscope-landing.netlify.app/",
            tech: ["Next.js", "Node.js", "PostgreSQL"],
            categories: ["web"],
        },
        {
            name: "Once Upon a Time",
            img: OnceUponATime,
            description: t("onceUponATime"),
            link: "https://once-upona-time.netlify.app/",
            tech: ["Next.js"],
            categories: ["web"],
        },
    ];

    const filters: { key: Category; label: string }[] = [
        { key: "all", label: tGrid("filterAll") },
        { key: "web", label: tGrid("filterWeb") },
        { key: "mobile", label: tGrid("filterMobile") },
        { key: "ai", label: tGrid("filterAI") },
    ];

    const countFor = (cat: Category) =>
        cat === "all"
            ? projects.length
            : projects.filter((p) => p.categories.includes(cat)).length;

    const filtered =
        activeFilter === "all"
            ? projects
            : projects.filter((p) => p.categories.includes(activeFilter));

    return (
        <section id="portfolio" className="px-6 py-12 md:py-16">
            <div className="max-w-6xl mx-auto">
                {/* Filter tabs */}
                <div className="flex flex-wrap gap-3 mb-10 justify-center">
                    {filters.map((f) => (
                        <button
                            key={f.key}
                            onClick={() => setActiveFilter(f.key)}
                            className={`px-5 py-2 rounded-full font-montserrat text-sm transition-all duration-200 ${
                                activeFilter === f.key
                                    ? "bg-lyratech-purple text-white shadow-md"
                                    : "bg-white border border-gray-200 text-gray-600 hover:border-lyratech-purple hover:text-lyratech-purple"
                            }`}
                        >
                            {f.label} ({countFor(f.key)})
                        </button>
                    ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                        {filtered.map((project) => (
                            <motion.div
                                key={project.name}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.25 }}
                                className="bg-white rounded-[24px] border border-gray-200 shadow-sm overflow-hidden flex flex-col"
                            >
                                {/* Image */}
                                <div className="h-44 w-full bg-gray-50 flex items-center justify-center p-8">
                                    <div className="relative w-full h-full">
                                        <Image
                                            src={project.img as string}
                                            alt={project.name}
                                            fill
                                            className="object-contain"
                                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                        />
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-6 flex flex-col flex-1">
                                    <h3 className="font-montserrat-bold text-gray-900 text-lg mb-2">
                                        {project.name}
                                    </h3>
                                    <p className="font-montserrat text-gray-500 text-sm leading-relaxed flex-1 mb-4">
                                        {project.description}
                                    </p>

                                    {/* Tech tags */}
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {project.tech.map((tag) => (
                                            <span
                                                key={tag}
                                                className="font-montserrat text-xs text-gray-600 border border-gray-200 rounded-full px-3 py-1"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Arrow link */}
                                    <div className="flex justify-end">
                                        <a
                                            href={project.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label={tGrid("visitProject")}
                                            className="bg-lyratech-purple/10 text-lyratech-purple w-11 h-11 rounded-full flex items-center justify-center hover:bg-lyratech-purple hover:text-white transition-colors duration-200"
                                        >
                                            <HiOutlineArrowRight className="text-lg" />
                                        </a>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </section>
    );
}
