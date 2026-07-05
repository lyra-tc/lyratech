"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { HiOutlineX } from "react-icons/hi";
import BookingModal from "@/components/shared/BookingModal";
import type { DiagnosticSubmitResult } from "@/lib/api";

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

  const primaryName = tServices(SERVICE_LABEL_KEYS[result.recommended_service] ?? "s1Title");
  const secondaryName = result.secondary_service
    ? tServices(SERVICE_LABEL_KEYS[result.secondary_service] ?? "s1Title")
    : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={t("closeButton")}
        onClick={onClose}
        className="fixed inset-0 bg-dark-blue/60 backdrop-blur-sm cursor-default"
      />
      <div className="relative bg-white rounded-[24px] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
        <button
          onClick={onClose}
          aria-label={t("closeButton")}
          className="absolute top-4 right-4 text-white/70 hover:text-white p-1 z-10"
        >
          <HiOutlineX size={20} />
        </button>

        <div className="p-7 bg-gradient-to-br from-dark-blue to-lyratech-purple">
          <p className="text-xs text-white/60 uppercase tracking-widest mb-2">{t("modalTitle")}</p>
          <h2 className="font-montserrat-bold text-white text-2xl leading-tight mb-4">{result.headline}</h2>

          <div className="flex flex-col gap-2">
            <p className="text-[11px] text-white/50 uppercase tracking-wide mb-1">{t("resultAffinityLabel")}</p>
            <div className="flex justify-between text-xs text-white/80">
              <span>{primaryName}</span>
              <span>{affinityPercent(result.service_scores, result.recommended_service)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full bg-white rounded-full"
                style={{ width: `${affinityPercent(result.service_scores, result.recommended_service)}%` }}
              />
            </div>
            {secondaryName && result.secondary_service && (
              <>
                <div className="flex justify-between text-xs text-white/80 mt-1">
                  <span>{secondaryName}</span>
                  <span>{affinityPercent(result.service_scores, result.secondary_service)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full bg-white/60 rounded-full"
                    style={{ width: `${affinityPercent(result.service_scores, result.secondary_service)}%` }}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="p-7 flex flex-col gap-5">
          <p className="text-gray-600 text-sm leading-relaxed">{result.summary}</p>

          <div className="bg-lyratech-blue/40 rounded-2xl p-5">
            <p className="text-xs font-montserrat-bold text-lyratech-purple uppercase tracking-wide mb-2">
              {t("resultWhyItFits")}
            </p>
            <p className="text-gray-700 text-sm leading-relaxed">{result.why_it_fits}</p>
          </div>

          <div>
            <p className="text-xs font-montserrat-bold text-lyratech-purple uppercase tracking-wide mb-2">
              {t("resultOpportunities")}
            </p>
            <ul className="flex flex-col gap-2">
              {result.key_opportunities.map((item, i) => (
                <li key={i} className="text-gray-700 text-sm flex gap-2">
                  <span className="text-lyratech-purple">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-montserrat-bold text-lyratech-purple uppercase tracking-wide mb-2">
              {t("resultNextSteps")}
            </p>
            <ul className="flex flex-col gap-2">
              {result.suggested_next_steps.map((item, i) => (
                <li key={i} className="text-gray-700 text-sm flex gap-2">
                  <span className="text-lyratech-purple">{i + 1}.</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {result.confidence_note && (
            <p className="text-gray-400 text-xs leading-relaxed">{result.confidence_note}</p>
          )}

          <button
            onClick={() => setBookingOpen(true)}
            className="w-full bg-lyratech-purple text-white font-montserrat-bold py-3.5 rounded-xl hover:bg-button-dark-purple transition-colors"
          >
            {t("resultCta")}
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="w-full text-center text-gray-500 text-sm hover:text-lyratech-purple transition-colors underline underline-offset-2"
          >
            {t("resultRestart")}
          </button>
        </div>
      </div>

      <BookingModal isOpen={bookingOpen} onClose={() => setBookingOpen(false)} title={t("resultCta")} />
    </div>
  );
}
