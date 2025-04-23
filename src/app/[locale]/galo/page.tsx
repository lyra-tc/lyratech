import React from "react";
import Profile from "@/components/DigitalBusinessCard/Profile";
import Contact from "@/components/DigitalBusinessCard/Contact";
import GaloImage from "@/assets/images/DigitalBusinessCard/Galo.jpg";
import ButtonLanguage from "@/components/ButtonLanguage";

export default function Galo() {
    return (
        <div className="bg-gradient-to-br from-lyratech-purple via-[#3f416e] to-lyratech-blue pb-20">
            <Profile imageSrc={GaloImage} name="Galo Alejandro Del Río Viggiano"/>
            <ButtonLanguage />
            <Contact
                phone="524421113104"
                email="galoviggiano@gmail.com"
                qrEndpoint="galo"
            />
        </div>
    );
}
