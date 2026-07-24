import React from "react";
import Profile from "@/components/DigitalBusinessCardV2/Profile";
import Contact from "@/components/DigitalBusinessCardV2/Contact";
import MaximeImage from "@/assets/images/DigitalBusinessCard/Maxime.jpeg";
import ButtonLanguage from "@/components/ButtonLanguage";

export default function Maxime() {
    return (
        <div
            className="min-h-screen"
            style={{
                background: "linear-gradient(160deg, #1a1c2e 0%, #2d2f52 40%, #1e2035 70%, #0d0f1a 100%)",
            }}
        >
            <Profile
                imageSrc={MaximeImage}
                name="Maxime Vilcocq"
                position="Junior Software Engineer"
            />
            <ButtonLanguage />
            <Contact
                phone="524611043033"
                email="maximevilcocq@live.com.mx"
                qrEndpoint="maxime"
            />
        </div>
    );
}
