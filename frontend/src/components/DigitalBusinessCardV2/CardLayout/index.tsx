import React from "react";

interface CardLayoutProps {
    children: React.ReactNode;
}

function CardLayout({ children }: Readonly<CardLayoutProps>) {
    return (
        <div
            className="min-h-screen flex items-center justify-center"
            style={{
                background: "linear-gradient(160deg, #1a1c2e 0%, #2d2f52 40%, #1e2035 70%, #0d0f1a 100%)",
            }}
        >
            <div className="w-full md:grid md:grid-cols-2 md:items-center md:gap-12 lg:gap-20 md:max-w-4xl lg:max-w-5xl md:px-10 md:py-16">
                {children}
            </div>
        </div>
    );
}

export default CardLayout;
