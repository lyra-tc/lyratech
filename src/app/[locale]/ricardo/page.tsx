import React from "react";
import Profile from "@/components/DigitalBusinessCard/Profile";
import RichieImage from "@/assets/images/DigitalBusinessCard/Richie.jpg";
import Contact from "@/components/DigitalBusinessCard/Contact";

export default function Ezzat() {
    return (
        <div className="bg-black">
            <Profile imageSrc={RichieImage} name="Ricardo Sierra Roa" />
            <Contact
                phone="525564075229"
                email="rickisierra919@gmail.com"
                qrEndpoint="ricardo"
            />
        </div>
    );
}
