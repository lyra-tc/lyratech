import React from "react";
import Profile from "@/components/DigitalBusinessCardV2/Profile";
import Contact from "@/components/DigitalBusinessCardV2/Contact";
import DaniCImage from "@/assets/images/DigitalBusinessCard/DaniC.png";
import ButtonLanguage from "@/components/ButtonLanguage";

export default function DanielC() {
    return (
        <div
            className="min-h-screen"
            style={{
                background: "linear-gradient(160deg, #1a1c2e 0%, #2d2f52 40%, #1e2035 70%, #0d0f1a 100%)",
            }}
        >
            <Profile
                imageSrc={DaniCImage}
                name="Daniel Contreras Chávez"
                position="Co-Founder & CEO"
            />
            <ButtonLanguage />
            <Contact
                phone="524426142904"
                email="daniel.contreras@lyratech.com.mx"
                qrEndpoint="daniel-contreras"
            />
        </div>
    );
}
