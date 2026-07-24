import React from "react";
import CardLayout from "@/components/DigitalBusinessCardV2/CardLayout";
import Profile from "@/components/DigitalBusinessCardV2/Profile";
import Contact from "@/components/DigitalBusinessCardV2/Contact";
import RichieImage from "@/assets/images/DigitalBusinessCard/Richie.png";
import ButtonLanguage from "@/components/ButtonLanguage";

export default function Ricardo() {
    return (
        <CardLayout>
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
        </CardLayout>
    );
}
