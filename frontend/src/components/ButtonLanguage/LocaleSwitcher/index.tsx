'use client';
import { useParams } from 'next/navigation';
import React, { useState, useTransition } from 'react';
import { useRouter, usePathname } from '@/navigation';
import Image from 'next/image';
import { useTranslations } from "next-intl";

type Props = {
    closeModalAction: () => void;
    currentLocale: string;
};

export default function LocaleSwitcher({ closeModalAction, currentLocale }: Props) {
    const t = useTranslations("buttonLanguage");
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const pathname = usePathname();
    const params = useParams();

    const [activeButton] = useState<string | null>(null);

    function localeChange(locale: string) {
        console.log(`pathname: ${pathname} params: ${params} locale: ${locale}`);
        const nextLocale = locale;
        startTransition(() => {
            router.replace(
                { pathname },
                { locale: nextLocale }
            );
        });
    }

    const languages = [
        { code: 'en', label: t("English"), flag: 'https://upload.wikimedia.org/wikipedia/en/a/ae/Flag_of_the_United_Kingdom.svg' },
        { code: 'es', label: t("Spanish"), flag: 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Flag_of_Spain.svg' },
        { code: 'de', label: t("German"), flag: 'https://upload.wikimedia.org/wikipedia/en/b/ba/Flag_of_Germany.svg' },
        { code: 'fr', label: t("French"), flag: 'https://upload.wikimedia.org/wikipedia/en/c/c3/Flag_of_France.svg' },
    ];

    return (
        <div className="fixed bottom-20 right-4 z-50" onClick={closeModalAction}>
            <div onClick={(e) => e.stopPropagation()}>
                <div className="flex flex-col justify-center gap-y-3 bg-white/30 backdrop-blur-md p-4 rounded-2xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">

                    {languages.map((lang, i) => {
                        const isSelected = currentLocale === lang.code;
                        const isActive = activeButton === lang.code;

                        return (
                            <button
                                key={lang.code}
                                disabled={isPending}
                                onClick={() => localeChange(lang.code)}
                                className={`
                                    group relative inline-flex items-center justify-start overflow-hidden transition-all rounded-full border-2 px-4 py-2 text-sm font-semibold tracking-wider
                                    ${isSelected || isActive ? 'bg-gradient-to-br from-lyratech-purple to-lyratech-blue text-white border-transparent' : 'bg-white text-lyratech-blue border-lyratech-purple'}
                                    hover:bg-gradient-to-br hover:from-lyratech-purple hover:to-lyratech-blue hover:text-white hover:shadow-lg
                                    animate-slideInUp
                                `}
                                style={{ animationDelay: `${0.1 * (i + 1)}s` }}
                            >
                                <Image
                                    src={lang.flag}
                                    alt={`${lang.label} Flag`}
                                    width={20}
                                    height={14}
                                    className="mr-2"
                                />
                                {lang.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
