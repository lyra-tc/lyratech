import React from "react";
import FluidCanvas from "@/components/DigitalBusinessCardV3/FluidCanvas";

export default function RicardoV4() {
    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center">
            {/* Header */}
            <header className="w-full flex items-center justify-between px-8 py-5 absolute top-0 left-0 z-10">
                <div className="flex items-center gap-3">
                    <div
                        className="w-8 h-8 rounded-md flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: "linear-gradient(135deg, #5f66ae, #272a33)" }}
                    >
                        L
                    </div>
                    <div>
                        <p className="text-sm font-bold text-[#272a33] leading-none font-montserrat-bold">Ricardo Sierra Roa</p>
                        <p className="text-xs text-[#5f66ae] font-montserrat">Co-Founder & CFO at LyraTech</p>
                    </div>
                </div>
                <a
                    href="https://wa.me/525564075229"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#5f66ae] text-white text-sm font-montserrat-bold px-5 py-2 rounded-full hover:bg-[#272a33] transition-colors duration-300"
                >
                    Contactame
                </a>
            </header>

            {/* Fluid canvas */}
            <FluidCanvas width={750} height={680} />
        </div>
    );
}
