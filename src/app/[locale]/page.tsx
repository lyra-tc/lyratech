import React from "react";
//import Image from "next/image";
import {useTranslations} from 'next-intl';

// app/[locale]/page.tsx
export default function Home() {
    const t = useTranslations('buttonLanguage');

    return (
        <div>
            <h1>{t('Spanish')}</h1>
            <p>Aquí renderizas la versión de tu home según el locale.</p>
        </div>
    );
}


