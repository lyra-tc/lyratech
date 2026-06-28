import React from "react";
import Profile from "@/components/DigitalBusinessCardV2/Profile";
import Contact from "@/components/DigitalBusinessCardV2/Contact";
import RichieImage from "@/assets/images/DigitalBusinessCard/Richie.png";
import ButtonLanguage from "@/components/ButtonLanguage";

export default function Ricardo() {
    return (
        <div
            className="min-h-screen"
            style={{
                background: "linear-gradient(160deg, #1a1c2e 0%, #2d2f52 40%, #1e2035 70%, #0d0f1a 100%)",
            }}
        >
            <Profile
                imageSrc={RichieImage}
                name="Ricardo Sierra Roa"
                position="Co-Founder & CFO"
            />
            <ButtonLanguage />
            <Contact
                phone="525564075229"
                email="ricardo.sierra@lyratech.com.mx"
                qrEndpoint="ricardo"
            />
        </div>
    );
}
