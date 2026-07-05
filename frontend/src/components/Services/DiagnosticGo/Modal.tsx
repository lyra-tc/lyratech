"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useLocale, useTranslations } from "next-intl";
import { HiOutlineX, HiChevronLeft } from "react-icons/hi";
import LoadingDots from "@/components/shared/LoadingDots";
import DiagnosticGoResult from "./Result";
import { getActiveDiagnosticQuestions, submitDiagnostic, ApiError } from "@/lib/api";
import type { DiagnosticActiveQuestion, DiagnosticSubmitResult } from "@/lib/api";

interface DiagnosticGoModalProps {
  onClose: () => void;
}

interface ContactFormState {
  name: string;
  email: string;
  company: string;
  phone: string;
}

export default function DiagnosticGoModal({ onClose }: DiagnosticGoModalProps) {
  const t = useTranslations("diagnosticGo");
  const locale = useLocale();

  const [questions, setQuestions] = useState<DiagnosticActiveQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [contact, setContact] = useState<ContactFormState>({ name: "", email: "", company: "", phone: "" });
  const [contactErrors, setContactErrors] = useState<Partial<Record<keyof ContactFormState, boolean>>>({});
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState<DiagnosticSubmitResult | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReady, setTurnstileReady] = useState(false);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    getActiveDiagnosticQuestions(locale)
      .then((data) => {
        if (!cancelled) setQuestions(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError(t("errorLoadingQuestions"));
      })
      .finally(() => {
        if (!cancelled) setLoadingQuestions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [locale, t]);

  const totalSteps = 1 + questions.length;
  const isContactStep = stepIndex === 0;
  const currentQuestion = isContactStep ? null : questions[stepIndex - 1];
  const isLastStep = stepIndex === totalSteps - 1;

  const renderTurnstile = useCallback(() => {
    if (!turnstileContainerRef.current || !window.turnstile || widgetIdRef.current) return;
    widgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
      sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "",
      callback: (token: string) => setTurnstileToken(token),
      "expired-callback": () => setTurnstileToken(""),
      theme: "light",
      size: "flexible",
    });
  }, []);

  useEffect(() => {
    if (turnstileReady && isLastStep) renderTurnstile();
  }, [turnstileReady, isLastStep, renderTurnstile]);

  function validateContact(): boolean {
    const errors: Partial<Record<keyof ContactFormState, boolean>> = {};
    if (!contact.name.trim()) errors.name = true;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) errors.email = true;
    setContactErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSelectOption(questionKey: string, value: string, multi: boolean) {
    setAnswers((prev) => {
      if (!multi) return { ...prev, [questionKey]: [value] };
      const current = prev[questionKey] || [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [questionKey]: next };
    });
  }

  function handleOpenTextChange(questionKey: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionKey]: value ? [value] : [] }));
  }

  function handleBack() {
    setSubmitError("");
    setStepIndex((i) => Math.max(0, i - 1));
  }

  function handleNext() {
    if (isContactStep) {
      if (!validateContact()) return;
      setStepIndex(1);
      return;
    }
    if (currentQuestion?.is_required && !answers[currentQuestion.key]?.length) {
      setSubmitError(t("requiredField"));
      return;
    }
    setSubmitError("");
    setStepIndex((i) => Math.min(totalSteps - 1, i + 1));
  }

  async function handleSubmit() {
    if (currentQuestion?.is_required && !answers[currentQuestion.key]?.length) {
      setSubmitError(t("requiredField"));
      return;
    }
    if (!turnstileToken) {
      setSubmitError(t("errorTurnstile"));
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      const submitResult = await submitDiagnostic({
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        company: contact.company,
        locale,
        answers,
        turnstile_token: turnstileToken,
      });
      setResult(submitResult);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setSubmitError(t("errorRateLimited"));
      } else if (err instanceof ApiError && err.status === 400) {
        setSubmitError(t("errorTurnstile"));
      } else {
        setSubmitError(t("errorGeneric"));
      }
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
      setTurnstileToken("");
    } finally {
      setSubmitting(false);
    }
  }

  function handleRestart() {
    setResult(null);
    setStepIndex(0);
    setAnswers({});
    setSubmitError("");
    setTurnstileToken("");
    widgetIdRef.current = null;
  }

  if (result) {
    return <DiagnosticGoResult result={result} onClose={onClose} onRestart={handleRestart} />;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onLoad={() => setTurnstileReady(true)}
      />
      <button
        type="button"
        aria-label={t("closeButton")}
        onClick={onClose}
        className="fixed inset-0 bg-dark-blue/60 backdrop-blur-sm cursor-default"
      />
      <div className="relative bg-white rounded-[24px] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button onClick={handleBack} className="text-gray-400 hover:text-gray-700 p-1" aria-label={t("backButton")}>
                <HiChevronLeft size={20} />
              </button>
            )}
            <p className="font-montserrat-bold text-gray-900 text-base">{t("modalTitle")}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1" aria-label={t("closeButton")}>
            <HiOutlineX size={20} />
          </button>
        </div>

        {!loadingQuestions && !loadError && (
          <div className="px-6 pt-4 flex-shrink-0">
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-lyratech-purple transition-all duration-300"
                style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {t("stepOf", { current: stepIndex + 1, total: totalSteps })}
            </p>
          </div>
        )}

        <div className="p-6 flex-1">
          {loadingQuestions ? (
            <div className="flex justify-center py-16">
              <LoadingDots />
            </div>
          ) : loadError ? (
            <p className="text-red text-sm text-center py-16">{loadError}</p>
          ) : isContactStep ? (
            <div className="flex flex-col gap-4">
              <h3 className="font-montserrat-bold text-gray-900 text-lg mb-1">{t("contactStepTitle")}</h3>
              <input
                type="text"
                placeholder={t("namePlaceholder")}
                value={contact.name}
                onChange={(e) => {
                  setContact({ ...contact, name: e.target.value });
                  if (contactErrors.name) setContactErrors((prev) => ({ ...prev, name: false }));
                }}
                className={`w-full bg-gray-50 border ${contactErrors.name ? "border-red/50" : "border-gray-200"} rounded-xl px-4 py-3 text-sm outline-none focus:border-lyratech-purple`}
              />
              <input
                type="email"
                placeholder={t("emailPlaceholder")}
                value={contact.email}
                onChange={(e) => {
                  setContact({ ...contact, email: e.target.value });
                  if (contactErrors.email) setContactErrors((prev) => ({ ...prev, email: false }));
                }}
                className={`w-full bg-gray-50 border ${contactErrors.email ? "border-red/50" : "border-gray-200"} rounded-xl px-4 py-3 text-sm outline-none focus:border-lyratech-purple`}
              />
              <input
                type="text"
                placeholder={t("companyPlaceholder")}
                value={contact.company}
                onChange={(e) => setContact({ ...contact, company: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-lyratech-purple"
              />
              <input
                type="tel"
                placeholder={t("phonePlaceholder")}
                value={contact.phone}
                onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-lyratech-purple"
              />
            </div>
          ) : currentQuestion ? (
            <div className="flex flex-col gap-4">
              <h3 className="font-montserrat-bold text-gray-900 text-lg">{currentQuestion.label}</h3>
              {currentQuestion.help_text && (
                <p className="text-gray-400 text-sm -mt-2">{currentQuestion.help_text}</p>
              )}

              {currentQuestion.type === "open_text" ? (
                <textarea
                  rows={4}
                  placeholder={currentQuestion.placeholder || t("openAnswerPlaceholderFallback")}
                  value={answers[currentQuestion.key]?.[0] || ""}
                  onChange={(e) => handleOpenTextChange(currentQuestion.key, e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-lyratech-purple resize-none"
                />
              ) : (
                <div className="flex flex-col gap-2">
                  {currentQuestion.options.map((option) => {
                    const selected = (answers[currentQuestion.key] || []).includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          handleSelectOption(currentQuestion.key, option.value, currentQuestion.type === "multi_choice")
                        }
                        className={`text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                          selected
                            ? "bg-lyratech-purple text-white border-lyratech-purple"
                            : "bg-gray-50 text-gray-700 border-gray-200 hover:border-lyratech-purple/40"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          <div className={isLastStep ? "mt-2 flex justify-center" : "hidden"}>
            <div className="origin-center scale-[0.85]">
              <div className="w-[300px] max-w-full" ref={turnstileContainerRef} />
            </div>
          </div>

          {submitError && (
            <div className="mt-4 bg-[#fff8f8] border border-red/30 text-red rounded-lg px-4 py-2.5 text-sm">
              {submitError}
            </div>
          )}
        </div>

        {!loadingQuestions && !loadError && (
          <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
            <button
              type="button"
              onClick={isLastStep ? handleSubmit : handleNext}
              disabled={submitting}
              className="w-full bg-lyratech-purple text-white font-montserrat-bold py-3.5 rounded-xl hover:bg-button-dark-purple transition-colors disabled:opacity-60"
            >
              {isLastStep ? (submitting ? t("submittingButton") : t("submitButton")) : t("nextButton")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
