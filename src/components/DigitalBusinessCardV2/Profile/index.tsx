"use client";
import React from "react";
import Image, { StaticImageData } from "next/image";
import { motion } from "framer-motion";
import { CgProfile } from "react-icons/cg";
import Logo from "@/assets/images/Navbar/White_Logo.png";

interface ProfileProps {
    imageSrc?: StaticImageData;
    name: string;
    position?: string;
}

function Profile({ imageSrc, name, position }: ProfileProps) {
    return (
        <div className="flex flex-col items-center justify-center pt-6 md:pt-12 lg:pt-16 pb-2 md:pb-6 px-6">
            {/* Logo Lyratech */}
            <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="mb-4 md:mb-6 lg:mb-8"
            >
                <Image
                    src={Logo}
                    alt="Lyra Tech"
                    width={100}
                    height={40}
                    className="opacity-90 w-16 md:w-24 lg:w-28 h-auto"
                    priority
                />
            </motion.div>

            {/* Foto con borde degradado */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
                className="p-[2px] rounded-full"
                style={{
                    background: "linear-gradient(135deg, #5f66ae, #3f416e, #272a33)",
                    boxShadow: "0 0 32px rgba(95, 102, 174, 0.4)",
                }}
            >
                <div className="p-[3px] rounded-full bg-white">
                    {imageSrc ? (
                        <Image
                            src={imageSrc}
                            alt={name}
                            width={160}
                            height={160}
                            className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-full object-cover"
                            priority
                        />
                    ) : (
                        <div className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-full flex items-center justify-center text-white/60">
                            <CgProfile className="w-20 h-20 md:w-24 md:h-24" />
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Nombre */}
            <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }}
                className="text-xl md:text-2xl lg:text-3xl mt-3 md:mt-5 font-zendots text-white text-center leading-snug"
            >
                {name}
            </motion.p>

            {/* Cargo */}
            <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35, ease: "easeOut" }}
                className="mt-1 md:mt-2 text-sm md:text-base font-montserrat text-white/60 tracking-widest uppercase text-center"
            >
                {position}
            </motion.p>

            {/* Separador */}
            <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, delay: 0.45, ease: "easeOut" }}
                className="mt-3 md:mt-6 h-px w-24 md:w-32 rounded-full"
                style={{ background: "linear-gradient(90deg, transparent, #5f66ae, transparent)" }}
            />
        </div>
    );
}

export default Profile;
