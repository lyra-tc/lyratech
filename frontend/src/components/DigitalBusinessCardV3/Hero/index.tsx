"use client";
import React, { useRef, useCallback } from "react";
import Image from "next/image";
import { motion, useMotionValue, useSpring, useMotionValueEvent } from "framer-motion";
import RichieBase from "@/assets/images/DigitalBusinessCardV3/Richie.png";
import RichieHover from "@/assets/images/DigitalBusinessCardV3/Driver.png";
import Link from 'next/link';

interface HeroProps {
    name: string;
    role: string;
    company: string;
    phone: string;
    email: string;
}

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const row1 = "LyraTech. Your Vision in Code.    LyraTech. Your Vision in Code.    LyraTech. Your Vision in Code.    LyraTech. Your Vision in Code.   ";
const row2 = "I Design. I Lead. I Build. I Structure. I Solve.    I Design. I Lead. I Build. I Structure. I Solve.    I Design. I Lead. I Build. I Structure. I Solve.   ";

const R_IMM   = 120; // radio spotlight inmediato
const R_TRAIL = 185; // radio rastro (más grande)

export default function Hero({ name, role, company, phone, email }: HeroProps) {
    const containerRef  = useRef<HTMLDivElement>(null);
    const spotImmRef    = useRef<HTMLDivElement>(null);
    const spotTrailRef  = useRef<HTMLDivElement>(null);
    const isHovering    = useRef(false);

    const stopTimer = useRef<ReturnType<typeof setTimeout>>();

    const rawX = useMotionValue(0);
    const rawY = useMotionValue(0);
    // stiffness alto = trail pegado al cursor; damping evita rebote
    const springX = useSpring(rawX, { stiffness: 140, damping: 22 });
    const springY = useSpring(rawY, { stiffness: 140, damping: 22 });

    // Actualiza el spotlight: posición + background-position del Driver
    const updateSpot = useCallback((
        el: HTMLDivElement,
        x: number, y: number,
        r: number,
        W: number, H: number
    ) => {
        const sl = x - r;
        const st = y - r;
        el.style.left             = `${sl}px`;
        el.style.top              = `${st}px`;
        el.style.backgroundSize   = `${W}px ${H}px`;
        el.style.backgroundPosition = `${-sl}px ${-st}px`;
    }, []);

    // Rastro — sigue con spring
    useMotionValueEvent(springX, "change", (x) => {
        if (!spotTrailRef.current || !containerRef.current || !isHovering.current) return;
        const W = containerRef.current.offsetWidth;
        const H = containerRef.current.offsetHeight;
        updateSpot(spotTrailRef.current, x, springY.get(), R_TRAIL, W, H);
    });
    useMotionValueEvent(springY, "change", (y) => {
        if (!spotTrailRef.current || !containerRef.current || !isHovering.current) return;
        const W = containerRef.current.offsetWidth;
        const H = containerRef.current.offsetHeight;
        updateSpot(spotTrailRef.current, springX.get(), y, R_TRAIL, W, H);
    });

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        rawX.set(x);
        rawY.set(y);

        if (!spotImmRef.current || !containerRef.current) return;
        const W = containerRef.current.offsetWidth;
        const H = containerRef.current.offsetHeight;
        updateSpot(spotImmRef.current, x, y, R_IMM, W, H);

        // Resetear squash del rastro mientras el cursor se mueve
        if (spotTrailRef.current) {
            spotTrailRef.current.style.transition = "opacity 0.15s ease";
            spotTrailRef.current.style.transform  = "scale(1)";
            spotTrailRef.current.style.opacity    = "0.65";
        }

        // Después de 120ms sin movimiento → aplasta y desvanece el rastro
        clearTimeout(stopTimer.current);
        stopTimer.current = setTimeout(() => {
            if (spotTrailRef.current) {
                spotTrailRef.current.style.transition = "opacity 0.55s ease, transform 0.55s cubic-bezier(0.4,0,0.2,1)";
                spotTrailRef.current.style.opacity    = "0";
                spotTrailRef.current.style.transform  = "scaleY(0.08) scaleX(1.15)";
            }
        }, 120);
    }, [rawX, rawY, updateSpot]);

    const handleMouseEnter = useCallback(() => {
        isHovering.current = true;
        if (spotImmRef.current) {
            spotImmRef.current.style.opacity   = "1";
            spotImmRef.current.style.animation = "live-border 1.4s ease-in-out infinite";
        }
        if (spotTrailRef.current) {
            spotTrailRef.current.style.transform = "scale(1)";
            spotTrailRef.current.style.opacity   = "0.65";
        }
    }, []);

    const handleMouseLeave = useCallback(() => {
        isHovering.current = false;
        clearTimeout(stopTimer.current);
        if (spotImmRef.current) {
            spotImmRef.current.style.opacity   = "0";
            spotImmRef.current.style.animation = "none";
        }
        if (spotTrailRef.current) {
            spotTrailRef.current.style.transition = "opacity 0.4s ease, transform 0.4s cubic-bezier(0.4,0,0.2,1)";
            spotTrailRef.current.style.opacity    = "0";
            spotTrailRef.current.style.transform  = "scaleY(0.08) scaleX(1.15)";
        }
    }, []);

    const spotBase: React.CSSProperties = {
        position: "absolute",
        borderRadius: "50%",
        backgroundImage: `url('${RichieHover.src}')`,
        backgroundRepeat: "no-repeat",
        pointerEvents: "none",
        opacity: 0,
        WebkitMaskImage: "radial-gradient(ellipse 50% 50% at 50% 50%, black 25%, transparent 100%)",
        maskImage:        "radial-gradient(ellipse 50% 50% at 50% 50%, black 25%, transparent 100%)",
    };

    return (
        <div className="min-h-screen bg-white flex flex-col overflow-hidden">

            {/* ── Header ── */}
            <motion.header
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease }}
                className="flex items-center justify-between px-6 py-4 z-20 relative"
            >
                <div className="flex items-center gap-3">
                    <div
                        className="w-8 h-8 rounded-md flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: "linear-gradient(135deg, #5f66ae, #272a33)" }}
                    >
                        L
                    </div>
                    <div>
                        <p className="text-sm font-bold text-[#272a33] leading-none font-montserrat-bold">{name}</p>
                        <p className="text-xs text-[#5f66ae] font-montserrat">{role} at {company}</p>
                    </div>
                </div>
                <a
                    href={`https://wa.me/${phone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#5f66ae] text-white text-sm font-montserrat-bold px-5 py-2 rounded-full hover:bg-[#272a33] transition-colors duration-300"
                >
                    Contactame
                </a>
            </motion.header>

            {/* ── Hero ── */}
            <div className="relative flex-1 flex items-center justify-center overflow-hidden">

                <div className="absolute top-[28%] w-full overflow-hidden pointer-events-none select-none z-0">
                    <div className="flex whitespace-nowrap" style={{ animation: "marquee 40s linear infinite" }}>
                        <span className="text-[clamp(3rem,10vw,8rem)] font-zendots text-[#272a33] opacity-90 pr-16">{row1}</span>
                        <span className="text-[clamp(3rem,10vw,8rem)] font-zendots text-[#272a33] opacity-90 pr-16">{row1}</span>
                    </div>
                </div>

                <div className="absolute top-[52%] w-full overflow-hidden pointer-events-none select-none z-0">
                    <div className="flex whitespace-nowrap" style={{ animation: "marquee-reverse 18s linear infinite" }}>
                        <span className="text-[clamp(2rem,7vw,6rem)] font-zendots text-[#5f66ae] opacity-30 pr-16">{row2}</span>
                        <span className="text-[clamp(2rem,7vw,6rem)] font-zendots text-[#5f66ae] opacity-30 pr-16">{row2}</span>
                    </div>
                </div>

                {/* ── Foto ── */}
                <motion.div
                    ref={containerRef}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.2, ease }}
                    className="relative z-10 cursor-crosshair overflow-hidden"
                    onMouseMove={handleMouseMove}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    {/* Base */}
                    <Image src={RichieBase} alt={name} priority />

                    {/* Rastro (spring, más grande, squash al parar) */}
                    <div ref={spotTrailRef} style={{
                        ...spotBase,
                        width: R_TRAIL * 2,
                        height: R_TRAIL * 2,
                        transition: "opacity 0.15s ease",
                        transformOrigin: "center center",
                    }} />

                    {/* Inmediato (raw cursor, borde con vida) */}
                    <div ref={spotImmRef} style={{
                        ...spotBase,
                        width: R_IMM * 2,
                        height: R_IMM * 2,
                        transition: "opacity 0.1s ease",
                    }} />
                </motion.div>
            </div>

            {/* ── Footer ── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5, ease }}
                className="relative z-20 flex justify-center gap-3 px-6 pb-10 pt-4 flex-wrap"
            >
                <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer"
                    className="flex-1 min-w-[140px] max-w-[200px] text-center border border-[#272a33]/20 text-[#272a33] text-sm font-montserrat-bold py-3 px-4 rounded-xl hover:bg-[#272a33] hover:text-white transition-all duration-300 active:scale-95">
                    WhatsApp
                </a>
                <a href={`mailto:${email}`}
                    className="flex-1 min-w-[140px] max-w-[200px] text-center border border-[#5f66ae]/30 text-[#5f66ae] text-sm font-montserrat-bold py-3 px-4 rounded-xl hover:bg-[#5f66ae] hover:text-white transition-all duration-300 active:scale-95">
                    Email
                </a>
                <Link href="/"
                    className="flex-1 min-w-[140px] max-w-[200px] text-center border border-[#272a33]/10 text-[#272a33]/50 text-sm font-montserrat-bold py-3 px-4 rounded-xl hover:border-[#272a33]/30 hover:text-[#272a33] transition-all duration-300 active:scale-95">
                    lyratech.com.mx
                </Link>
            </motion.div>
        </div>
    );
}
