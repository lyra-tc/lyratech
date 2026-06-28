'use client';
import React, { useState } from 'react';
import LocaleSwitcher from "@/components/ButtonLanguage/LocaleSwitcher";
import { useLocale } from "use-intl";
import { HiLanguage } from "react-icons/hi2";

function ButtonLanguage() {
    const [showModal, setShowModal] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const locale = useLocale();

    const toggleModal = () => {
        setIsAnimating(true);
    };

    const handleTransitionEnd = () => {
        setIsAnimating(false);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
    };

    return (
        <div className="fixed bottom-5 right-5 z-50">
            <div
                onClick={toggleModal}
                onTransitionEnd={handleTransitionEnd}
                className={`rounded-full p-[2px] bg-gradient-to-br from-lyratech-purple via-[#7b88e8] to-lyratech-blue shadow-[0_0_15px_#5f66ae] transition-transform duration-500 ease-in-out ${
                    isAnimating ? "rotate-[360deg] scale-125" : ""
                }`}
            >
                <div className="bg-black rounded-full p-2 flex items-center justify-center">
                    <HiLanguage className="text-white" size={35} />
                </div>
            </div>

            {/* Fondo oscuro para cerrar el modal */}
            {showModal && (
                <div
                    onClick={closeModal}
                    className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                />
            )}

            {/* Selector de idioma */}
            {showModal && (
                <LocaleSwitcher
                    closeModalAction={closeModal}
                    currentLocale={locale}
                />
            )}
        </div>
    );
}

export default ButtonLanguage;
