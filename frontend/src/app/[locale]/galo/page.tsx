import React from "react";
import CardLayout from "@/components/DigitalBusinessCardV2/CardLayout";
import Profile from "@/components/DigitalBusinessCardV2/Profile";
import Contact from "@/components/DigitalBusinessCardV2/Contact";
import GaloImage from "@/assets/images/DigitalBusinessCard/Galo.jpg";
import ButtonLanguage from "@/components/ButtonLanguage";

export default function Galo() {
    return (
        <CardLayout>
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
        </CardLayout>
    );
}
