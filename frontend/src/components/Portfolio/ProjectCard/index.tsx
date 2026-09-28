import React from "react";
import Image from "next/image";
import { isUnoptimizedImage } from "@/lib/portfolio";

interface ProjectCardProps {
    name: string;
    description: string;
    technologies: string[];
    /** Empty while the dashboard preview has no logo yet. */
    logoUrl: string;
    actions: React.ReactNode;
}

export default function ProjectCard({ name, description, technologies, logoUrl, actions }: ProjectCardProps) {
    return (
        <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
            {/* Image */}
            <div className="h-44 w-full bg-gray-50 flex items-center justify-center p-8">
                <div className="relative w-full h-full">
                    {logoUrl ? (
                        <Image
                            src={logoUrl}
                            alt={name}
                            fill
                            className="object-contain"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            unoptimized={isUnoptimizedImage(logoUrl)}
                        />
                    ) : (
                        <div className="w-full h-full rounded-xl border-2 border-dashed border-gray-200" />
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col flex-1">
                <h3 className="font-montserrat-bold text-gray-900 text-lg mb-2 break-words">{name}</h3>
                <p className="font-montserrat text-gray-500 text-sm leading-relaxed flex-1 mb-4 break-words">
                    {description}
                </p>

                {/* Tech tags */}
                {technologies.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {technologies.map((tag, i) => (
                            <span
                                key={`${tag}-${i}`}
                                className="font-montserrat text-xs text-gray-600 border border-gray-200 rounded-full px-3 py-1"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {actions}
            </div>
        </div>
    );
}
