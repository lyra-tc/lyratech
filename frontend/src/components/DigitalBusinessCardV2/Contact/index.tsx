"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FaWhatsapp } from "react-icons/fa";
import { IoMailOutline, IoQrCodeOutline, IoClose } from "react-icons/io5";
import { GrLanguage } from "react-icons/gr";
import QRCode from "react-qr-code";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";

interface ContactProps {
    phone: string;
    email: string;
    qrEndpoint: string;
}

const ease = [0.25, 0.46, 0.45, 0.94] as const;

function fadeUp(delay: number) {
    return {
        initial: { opacity: 0, y: 18 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.45, delay, ease },
    };
}

const glassBtn = "flex items-center justify-between w-full py-2.5 md:py-3 px-4 md:px-5 rounded-xl text-sm md:text-base font-montserrat-bold border border-white/10 transition-all duration-300 active:scale-95";

function Contact({ phone, email, qrEndpoint }: ContactProps) {
    const t = useTranslations("contactCard");
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        document.body.style.overflow = showModal ? "hidden" : "auto";
        return () => { document.body.style.overflow = "auto"; };
    }, [showModal]);

    const toggleModal = () => setShowModal((prev) => !prev);

    return (
        <div className="flex justify-center items-center mt-1 md:mt-4 mb-4 md:mb-12 lg:mb-16 px-6">
            {/* Glass card */}
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5, ease }}
                className="w-full max-w-sm md:max-w-md flex flex-col gap-2 md:gap-3 rounded-2xl p-4 md:p-6"
                style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backdropFilter: "blur(12px)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
                }}
            >
                {/* WhatsApp */}
                <motion.a
                    {...fadeUp(0.6)}
                    href={`https://wa.me/${phone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${glassBtn} text-white/80 hover:border-green-400/60 hover:text-green-300 hover:shadow-[0_0_16px_rgba(74,222,128,0.2)]`}
                    style={{ background: "rgba(255,255,255,0.05)" }}
                >
                    {t("whatsApp")}
                    <FaWhatsapp size={20} />
                </motion.a>

                {/* Email */}
                <motion.a
                    {...fadeUp(0.7)}
                    href={`mailto:${email}`}
                    className={`${glassBtn} text-white/80 hover:border-[#5f66ae]/80 hover:text-[#c6c9e5] hover:shadow-[0_0_16px_rgba(95,102,174,0.25)]`}
                    style={{ background: "rgba(255,255,255,0.05)" }}
                >
                    {t("mail")}
                    <IoMailOutline size={20} />
                </motion.a>

                {/* QR */}
                <motion.button
                    {...fadeUp(0.8)}
                    onClick={toggleModal}
                    className={`${glassBtn} text-white/80 hover:border-[#5f66ae]/80 hover:text-[#c6c9e5] hover:shadow-[0_0_16px_rgba(95,102,174,0.25)]`}
                    style={{ background: "rgba(255,255,255,0.05)" }}
                >
                    {t("qrCode")}
                    <IoQrCodeOutline size={20} />
                </motion.button>

                {/* Separador */}
                <div className="h-px w-full my-1 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }} />

                {/* Website */}
                <motion.div {...fadeUp(0.9)}>
                    <Link
                        href="/"
                        className={`${glassBtn} text-white/50 border-white/5 hover:border-white/20 hover:text-white/80`}
                        style={{ background: "rgba(255,255,255,0.02)" }}
                    >
                        {t("website")}
                        <GrLanguage size={20} />
                    </Link>
                </motion.div>
            </motion.div>

            {/* Modal QR */}
            {showModal && (
                <div
                    className="fixed inset-0 flex items-center justify-center z-50"
                    style={{ background: "rgba(0,2,14,0.75)", backdropFilter: "blur(6px)" }}
                    onClick={toggleModal}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, ease }}
                        className="flex flex-col items-center p-8 rounded-2xl w-[90%] max-w-xs"
                        style={{
                            background: "rgba(27,29,50,0.95)",
                            border: "1px solid rgba(95,102,174,0.3)",
                            boxShadow: "0 0 40px rgba(95,102,174,0.2)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-base font-zendots text-white mb-6 text-center">
                            {t("shareCard")}
                        </h2>

                        <div className="p-4 rounded-xl bg-white">
                            <QRCode value={`https://lyratech.netlify.app/${qrEndpoint}`} size={160} />
                        </div>

                        <p className="text-white/50 text-xs mt-5 text-center font-montserrat">
                            {t("scanCode")}
                        </p>

                        <button
                            className="mt-6 flex items-center gap-2 px-6 py-2 rounded-full text-sm font-montserrat-bold text-white/70 border border-white/10 hover:border-[#5f66ae]/60 hover:text-white transition-all duration-300 active:scale-95"
                            style={{ background: "rgba(255,255,255,0.05)" }}
                            onClick={toggleModal}
                        >
                            <IoClose size={16} />
                            {t("close")}
                        </button>
                    </motion.div>
                </div>
            )}
        </div>
    );
}

export default Contact;
