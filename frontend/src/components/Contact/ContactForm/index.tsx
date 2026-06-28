"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { MdEmail, MdPhone } from "react-icons/md";
import { FaBuilding } from "react-icons/fa";
import { HiChevronDown, HiCalendar } from "react-icons/hi";
import BookingModal from "@/components/shared/BookingModal";
import { useTranslations } from "next-intl";

type FormState = {
    name: string;
    email: string;
    company: string;
    phone: string;
    service: string;
    message: string;
};

const inputBase = "w-full bg-gray-50 px-4 py-3 rounded-xl text-sm text-gray-700 placeholder-gray-400 outline-none transition-all duration-200";

function fieldClass(hasError: boolean) {
    return hasError
        ? `${inputBase} border-2 border-red/30 bg-[#fff8f8]`
        : `${inputBase} border border-gray-200 focus:border-lyratech-purple`;
}

export default function ContactForm() {
    const t = useTranslations("contactForm");
    const [bookingOpen, setBookingOpen] = useState(false);
    const [serviceOpen, setServiceOpen] = useState(false);
    const serviceRef = useRef<HTMLDivElement>(null);
    const [form, setForm] = useState<FormState>({
        name: "",
        email: "",
        company: "",
        phone: "",
        service: "",
        message: "",
    });
    const [errors, setErrors] = useState<Partial<Record<keyof FormState, boolean>>>({});
    const [submitted, setSubmitted] = useState(false);

    const SERVICES = [
        { value: "diagnostico", label: t("serviceOption1") },
        { value: "automatizaciones", label: t("serviceOption2") },
        { value: "precio-fijo", label: t("serviceOption3") },
        { value: "equipo-dedicado", label: t("serviceOption4") },
    ];

    const CONTACT_INFO = [
        {
            icon: <MdEmail className="text-xl" />,
            label: t("labelEmail"),
            value: "ricardo.sierra@lyratech.com.mx",
            href: "mailto:ricardo.sierra@lyratech.com.mx",
        },
        {
            icon: <MdPhone className="text-xl" />,
            label: t("labelPhone"),
            value: "+52 55 6407 5229",
            href: "tel:+525564075229",
        },
        {
            icon: <FaBuilding className="text-xl" />,
            label: t("labelOffice"),
            value: "Juriquilla, Querétaro",
            href: "https://maps.app.goo.gl/zqA8VeGWqFpUSm7M6",
        },
    ];

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (serviceRef.current && !serviceRef.current.contains(e.target as Node)) {
                setServiceOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleChange = (field: keyof FormState, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: false }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Partial<Record<keyof FormState, boolean>> = {};
        (Object.keys(form) as (keyof FormState)[]).forEach((key) => {
            if (!form[key].trim()) newErrors[key] = true;
        });
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;
        // TODO: Connect to API
        setSubmitted(true);
    };

    const selectedService = SERVICES.find((s) => s.value === form.service);

    return (
        <section className="py-16 mx-6 md:mx-16 lg:mx-20 xl:mx-28 font-montserrat" id="contact-form">
            <BookingModal
                isOpen={bookingOpen}
                onClose={() => setBookingOpen(false)}
                title={t("scheduleButton")}
            />

            <div className="flex flex-col lg:flex-row gap-12 lg:gap-10">
                {/* Left: Contact Info */}
                <div className="lg:w-5/12 flex flex-col">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4 }}
                        className="font-montserrat-bold text-2xl md:text-3xl text-gray-900 mb-8"
                    >
                        {t("infoTitle")}
                    </motion.h2>

                    <div className="flex flex-col gap-4">
                        {CONTACT_INFO.map((item, i) => {
                            const inner = (
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-lyratech-purple rounded-xl flex items-center justify-center text-white flex-shrink-0">
                                        {item.icon}
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-xs mb-0.5">{item.label}</p>
                                        <p className="text-gray-800 font-semibold text-sm md:text-base break-all">
                                            {item.value}
                                        </p>
                                    </div>
                                </div>
                            );

                            return (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4, delay: i * 0.1 }}
                                    className="p-5 bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
                                >
                                    {item.href ? (
                                        <a
                                            href={item.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:opacity-75 transition-opacity"
                                        >
                                            {inner}
                                        </a>
                                    ) : (
                                        inner
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>

                    <motion.button
                        onClick={() => setBookingOpen(true)}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: 0.35 }}
                        className="mt-6 flex items-center justify-center gap-3 bg-lyratech-purple text-white font-montserrat-bold py-4 px-6 rounded-xl hover:bg-button-dark-purple transition-colors duration-200"
                    >
                        <HiCalendar className="text-xl" />
                        {t("scheduleButton")}
                    </motion.button>
                </div>

                {/* Right: Form */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="lg:w-7/12 bg-white rounded-2xl border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-8 md:p-10"
                >
                    <h2 className="font-montserrat-bold text-xl md:text-2xl text-gray-900 mb-8">
                        {t("formTitle")}
                    </h2>

                    {submitted ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <div className="w-16 h-16 rounded-full bg-lyratech-light-purple flex items-center justify-center">
                                <svg className="w-8 h-8 text-lyratech-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="font-montserrat-bold text-gray-800 text-lg text-center">
                                {t("successTitle")}
                            </p>
                            <p className="text-gray-500 text-sm text-center">
                                {t("successSubtitle")}
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} noValidate>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Name */}
                                <div className="flex flex-col gap-1">
                                    <input
                                        type="text"
                                        placeholder={t("namePlaceholder")}
                                        value={form.name}
                                        onChange={(e) => handleChange("name", e.target.value)}
                                        className={fieldClass(!!errors.name)}
                                    />
                                    {errors.name && (
                                        <span className="text-red/70 text-xs font-semibold pl-1 flex items-center gap-1">
                                            <span>•</span> {t("requiredField")}
                                        </span>
                                    )}
                                </div>

                                {/* Email */}
                                <div className="flex flex-col gap-1">
                                    <input
                                        type="email"
                                        placeholder={t("emailPlaceholder")}
                                        value={form.email}
                                        onChange={(e) => handleChange("email", e.target.value)}
                                        className={fieldClass(!!errors.email)}
                                    />
                                    {errors.email && (
                                        <span className="text-red/70 text-xs font-semibold pl-1 flex items-center gap-1">
                                            <span>•</span> {t("requiredField")}
                                        </span>
                                    )}
                                </div>

                                {/* Company */}
                                <div className="flex flex-col gap-1">
                                    <input
                                        type="text"
                                        placeholder={t("companyPlaceholder")}
                                        value={form.company}
                                        onChange={(e) => handleChange("company", e.target.value)}
                                        className={fieldClass(!!errors.company)}
                                    />
                                    {errors.company && (
                                        <span className="text-red/70 text-xs font-semibold pl-1 flex items-center gap-1">
                                            <span>•</span> {t("requiredField")}
                                        </span>
                                    )}
                                </div>

                                {/* Phone */}
                                <div className="flex flex-col gap-1">
                                    <input
                                        type="tel"
                                        placeholder={t("phonePlaceholder")}
                                        value={form.phone}
                                        onChange={(e) => handleChange("phone", e.target.value)}
                                        className={fieldClass(!!errors.phone)}
                                    />
                                    {errors.phone && (
                                        <span className="text-red/70 text-xs font-semibold pl-1 flex items-center gap-1">
                                            <span>•</span> {t("requiredField")}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Custom service dropdown */}
                            <div className="mt-4 flex flex-col gap-1" ref={serviceRef}>
                                <button
                                    type="button"
                                    onClick={() => setServiceOpen((o) => !o)}
                                    className={`${fieldClass(!!errors.service)} flex items-center justify-between cursor-pointer text-left`}
                                >
                                    <span className={selectedService ? "text-gray-700" : "text-gray-400"}>
                                        {selectedService ? selectedService.label : t("servicePlaceholder")}
                                    </span>
                                    <HiChevronDown
                                        className={`text-gray-400 text-lg flex-shrink-0 transition-transform duration-200 ${serviceOpen ? "rotate-180" : ""}`}
                                    />
                                </button>

                                {serviceOpen && (
                                    <div className="relative">
                                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] overflow-hidden">
                                            {SERVICES.map((s) => (
                                                <button
                                                    key={s.value}
                                                    type="button"
                                                    onClick={() => {
                                                        handleChange("service", s.value);
                                                        setServiceOpen(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-3 text-sm transition-colors duration-150 ${
                                                        form.service === s.value
                                                            ? "bg-lyratech-light-purple text-lyratech-purple font-semibold"
                                                            : "text-gray-600 hover:bg-lyratech-light-purple/40 hover:text-lyratech-purple"
                                                    }`}
                                                >
                                                    {s.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {errors.service && (
                                    <span className="text-red/70 text-xs font-semibold pl-1 flex items-center gap-1">
                                        <span>•</span> {t("requiredField")}
                                    </span>
                                )}
                            </div>

                            {/* Message */}
                            <div className="mt-4 flex flex-col gap-1">
                                <textarea
                                    rows={5}
                                    placeholder={t("messagePlaceholder")}
                                    value={form.message}
                                    onChange={(e) => handleChange("message", e.target.value)}
                                    className={`${fieldClass(!!errors.message)} resize-none`}
                                />
                                {errors.message && (
                                    <span className="text-red/70 text-xs font-semibold pl-1 flex items-center gap-1">
                                        <span>•</span> {t("requiredField")}
                                    </span>
                                )}
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                className="mt-6 w-full bg-lyratech-purple text-white font-montserrat-bold py-4 rounded-xl hover:bg-button-dark-purple transition-colors duration-200"
                            >
                                {t("submitButton")}
                            </button>
                        </form>
                    )}
                </motion.div>
            </div>
        </section>
    );
}
