import React from "react";
import Profile from "@/components/DigitalBusinessCard/Profile";
import RichieImage from "@/assets/images/DigitalBusinessCard/Richie.jpg";
import Contact from "@/components/DigitalBusinessCard/Contact";
import ButtonLanguage from "@/components/ButtonLanguage";

export default function Ricardo() {
    return (
        <div className="bg-gradient-to-br from-lyratech-purple via-[#3f416e] to-lyratech-blue pb-20">
            <Profile imageSrc={RichieImage} name="Ricardo Sierra Roa" position="Lyra Tech Co-Founder & CFO"/>
            <ButtonLanguage />
            <Contact
                phone="525564075229"
                email="ricardo.sierra@lyratech.com.mx"
                qrEndpoint="ricardo"
            />
        </div>
    );
}
