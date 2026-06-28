import React from "react";
import Profile from "@/components/DigitalBusinessCardV2/Profile";
import Contact from "@/components/DigitalBusinessCardV2/Contact";
import DaniQImage from "@/assets/images/DigitalBusinessCard/DaniQ.png";
import ButtonLanguage from "@/components/ButtonLanguage";

export default function DanielQ() {
    return (
        <div
            className="min-h-screen"
            style={{
                background: "linear-gradient(160deg, #1a1c2e 0%, #2d2f52 40%, #1e2035 70%, #0d0f1a 100%)",
            }}
        >
            <Profile
                imageSrc={DaniQImage}
                name="Daniel Queijeiro Albo"
                position="Co-Founder & COO"
            />
            <ButtonLanguage />
            <Contact
                phone="524423015435"
                email="daniel.queijeiro@lyratech.com.mx"
                qrEndpoint="daniel-queijeiro"
            />
        </div>
    );
}
