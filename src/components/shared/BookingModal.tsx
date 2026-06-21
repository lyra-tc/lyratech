"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiOutlineX } from "react-icons/hi";

const BOOKING_URL = process.env.NEXT_PUBLIC_BOOKING_URL ?? "";

interface BookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
}

export default function BookingModal({ isOpen, onClose, title = "Agendar llamada" }: BookingModalProps) {
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            document.body.style.overflow = "hidden";
            window.addEventListener("keydown", handleKey);
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", handleKey);
        };
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="relative w-full max-w-2xl bg-white rounded-[24px] overflow-hidden shadow-2xl flex flex-col"
                        style={{ height: "min(85vh, 720px)" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                            <p className="font-montserrat-bold text-gray-900 text-base">{title}</p>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-700 transition-colors p-1"
                                aria-label="Cerrar"
                            >
                                <HiOutlineX className="text-xl" />
                            </button>
                        </div>

                        {/* iframe */}
                        <iframe
                            src={BOOKING_URL}
                            title={title}
                            className="w-full flex-1 border-0"
                            allow="fullscreen"
                        />

                        {/* Fallback si el iframe es bloqueado */}
                        <div className="flex-shrink-0 px-6 py-3 border-t border-gray-100 text-center">
                            <p className="font-montserrat text-xs text-gray-400">
                                ¿No carga el calendario?{" "}
                                <a
                                    href={BOOKING_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-lyratech-purple underline underline-offset-2"
                                >
                                    Ábrelo aquí
                                </a>
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
