"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { FaWhatsapp } from "react-icons/fa";
import { MdMailOutline } from "react-icons/md";
import { FiPhone } from "react-icons/fi";

function HelpAndSupport() {
    const t = useTranslations("helpAndSupport");

    const contactMethods = [
        {
            icon: <FaWhatsapp className="text-[40px] md:text-[50px] lg:text-[35px] xl:text-[50px]" />,
            title: t("titleWhatsApp"),
            description: t("descriptionWhatsApp"),
            availability: t("availabilityWhatsApp"),
            responseTime: t("responseTimeWhatsApp"),
            buttonText: t("buttonTextWhatsApp"),
        },
        {
            icon: <MdMailOutline className="text-[40px] md:text-[50px] lg:text-[35px] xl:text-[50px]" />,
            title: t("titleMail"),
            description: t("descriptionMail"),
            availability: t("availabilityMail"),
            responseTime: t("responseTimeMail"),
            buttonText: t("buttonTextMail"),
        },
        {
            icon: <FiPhone className="text-[40px] md:text-[50px] lg:text-[35px] xl:text-[50px]" />,
            title: t("titlePhone"),
            description: t("descriptionPhone"),
            availability: t("availabilityPhone"),
            responseTime: t("responseTimePhone"),
            buttonText: t("buttonTextPhone"),
        },
    ];

    return (
        <div className="text-black font-montserrat mb-10">
            {/*Title*/}
            <div className="flex flex-col text-center mx-6 py-8 gap-y-6 rounded-[30px] shadow-contact md:mx-16 md:py-12 lg:mx-20 lg:gap-y-10 xl:mx-28 xl:py-16 xl:gap-y-14">
                <h1 className="font-bold text-2xl md:text-4xl lg:text-5xl">
                    {t("title")}
                </h1>
                <p className="px-4 md:px-14 md:text-lg lg:px-20 lg:text-xl xl:px-64">
                    {t("subtitle")}
                </p>
            </div>

            {/*Contact*/}
            <div className="flex flex-col text-center mt-10 gap-y-8 mx-6 md:mx-16 lg:mx-20 lg:flex-row lg:gap-10 xl:mx-28 xl:gap-14 xl:mt-14">
                {contactMethods.map((method, index) => (
                    <div
                        key={index}
                        className="flex flex-col justify-center items-center rounded-[30px] shadow-contact py-8 px-4 md:py-12 md:px-24 lg:px-6 lg:w-1/3 xl:px-10"
                    >
                        {method.icon}
                        <h2 className="font-bold text-lg mt-5 md:text-2xl lg:text-lg xl:text-2xl">
                            {method.title}
                        </h2>
                        <p className="mt-5 md:text-lg lg:text-sm xl:text-base">
                            {method.description}
                        </p>
                        <div className="text-sm mt-5 flex flex-row items-center justify-between w-full md:text-lg lg:text-sm xl:text-base">
                            <p>{t("availability")}</p>
                            <p className="font-bold">{method.availability}</p>
                        </div>
                        <div className="text-sm flex flex-row items-center justify-between w-full md:text-lg lg:text-sm xl:text-base">
                            <p>{t("responseTime")}</p>
                            <p className="font-bold text-lyratech-green">
                                {method.responseTime}
                            </p>
                        </div>
                        <div className="mt-7 md:mt-10">
                            <button className="text-lg lg:text-sm xl:text-lg rounded-[12px] text-white px-10 py-2 bg-gradient-to-tr from-button-dark-purple to-button-light-purple shadow-button transition-transform duration-500 ease-in-out hover:scale-75">
                                {method.buttonText}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default HelpAndSupport;
