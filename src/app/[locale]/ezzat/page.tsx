import React from "react";
import Profile from "@/components/DigitalBusinessCard/Profile";
import Contact from "@/components/DigitalBusinessCard/Contact";
import EzzatImage from "@/assets/images/DigitalBusinessCard/Ezzat.jpg";

export default function Ezzat() {
    return (
        <div className="bg-gradient-to-br from-lyratech-purple via-[#3f416e] to-lyratech-blue pb-20">
            <Profile imageSrc={EzzatImage} name="Ezzat Alzahouri Campos"/>
            <Contact
                phone="524428804267"
                email="drearyland22021@gmail.com"
                qrEndpoint="ezzat"
            />
        </div>
    );
}
