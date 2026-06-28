import React from "react";
import Profile from "@/components/DigitalBusinessCardV2/Profile";
import Contact from "@/components/DigitalBusinessCardV2/Contact";
import EzzatImage from "@/assets/images/DigitalBusinessCard/Ezzat.jpg";
import ButtonLanguage from "@/components/ButtonLanguage";

export default function Ezzat() {
    return (
        <div
            className="min-h-screen"
            style={{
                background: "linear-gradient(160deg, #1a1c2e 0%, #2d2f52 40%, #1e2035 70%, #0d0f1a 100%)",
            }}
        >
            <Profile
                imageSrc={EzzatImage}
                name="Ezzat Alzahouri Campos"
                position="Co-Founder & CTO"
            />
            <ButtonLanguage />
            <Contact
                phone="524428804267"
                email="ezzat.alzahouri@lyratech.com.mx"
                qrEndpoint="ezzat"
            />
        </div>
    );
}
