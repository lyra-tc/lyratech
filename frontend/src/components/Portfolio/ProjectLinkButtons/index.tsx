"use client";

import React, { useState } from "react";
import { FaApple, FaGooglePlay, FaPlay } from "react-icons/fa";
import { HiOutlineArrowRight } from "react-icons/hi";
import VideoModal from "@/components/Portfolio/VideoModal";
import type { PortfolioProject } from "@/lib/api";

export type ProjectLinks = Pick<
    PortfolioProject,
    "name" | "link_type" | "website_url" | "play_store_url" | "app_store_url" | "video_url"
>;

export interface ProjectLinkLabels {
    visit: string;
    playStore: string;
    appStore: string;
    watchVideo: string;
    closeVideo: string;
}

interface ProjectLinkButtonsProps {
    project: ProjectLinks;
    labels: ProjectLinkLabels;
    /** "icon": round buttons of the /portfolio grid. "pill": outlined buttons of the Home carousel overlay. */
    variant: "icon" | "pill";
}

const ICON_CLASS =
    "bg-lyratech-purple/10 text-lyratech-purple w-11 h-11 rounded-full flex items-center justify-center hover:bg-lyratech-purple hover:text-white transition-colors duration-200";
const PILL_CLASS =
    "flex items-center gap-2 border border-white rounded-[15px] lg:rounded-[20px] px-6 py-2 font-montserrat-bold transition-transform duration-500 ease-in-out hover:scale-75";

export default function ProjectLinkButtons({ project, labels, variant }: ProjectLinkButtonsProps) {
    const [videoOpen, setVideoOpen] = useState(false);
    const isIcon = variant === "icon";
    const className = isIcon ? ICON_CLASS : PILL_CLASS;

    const links: { href: string; label: string; icon: React.ReactNode }[] = [];
    if (project.link_type === "website" && project.website_url) {
        links.push({ href: project.website_url, label: labels.visit, icon: <HiOutlineArrowRight className="text-lg" /> });
    }
    if (project.link_type === "store") {
        if (project.play_store_url) {
            links.push({ href: project.play_store_url, label: labels.playStore, icon: <FaGooglePlay className="text-lg" /> });
        }
        if (project.app_store_url) {
            links.push({ href: project.app_store_url, label: labels.appStore, icon: <FaApple className="text-lg" /> });
        }
    }

    return (
        <div className={`flex gap-2 ${isIcon ? "justify-end" : "justify-center flex-wrap"}`}>
            {links.map((link) => (
                <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${link.label} – ${project.name}`}
                    title={isIcon ? link.label : undefined}
                    className={className}
                >
                    {link.icon}
                    {!isIcon && <span>{link.label}</span>}
                </a>
            ))}
            {project.link_type === "video" && project.video_url && (
                <>
                    <button
                        type="button"
                        onClick={() => setVideoOpen(true)}
                        aria-label={`${labels.watchVideo} – ${project.name}`}
                        title={isIcon ? labels.watchVideo : undefined}
                        className={className}
                    >
                        <FaPlay className={isIcon ? "text-sm ml-0.5" : ""} />
                        {!isIcon && <span>{labels.watchVideo}</span>}
                    </button>
                    {videoOpen && (
                        <VideoModal
                            src={project.video_url}
                            title={project.name}
                            closeLabel={labels.closeVideo}
                            onClose={() => setVideoOpen(false)}
                        />
                    )}
                </>
            )}
        </div>
    );
}
