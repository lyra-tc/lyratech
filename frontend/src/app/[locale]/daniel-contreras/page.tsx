import React from "react";
import CardLayout from "@/components/DigitalBusinessCardV2/CardLayout";
import Profile from "@/components/DigitalBusinessCardV2/Profile";
import Contact from "@/components/DigitalBusinessCardV2/Contact";
import DaniCImage from "@/assets/images/DigitalBusinessCard/DaniC.png";
import ButtonLanguage from "@/components/ButtonLanguage";

export default function DanielC() {
    return (
        <CardLayout>
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
        </CardLayout>
    );
}
