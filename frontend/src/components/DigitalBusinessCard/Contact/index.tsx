"use client";
import React, { useState, useEffect } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { IoMailOutline, IoQrCodeOutline } from "react-icons/io5";
import QRCode from "react-qr-code";
import {useTranslations} from "next-intl";
import { GrLanguage } from "react-icons/gr";
import {Link} from "@/navigation";

interface ContactProps {
    /** Teléfono para WhatsApp, por ejemplo: "524428804267" */
    phone: string;
    /** Correo electrónico, por ejemplo: "drearyland22021@gmail.com" */
    email: string;
    /** Endpoint para el QR, por ejemplo: "https://lyratech.netlify.app/ezzat" */
    qrEndpoint: string;
}

function Contact({ phone, email, qrEndpoint }: ContactProps) {
    const t = useTranslations("contactCard");
    // Estado para controlar si se muestra el modal
    const [showModal, setShowModal] = useState(false);

    // Actualiza el overflow del body cuando se abre/cierra el modal
    useEffect(() => {
        if (showModal) {
            // Bloquea el scroll del fondo
            document.body.style.overflow = "hidden";
        } else {
            // Restaura el scroll
            document.body.style.overflow = "auto";
        }

        // Limpia el estilo al desmontar el componente
        return () => {
            document.body.style.overflow = "auto";
        };
    }, [showModal]);

    // Función para abrir/cerrar el modal
    const toggleModal = () => setShowModal(!showModal);

    return (
        <div className="flex justify-center items-center mt-10 mb-20">
            {/* Contenedor principal (bloque blanco redondeado) */}
            <div className="bg-white rounded-2xl shadow-lg p-6 w-[90%] max-w-md flex flex-col gap-4">

                {/* Botón de WhatsApp */}
                <a
                    href={`https://wa.me/${phone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between w-full bg-black text-white py-3 px-5 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-transform duration-200 ease-in-out active:scale-95"
                >
                    {t("whatsApp")}
                    <FaWhatsapp size={24} />
                </a>

                {/* Botón de Correo */}
                <a
                    href={`mailto:${email}`}
                    className="flex items-center justify-between w-full bg-lyratech-blue text-white py-3 px-5 rounded-lg text-sm font-semibold hover:bg-gray-400 transition-transform duration-200 ease-in-out active:scale-95"
                >
                    {t("mail")}
                    <IoMailOutline size={24} />
                </a>

                {/* Botón de Compartir Tarjeta */}
                <button
                    onClick={toggleModal}
                    className="flex items-center justify-between w-full bg-lyratech-purple text-white py-3 px-5 rounded-lg text-sm font-semibold hover:bg-purple-300 transition-transform duration-200 ease-in-out active:scale-95"
                >
                    {t("qrCode")}
                    <IoQrCodeOutline size={24} />
                </button>

                {/* Botón de página */}
                <Link
                    href="/"
                    className="flex items-center justify-between w-full bg-[#3f416e] text-white py-3 px-5 rounded-lg text-sm font-semibold hover:bg-gray-400 transition-transform duration-200 ease-in-out active:scale-95"
                >
                    {t("website")}
                    <GrLanguage size={24} />
                </Link>
            </div>

            {/* Modal (renderizado condicional) */}
            {showModal && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                    onClick={toggleModal} // Cerrar modal al hacer clic fuera
                >
                    {/* Contenedor interno del modal */}
                    <div
                        className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-sm flex flex-col items-center"
                        onClick={(e) => e.stopPropagation()} // Evitar que el clic cierre si tocas el modal
                    >
                        <h2 className="text-xl font-semibold mb-4 text-black">{t("shareCard")}</h2>
                        {/* Genera el QR apuntando a qrEndpoint */}
                        <QRCode value={`https://lyratech.netlify.app/${qrEndpoint}`} size={160} />
                        <p className="text-gray-700 text-sm mt-4 text-center">
                            {t("scanCode")}
                        </p>
                        {/* Botón para cerrar */}
                        <button
                            className="mt-6 px-4 py-2 bg-lyratech-blue text-white font-semibold rounded hover:bg-lyratech-purple transition-transform duration-200 active:scale-95"
                            onClick={toggleModal}
                        >
                            {t("close")}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Contact;
