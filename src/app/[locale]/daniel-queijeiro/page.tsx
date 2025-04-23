import React from "react";
import Profile from "@/components/DigitalBusinessCard/Profile";
import Contact from "@/components/DigitalBusinessCard/Contact";
import DaniQImage from "@/assets/images/DigitalBusinessCard/DaniQ.jpg";

export default function DanielQ() {
    return (
        <div className="bg-black">
            <Profile imageSrc={DaniQImage} name="Daniel Queijeiro Albo" />
            <Contact
                phone="524423015435"
                email="dany.queijeiro@hotmail.com"
                qrEndpoint="daniel-queijeiro"
            />
        </div>
    );
}
