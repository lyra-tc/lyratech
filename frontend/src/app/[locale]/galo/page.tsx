import React from "react";
import Profile from "@/components/DigitalBusinessCardV2/Profile";
import Contact from "@/components/DigitalBusinessCardV2/Contact";
import GaloImage from "@/assets/images/DigitalBusinessCard/Galo.jpg";
import ButtonLanguage from "@/components/ButtonLanguage";

export default function Galo() {
    return (
        <div
            className="min-h-screen"
            style={{
                background: "linear-gradient(160deg, #1a1c2e 0%, #2d2f52 40%, #1e2035 70%, #0d0f1a 100%)",
            }}
        >
            <Profile
                imageSrc={GaloImage}
                name="Galo Alejandro Del Río Viggiano"
                position="Co-Founder & CMO"
            />
            <ButtonLanguage />
            <Contact
                phone="524421113104"
                email="galo.viggiano@lyratech.com.mx"
                qrEndpoint="galo"
            />
        </div>
    );
}
