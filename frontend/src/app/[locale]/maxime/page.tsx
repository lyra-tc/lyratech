import React from "react";
import CardLayout from "@/components/DigitalBusinessCardV2/CardLayout";
import Profile from "@/components/DigitalBusinessCardV2/Profile";
import Contact from "@/components/DigitalBusinessCardV2/Contact";
import MaximeImage from "@/assets/images/DigitalBusinessCard/Maxime.jpeg";
import ButtonLanguage from "@/components/ButtonLanguage";

export default function Maxime() {
    return (
        <CardLayout>
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
        </CardLayout>
    );
}
