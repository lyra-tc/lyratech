import React from "react";
import Profile from "@/components/DigitalBusinessCard/Profile";
import Contact from "@/components/DigitalBusinessCard/Contact";
//import EzzatImage from "@/assets/images/DigitalBusinessCard/Ezzat.jpg";

export default function Galo() {
    return (
        <div className="bg-black">
            <Profile name="Galo Alejandro Del Río Viggiano" />
            <Contact
                phone="524421113104"
                email="a01710791@tec.mx"
                qrEndpoint="galo"
            />
        </div>
    );
}
