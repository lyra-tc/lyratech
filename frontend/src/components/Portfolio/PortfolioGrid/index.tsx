"use client";

import React, { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import ProjectCard from "@/components/Portfolio/ProjectCard";
import ProjectLinkButtons from "@/components/Portfolio/ProjectLinkButtons";
import type { PortfolioProject } from "@/lib/api";
import type { PortfolioCategory } from "@/lib/portfolioConstants";
import { pickDescription } from "@/lib/portfolio";

type Filter = "all" | PortfolioCategory;

export default function PortfolioGrid({ projects }: { projects: PortfolioProject[] }) {
    const tGrid = useTranslations("portfolioGrid");
    const locale = useLocale();
    const [activeFilter, setActiveFilter] = useState<Filter>("all");

    const linkLabels = {
        visit: tGrid("visitProject"),
        playStore: tGrid("playStore"),
        appStore: tGrid("appStore"),
        watchVideo: tGrid("watchVideo"),
        closeVideo: tGrid("closeVideo"),
    };

    const filters: { key: Filter; label: string }[] = [
        { key: "all", label: tGrid("filterAll") },
        { key: "web", label: tGrid("filterWeb") },
        { key: "mobile", label: tGrid("filterMobile") },
        { key: "ai", label: tGrid("filterAI") },
    ];

    const countFor = (filter: Filter) =>
        filter === "all"
            ? projects.length
            : projects.filter((p) => p.categories.includes(filter)).length;

    const filtered =
        activeFilter === "all"
            ? projects
            : projects.filter((p) => p.categories.includes(activeFilter));

    if (projects.length === 0) {
        return (
            <section id="portfolio" className="px-6 py-12 md:py-16">
                <h2 className="sr-only">{tGrid("sectionTitle")}</h2>
                <p className="text-center font-montserrat text-gray-500">{tGrid("empty")}</p>
            </section>
        );
    }

    return (
        <section id="portfolio" className="px-6 py-12 md:py-16">
            <div className="max-w-6xl mx-auto">
                <h2 className="sr-only">{tGrid("sectionTitle")}</h2>

                {/* Filter tabs */}
                <div className="flex flex-wrap gap-3 mb-10 justify-center">
                    {filters.map((f) => (
                        <button
                            key={f.key}
                            aria-pressed={activeFilter === f.key}
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
                {filtered.length === 0 ? (
                    <p className="text-center font-montserrat text-gray-500">{tGrid("empty")}</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence mode="popLayout">
                            {filtered.map((project) => (
                                <motion.div
                                    key={project.uuid}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.25 }}
                                >
                                    <ProjectCard
                                        name={project.name}
                                        description={pickDescription(project, locale)}
                                        technologies={project.technologies}
                                        logoUrl={project.logo_url}
                                        actions={
                                            <ProjectLinkButtons project={project} labels={linkLabels} variant="icon" />
                                        }
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </section>
    );
}
