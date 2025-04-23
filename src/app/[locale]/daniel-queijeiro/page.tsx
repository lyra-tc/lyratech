import React from "react";
import Profile from "@/components/DigitalBusinessCard/Profile";
import Contact from "@/components/DigitalBusinessCard/Contact";
import DaniQImage from "@/assets/images/DigitalBusinessCard/DaniQ.jpg";
import ButtonLanguage from "@/components/ButtonLanguage";

export default function DanielQ() {
    return (
        <div className="bg-gradient-to-br from-lyratech-purple via-[#3f416e] to-lyratech-blue pb-20">
            <Profile imageSrc={DaniQImage} name="Daniel Queijeiro Albo"/>
            <ButtonLanguage />
            <Contact
                phone="524423015435"
                email="dany.queijeiro@hotmail.com"
                qrEndpoint="daniel-queijeiro"
            />
        </div>
    );
}
