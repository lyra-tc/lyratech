"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { HiOutlineX } from "react-icons/hi";
import { HiOutlineSparkles } from "react-icons/hi2";
import BookingModal from "@/components/shared/BookingModal";
import type { DiagnosticSubmitResult } from "@/lib/api";
import WhiteLogo from "@/assets/images/Navbar/White_Logo.png";

interface DiagnosticGoResultProps {
  result: DiagnosticSubmitResult;
  onClose: () => void;
  onRestart: () => void;
}

const SERVICE_LABEL_KEYS: Record<string, "s1Title" | "s2Title" | "s3Title"> = {
  process_automation: "s1Title",
  fixed_price_project: "s2Title",
  dedicated_team: "s3Title",
};

function affinityPercent(scores: Record<string, number>, key: string): number {
  const max = Math.max(...Object.values(scores), 1);
  return Math.round(((scores[key] || 0) / max) * 100);
}

export default function DiagnosticGoResult({ result, onClose, onRestart }: DiagnosticGoResultProps) {
  const t = useTranslations("diagnosticGo");
  const tServices = useTranslations("servicesCards");
  const [bookingOpen, setBookingOpen] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const primaryName = tServices(SERVICE_LABEL_KEYS[result.recommended_service] ?? "s1Title");
  const secondaryName = result.secondary_service
    ? tServices(SERVICE_LABEL_KEYS[result.secondary_service] ?? "s1Title")
    : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 md:items-center">
      <button
        type="button"
        aria-label={t("closeButton")}
        onClick={onClose}
        className="fixed inset-0 cursor-default bg-dark-blue/60 backdrop-blur-sm"
      />

      <div className="relative my-auto w-full max-w-[1160px] overflow-y-auto rounded-[24px] bg-[#f3f4fa] p-3 shadow-2xl animate-scale-in md:max-h-[92vh] md:overflow-hidden">
        <div className="grid h-full gap-3 md:grid-cols-[300px_minmax(0,1fr)] lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-dark-blue via-lyratech-blue to-lyratech-purple text-white shadow-[0_18px_40px_rgba(0,2,14,0.18)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(198,201,229,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(95,102,174,0.55),transparent_38%)]" />
            <button
              onClick={onClose}
              aria-label={t("closeButton")}
              className="absolute right-4 top-4 z-20 p-1 text-white/70 hover:text-white md:hidden"
            >
              <HiOutlineX size={20} />
            </button>
            <div className="relative z-10 flex h-full flex-col p-6 md:p-5 lg:p-6">
              <Image
                src={WhiteLogo}
                alt="Lyra Tech"
                width={52}
                height={52}
                className="mx-auto mb-5 h-auto w-[52px]"
                priority
              />
              <p className="mb-3 text-center text-xs uppercase tracking-widest text-white/60">{t("modalTitle")}</p>
              <h2 className="mx-auto max-w-[12ch] text-center font-montserrat-bold text-[26px] leading-[1.08] text-white md:text-[28px] lg:text-[32px]">
                {result.headline}
              </h2>

              <div className="mt-8 rounded-[18px] border border-white/10 bg-white/[0.08] p-4 backdrop-blur-md">
                <p className="mb-3 text-[11px] uppercase tracking-wide text-white/50">{t("resultAffinityLabel")}</p>
                <div className="flex flex-col gap-3">
                  <div>
                    <div className="mb-1.5 flex justify-between text-xs text-white/80">
                      <span>{primaryName}</span>
                      <span>{affinityPercent(result.service_scores, result.recommended_service)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/20">
                      <div
                        className="h-full rounded-full bg-white"
                        style={{ width: `${affinityPercent(result.service_scores, result.recommended_service)}%` }}
                      />
                    </div>
                  </div>

                  {secondaryName && result.secondary_service && (
                    <div>
                      <div className="mb-1.5 flex justify-between text-xs text-white/80">
                        <span>{secondaryName}</span>
                        <span>{affinityPercent(result.service_scores, result.secondary_service)}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/20">
                        <div
                          className="h-full rounded-full bg-white/60"
                          style={{ width: `${affinityPercent(result.service_scores, result.secondary_service)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-auto pt-6">
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/10 p-3 text-white/78">
                  <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10">
                    <HiOutlineSparkles className="text-sm text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">{t("resultAiBadge")}</p>
                    <p className="mt-1 text-xs leading-5 text-white/72">{t("resultAiNote")}</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <section className="relative rounded-[20px] bg-white shadow-[0_10px_30px_rgba(39,42,51,0.06)] md:max-h-[calc(92vh-24px)] md:overflow-y-auto">
            <button
              onClick={onClose}
              aria-label={t("closeButton")}
              className="absolute right-4 top-4 z-10 hidden p-1 text-gray-400 hover:text-gray-700 md:block md:right-5 md:top-5"
            >
              <HiOutlineX size={20} />
            </button>

            <div className="border-b border-gray-100 px-6 py-5 md:px-8 md:py-6">
              <p className="max-w-none pr-14 text-sm leading-7 text-gray-600 md:text-[16px] lg:text-[17px]">
                {result.summary}
              </p>
            </div>

            <div className="grid gap-6 px-6 py-6 md:px-8 md:py-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
              <div className="flex flex-col gap-6">
                <div className="rounded-2xl bg-lyratech-blue/40 p-5 md:p-6">
                  <p className="mb-2 text-xs font-montserrat-bold uppercase tracking-wide text-lyratech-purple">
                    {t("resultWhyItFits")}
                  </p>
                  <p className="text-sm leading-7 text-gray-700 md:text-base">{result.why_it_fits}</p>
                </div>

                <div>
                  <p className="mb-2 text-xs font-montserrat-bold uppercase tracking-wide text-lyratech-purple">
                    {t("resultOpportunities")}
                  </p>
                  <ul className="flex flex-col gap-3">
                    {result.key_opportunities.map((item, i) => (
                      <li key={i} className="flex gap-3 text-sm leading-7 text-gray-700 md:text-base">
                        <span className="text-lyratech-purple">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {result.confidence_note && (
                  <p className="text-xs leading-6 text-gray-400 md:text-sm">{result.confidence_note}</p>
                )}
              </div>

              <div className="flex flex-col gap-6">
                <div>
                  <p className="mb-2 text-xs font-montserrat-bold uppercase tracking-wide text-lyratech-purple">
                    {t("resultNextSteps")}
                  </p>
                  <ul className="flex flex-col gap-3">
                    {result.suggested_next_steps.map((item, i) => (
                      <li key={i} className="flex gap-3 text-sm leading-7 text-gray-700 md:text-base">
                        <span className="font-montserrat-bold text-lyratech-purple">{i + 1}.</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 md:p-5">
                  <button
                    onClick={() => setBookingOpen(true)}
                    className="w-full rounded-xl bg-lyratech-purple py-3.5 font-montserrat-bold text-white transition-colors hover:bg-button-dark-purple"
                  >
                    {t("resultCta")}
                  </button>

                  <button
                    type="button"
                    onClick={onRestart}
                    className="mt-4 w-full text-center text-sm text-gray-500 underline underline-offset-2 transition-colors hover:text-lyratech-purple"
                  >
                    {t("resultRestart")}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <BookingModal isOpen={bookingOpen} onClose={() => setBookingOpen(false)} title={t("resultCta")} />
    </div>
  );
}
