import React from "react";
import Profile from "@/components/DigitalBusinessCard/Profile";
import Contact from "@/components/DigitalBusinessCard/ContactLyratech";
import LogoImage from "@/assets/images/DigitalBusinessCard/Logo.png";
import ButtonLanguage from "@/components/ButtonLanguage";

export default function Galo() {
    return (
        <div className="bg-gradient-to-br from-lyratech-purple via-[#3f416e] to-lyratech-blue pb-20">
            <Profile imageSrc={LogoImage} name="Lyra Technologies"/>
            <ButtonLanguage />
            <Contact
                phone="524421113104"
                email="galo.viggiano@lyratech.com.mx"
                qrEndpoint="business-card"
            />
        </div>
    );
}
