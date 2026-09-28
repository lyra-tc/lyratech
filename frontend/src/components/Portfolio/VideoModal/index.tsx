"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IoIosCloseCircleOutline } from "react-icons/io";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useScrollLock } from "@/hooks/useScrollLock";

interface VideoModalProps {
    src: string;
    title: string;
    closeLabel: string;
    onClose: () => void;
}

export default function VideoModal({ src, title, closeLabel, onClose }: VideoModalProps) {
    useEscapeKey(onClose);
    useScrollLock();

    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const previouslyFocusedRef = useRef<Element | null>(null);

    // Portal to <body>: the Home carousel translates its track, and a transformed
    // ancestor would turn `position: fixed` into "fixed to the slide".
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    // Runs once the portal has actually rendered (mounted flips true on the next
    // commit) — the close button ref is null before then. Restores focus to
    // whatever had it before the modal opened, unless that element is gone.
    useEffect(() => {
        if (!mounted) return;
        previouslyFocusedRef.current = document.activeElement;
        closeButtonRef.current?.focus();
        return () => {
            const previous = previouslyFocusedRef.current;
            if (previous instanceof HTMLElement && document.body.contains(previous)) {
                previous.focus();
            }
        };
    }, [mounted]);

    // Simple two-stop focus trap: Tab/Shift+Tab only ever cycles between the
    // close button and the video (its native controls handle focus internally).
    function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
        if (event.key !== "Tab") return;
        const first = closeButtonRef.current;
        const last = videoRef.current;
        if (!first || !last) return;
        if (event.shiftKey) {
            if (document.activeElement === first) {
                event.preventDefault();
                last.focus();
            }
        } else if (document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    if (!mounted) return null;

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            // React portals still bubble to React ancestors — keep the carousel's drag handlers out.
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
        >
            <button
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                onClick={onClose}
                className="absolute inset-0 bg-black/80 cursor-default"
            />
            <div className="relative w-full max-w-4xl">
                <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={onClose}
                    aria-label={closeLabel}
                    className="absolute top-2 right-2 z-10 bg-black/40 rounded-full text-white hover:text-gray-300"
                >
                    <IoIosCloseCircleOutline size={40} />
                </button>
                <video
                    ref={videoRef}
                    src={src}
                    controls
                    autoPlay
                    playsInline
                    preload="metadata"
                    className="w-full max-h-[80vh] rounded-2xl bg-black"
                />
            </div>
        </div>,
        document.body
    );
}
