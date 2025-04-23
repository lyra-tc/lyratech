"use client";
import React from "react";
import Image, { StaticImageData } from "next/image";
import { useTranslations } from "next-intl";
import { CgProfile } from "react-icons/cg";

interface ProfileProps {
    imageSrc?: StaticImageData; // ahora es opcional
    name: string;
}

function Profile({ imageSrc, name }: ProfileProps) {
    const t = useTranslations("profileCard");

    return (
        <div className="text-white flex flex-col items-center justify-center">
            {/* Contenedor externo: círculo con borde y fondo negro */}
            <div
                className="flex items-center justify-center p-[1px] mt-20
                            w-48 h-48 rounded-full
                            bg-black border-4 border-white"
            >
                {imageSrc ? (
                    <Image
                        src={imageSrc}
                        alt={name}
                        width={240}
                        height={240}
                        className="w-40 h-40 rounded-full"
                        priority
                    />
                ) : (
                    <div className="flex items-center justify-center  text-white">
                        <CgProfile className="w-40 h-40" />
                    </div>
                )}
            </div>

            <p className="text-3xl mt-4 font-zendots mx-5 text-center">{name}</p>

            <p className="mt-4 text-sm font-bold text-center">{t("position")}</p>
        </div>
    );
}

export default Profile;
