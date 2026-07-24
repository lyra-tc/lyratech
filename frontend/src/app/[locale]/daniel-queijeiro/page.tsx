import React from "react";
import CardLayout from "@/components/DigitalBusinessCardV2/CardLayout";
import Profile from "@/components/DigitalBusinessCardV2/Profile";
import Contact from "@/components/DigitalBusinessCardV2/Contact";
import DaniQImage from "@/assets/images/DigitalBusinessCard/DaniQ.png";
import ButtonLanguage from "@/components/ButtonLanguage";

export default function DanielQ() {
    return (
        <CardLayout>
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
        </CardLayout>
    );
}
