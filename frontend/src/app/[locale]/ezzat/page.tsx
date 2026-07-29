import React from "react";
import CardLayout from "@/components/DigitalBusinessCardV2/CardLayout";
import Profile from "@/components/DigitalBusinessCardV2/Profile";
import Contact from "@/components/DigitalBusinessCardV2/Contact";
import EzzatImage from "@/assets/images/DigitalBusinessCard/Ezzat.jpg";
import ButtonLanguage from "@/components/ButtonLanguage";

export default function Ezzat() {
    return (
        <CardLayout>
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
        </CardLayout>
    );
}
