"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

type FAQItem = {
    question: string;
    answer: string;
};

export default function FAQ() {
    const t = useTranslations("faqContact");
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const faqs: FAQItem[] = [
        { question: t("q1"), answer: t("a1") },
        { question: t("q2"), answer: t("a2") },
        { question: t("q3"), answer: t("a3") },
        { question: t("q4"), answer: t("a4") },
    ];

    const toggle = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <section className="px-6 py-16 md:py-24">
            <div className="max-w-6xl mx-auto">
                {/* Title */}
                <h2 className="font-montserrat-bold text-3xl md:text-4xl lg:text-5xl text-center mb-12 md:mb-16">
                    <span className="text-black">{t("titleLine1")} </span>
                    <span className="text-lyratech-purple">{t("titleLine2")}</span>
                </h2>

                {/* FAQ Items */}
                <div className="flex flex-col gap-5">
                    {faqs.map((faq, index) => (
                        <div
                            key={index}
                            className="border border-gray-300 rounded-[28px] bg-white overflow-hidden shadow-[0_16px_28px_rgba(0,0,0,0.15)]"
                        >
                            <button
                                onClick={() => toggle(index)}
                                className="w-full flex items-center justify-between px-8 py-7 md:px-12 md:py-8 text-left min-h-[80px] md:min-h-[90px]"
                            >
                                <span className="font-montserrat font-semibold text-gray-800 text-base md:text-lg pr-6">
                                    {faq.question}
                                </span>
                                <motion.span
                                    animate={{ rotate: openIndex === index ? 45 : 0 }}
                                    transition={{ duration: 0.25 }}
                                    className="text-3xl font-light text-gray-800 flex-shrink-0"
                                >
                                    +
                                </motion.span>
                            </button>

                            <AnimatePresence initial={false}>
                                {openIndex === index && (
                                    <motion.div
                                        key="content"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                        className="overflow-hidden"
                                    >
                                        <p className="font-montserrat text-gray-500 text-sm md:text-base leading-relaxed px-8 pb-7 md:px-10 md:pb-8">
                                            {faq.answer}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
