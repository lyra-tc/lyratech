import React from "react";
import Profile from "@/components/DigitalBusinessCard/Profile";
import Contact from "@/components/DigitalBusinessCard/Contact";
import DaniCImage from "@/assets/images/DigitalBusinessCard/DaniC.jpg";

export default function DanielC() {
    return (
        <div className="bg-gradient-to-br from-lyratech-purple via-[#3f416e] to-lyratech-blue pb-20">
            <Profile imageSrc={DaniCImage} name="Daniel Contreras Chávez"/>
            <Contact
                phone="524426142904"
                email="danicontreras0409@gmail.com"
                qrEndpoint="daniel-contreras"
            />
        </div>
    );
}
