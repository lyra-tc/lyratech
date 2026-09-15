import React from "react";
import CardLayout from "@/components/DigitalBusinessCardV2/CardLayout";
import Profile from "@/components/DigitalBusinessCardV2/Profile";
import Contact from "@/components/DigitalBusinessCardV2/Contact";
import IsraelImage from "@/assets/images/DigitalBusinessCard/Israel.jpg";
import ButtonLanguage from "@/components/ButtonLanguage";

export default function Israel() {
    return (
        <CardLayout>
            <Profile
                imageSrc={IsraelImage}
                name="Fernando Israel Rios Garcia"
                position="CCO - Chief Commercial Officer"
            />
            <ButtonLanguage />
            <Contact
                phone="524427487589"
                email="riosisrael.g@icloud.com"
                qrEndpoint="israel"
            />
        </CardLayout>
    );
}
