"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { useLocale, useTranslations } from "next-intl";
import { HiOutlineX, HiChevronLeft } from "react-icons/hi";
import LoadingDots from "@/components/shared/LoadingDots";
import DiagnosticGoResult from "./Result";
import { getActiveDiagnosticQuestions, submitDiagnostic, ApiError } from "@/lib/api";
import type { DiagnosticActiveQuestion, DiagnosticSubmitResult } from "@/lib/api";
import WhiteLogo from "@/assets/images/Navbar/White_Logo.png";

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
  const tNav = useTranslations("navbar");
  const locale = useLocale();

  const [questions, setQuestions] = useState<DiagnosticActiveQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [contact, setContact] = useState<ContactFormState>({ name: "", email: "", company: "", phone: "" });
  const [contactErrors, setContactErrors] = useState<Partial<Record<keyof ContactFormState, boolean>>>({});
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsError, setTermsError] = useState(false);
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
  const stepsRemaining = Math.max(totalSteps - (stepIndex + 1), 0);
  const approxMinutesLeft = Math.max(1, stepsRemaining || 1);
  const sidebarStatusTitle = isContactStep
    ? t("sidebarStatusContact")
    : isLastStep
      ? t("sidebarStatusFinal")
      : t("sidebarStatusQuestion");
  const sidebarStatusText = isContactStep
    ? t("sidebarHintContact")
    : isLastStep
      ? t("sidebarHintFinal")
      : currentQuestion?.help_text || currentQuestion?.label || t("sidebarHintQuestion");

  const renderTurnstile = useCallback(() => {
    if (!turnstileContainerRef.current || !window.turnstile) return;

    const container = turnstileContainerRef.current;
    if (widgetIdRef.current && container.childElementCount > 0) return;
    if (widgetIdRef.current && container.childElementCount === 0) {
      widgetIdRef.current = null;
    }

    container.innerHTML = "";
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
    if (!acceptedTerms) {
      setTermsError(true);
      setSubmitError(t("errorTerms"));
      return;
    }
    setTermsError(false);
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
    setAcceptedTerms(false);
    setTermsError(false);
    widgetIdRef.current = null;
  }

  if (result) {
    return <DiagnosticGoResult result={result} onClose={onClose} onRestart={handleRestart} />;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 md:items-center">
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
      <div className="relative my-auto w-full max-w-[1080px] overflow-y-auto rounded-[24px] bg-[#f3f4fa] p-3 shadow-2xl animate-scale-in md:max-h-[90vh] md:overflow-hidden">
        <div className="grid min-h-0 gap-3 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)] md:h-full">
        <aside className="hidden lg:block relative overflow-hidden rounded-[20px] bg-gradient-to-br from-dark-blue via-lyratech-blue to-lyratech-purple text-white shadow-[0_18px_40px_rgba(0,2,14,0.18)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(198,201,229,0.20),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(95,102,174,0.55),transparent_38%)]" />
          <div className="absolute -top-10 left-0 h-28 w-28 rounded-full bg-white/6 blur-2xl" />
          <div className="absolute bottom-10 -right-6 h-28 w-28 rounded-full bg-lyratech-light-purple/10 blur-3xl" />
          <div className="relative z-10 flex h-full flex-col justify-center p-4">
            <div className="pr-2">
              <Image
                src={WhiteLogo}
                alt="Lyra Tech"
                width={54}
                height={54}
                className="mx-auto mb-5 h-auto w-[54px]"
                priority
              />
              <p className="text-center text-[10px] uppercase tracking-[0.24em] text-white/50">{t("sidebarEyebrow")}</p>
              <h3 className="mt-2 max-w-none font-montserrat-bold text-[18px] leading-[1.02]">{t("sidebarTitle")}</h3>
              <p className="mt-3 max-w-none text-[12px] leading-5 text-white/70">{t("sidebarDescription")}</p>

              <div className="mt-4 rounded-[18px] border border-white/10 bg-white/[0.08] p-3 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <p className="text-center text-[10px] uppercase tracking-[0.18em] text-white/48">{t("sidebarStatusLabel")}</p>
                <p className="mt-2 max-w-none font-montserrat-bold text-[16px] leading-snug">{sidebarStatusTitle}</p>
                <p className="mt-2 text-[12px] leading-5 text-white/70">{sidebarStatusText}</p>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-white/8 bg-black/10 p-2.5">
                    <p className="text-[9px] uppercase tracking-[0.14em] text-white/45">{t("sidebarProgressLabel")}</p>
                    <p className="mt-1.5 font-montserrat-bold text-[11px] leading-4">{t("stepOf", { current: stepIndex + 1, total: totalSteps })}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/10 p-2.5">
                    <p className="text-[9px] uppercase tracking-[0.14em] text-white/45">{t("sidebarEstimateLabel")}</p>
                    <p className="mt-1.5 font-montserrat-bold text-[11px] leading-4">{t("sidebarEstimateValue", { minutes: approxMinutesLeft })}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-h-0 flex-col rounded-[20px] bg-white shadow-[0_10px_30px_rgba(39,42,51,0.06)] max-w-[760px] md:overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-2">
              {stepIndex > 0 && (
                <button onClick={handleBack} className="text-gray-400 hover:text-gray-700 p-1" aria-label={t("backButton")}>
                  <HiChevronLeft size={20} />
                </button>
              )}
              <div>
                <p className="font-montserrat-bold text-gray-900 text-base">{t("modalTitle")}</p>
                <p className="hidden sm:block text-xs text-gray-400 mt-1">{t("sidebarEstimateValue", { minutes: approxMinutesLeft })}</p>
              </div>
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
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-xs text-gray-400">
                  {t("stepOf", { current: stepIndex + 1, total: totalSteps })}
                </p>
                <p className="md:hidden text-[11px] text-gray-400">{t("sidebarEstimateValue", { minutes: approxMinutesLeft })}</p>
              </div>
            </div>
          )}

          <div className="flex-1 p-6 md:overflow-y-auto">
            {loadingQuestions ? (
              <div className="flex justify-center py-16">
                <LoadingDots />
              </div>
            ) : loadError ? (
              <p className="text-red text-sm text-center py-16">{loadError}</p>
            ) : isContactStep ? (
              <div className="mx-auto flex w-full max-w-[620px] flex-col gap-4">
                <div className="lg:hidden rounded-2xl border border-white/10 bg-gradient-to-br from-dark-blue via-lyratech-blue to-lyratech-purple p-4 text-white shadow-lg">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/55">{t("sidebarStatusLabel")}</p>
                  <p className="mt-2 font-montserrat-bold text-lg">{sidebarStatusTitle}</p>
                  <p className="mt-1 text-sm leading-5 text-white/72">{sidebarStatusText}</p>
                </div>
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
              <div className="mx-auto flex w-full max-w-[620px] flex-col gap-4">
                <div className="lg:hidden rounded-2xl border border-white/10 bg-gradient-to-br from-dark-blue via-lyratech-blue to-lyratech-purple p-4 text-white shadow-lg">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/55">{t("sidebarStatusLabel")}</p>
                  <p className="mt-2 font-montserrat-bold text-lg">{sidebarStatusTitle}</p>
                  <p className="mt-1 text-sm leading-5 text-white/72">{sidebarStatusText}</p>
                </div>
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

            {isLastStep && !loadingQuestions && !loadError && (
              <div className="mx-auto mt-4 w-full max-w-[620px]">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => {
                      setAcceptedTerms(e.target.checked);
                      if (e.target.checked) setTermsError(false);
                    }}
                    className={`mt-0.5 h-4 w-4 flex-shrink-0 rounded border ${
                      termsError ? "border-red/60" : "border-gray-300"
                    } text-lyratech-purple focus:ring-lyratech-purple`}
                  />
                  <span className="text-xs text-gray-500 leading-relaxed">
                    {t.rich("acceptTerms", {
                      link: (chunks) => (
                        <Link
                          href={tNav("legalLink")}
                          target="_blank"
                          className="text-lyratech-purple font-semibold underline hover:text-button-dark-purple"
                        >
                          {chunks}
                        </Link>
                      ),
                    })}
                  </span>
                </label>
              </div>
            )}

            <div className={isLastStep ? "mt-2 flex min-h-[74px] justify-center" : "hidden"}>
              <div className="flex w-full justify-center">
                <div className="min-h-[65px] w-full max-w-[320px]" ref={turnstileContainerRef} />
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
                className="mx-auto flex w-full max-w-[620px] items-center justify-center gap-2 bg-lyratech-purple py-3.5 text-white font-montserrat-bold rounded-xl hover:bg-button-dark-purple transition-colors disabled:opacity-60"
              >
                {isLastStep && submitting ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/35 border-t-white animate-spin" />
                    <span>{t("submittingButton")}</span>
                  </>
                ) : isLastStep ? (
                  t("submitButton")
                ) : (
                  t("nextButton")
                )}
              </button>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
