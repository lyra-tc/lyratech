"use client";

import React, { useEffect, useMemo, useState } from "react";
import { HiOutlineSparkles, HiOutlineX } from "react-icons/hi";
import LoadingDots from "@/components/shared/LoadingDots";
import { diagnosticsApi } from "@/lib/api";
import type { DiagnosticSubmissionDetail as DiagnosticSubmissionDetailType } from "@/lib/api";

interface DiagnosticSubmissionDetailProps {
  submissionId: number;
  onClose: () => void;
}

const SERVICE_LABELS: Record<string, string> = {
  process_automation: "Automatizacion de Procesos",
  fixed_price_project: "Proyecto a Precio Fijo",
  dedicated_team: "Equipo Dedicado",
};

const LLM_FIELD_LABELS: Record<string, string> = {
  summary: "Resumen",
  headline: "Titular",
  why_it_fits: "Por que encaja",
  email_preview: "Preview de email",
  email_subject: "Asunto del email",
  next_step: "Siguiente paso",
  cta: "CTA",
};

function formatAnswers(answers: Record<string, string[]>): string {
  return Object.entries(answers ?? {})
    .map(([key, values]) => `${key}: ${Array.isArray(values) ? values.join(", ") : String(values)}`)
    .join("\n");
}

function formatServiceLabel(serviceKey: string): string {
  return SERVICE_LABELS[serviceKey] || serviceKey.replaceAll("_", " ");
}

function formatLlmFieldLabel(key: string): string {
  return LLM_FIELD_LABELS[key] || key.replaceAll("_", " ");
}

function formatLlmValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((item) => formatLlmValue(item)).join(", ");
  if (value && typeof value === "object") return JSON.stringify(value, null, 2);
  return "-";
}

export default function DiagnosticSubmissionDetail({
  submissionId,
  onClose,
}: DiagnosticSubmissionDetailProps) {
  const [detail, setDetail] = useState<DiagnosticSubmissionDetailType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    diagnosticsApi
      .getSubmission(submissionId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch(() => {
        /* ignore: request() already redirects to login on 401 */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  const sortedScores = useMemo(() => {
    if (!detail?.service_scores_json) return [];

    return Object.entries(detail.service_scores_json).sort((a, b) => b[1] - a[1]);
  }, [detail]);

  const llmEntries = useMemo(() => {
    if (!detail?.llm_response_json) return [];

    return Object.entries(detail.llm_response_json);
  }, [detail]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="fixed inset-0 cursor-default bg-dark-blue/60 backdrop-blur-sm"
      />

      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between border-b border-black/5 p-6">
          <h2 className="font-montserrat-bold text-lg text-dark-blue">
            {detail ? detail.name : "Diagnostico"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-dark-blue/50 transition-colors hover:bg-beige hover:text-dark-blue"
          >
            <HiOutlineX size={18} />
          </button>
        </div>

        {loading || !detail ? (
          <div className="flex justify-center p-10">
            <LoadingDots />
          </div>
        ) : (
          <div className="space-y-5 p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="mb-1 text-xs text-dark-blue/50 font-montserrat">Email</p>
                <p className="break-all text-sm text-dark-blue font-montserrat">{detail.email}</p>
              </div>
              <div>
                <p className="mb-1 text-xs text-dark-blue/50 font-montserrat">Telefono</p>
                <p className="text-sm text-dark-blue font-montserrat">{detail.phone || "-"}</p>
              </div>
              <div>
                <p className="mb-1 text-xs text-dark-blue/50 font-montserrat">Empresa</p>
                <p className="text-sm text-dark-blue font-montserrat">{detail.company || "-"}</p>
              </div>
              <div>
                <p className="mb-1 text-xs text-dark-blue/50 font-montserrat">Idioma</p>
                <p className="text-sm uppercase text-dark-blue font-montserrat">{detail.locale}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 border-t border-black/5 pt-4 md:grid-cols-2">
              <div className="rounded-2xl border border-lyratech-purple/15 bg-lyratech-purple/5 p-4">
                <p className="mb-1 text-xs text-dark-blue/50 font-montserrat">Servicio recomendado</p>
                <p className="text-base font-semibold text-dark-blue font-montserrat">
                  {formatServiceLabel(detail.recommended_primary_service)}
                </p>
              </div>
              <div className="rounded-2xl border border-black/8 bg-beige/50 p-4">
                <p className="mb-1 text-xs text-dark-blue/50 font-montserrat">Servicio secundario</p>
                <p className="text-base text-dark-blue font-montserrat">
                  {detail.recommended_secondary_service
                    ? formatServiceLabel(detail.recommended_secondary_service)
                    : "-"}
                </p>
              </div>
            </div>

            <div className="border-t border-black/5 pt-4">
              <p className="mb-3 text-xs text-dark-blue/50 font-montserrat">Puntajes por servicio</p>
              <div className="flex flex-wrap gap-3">
                {sortedScores.map(([serviceKey, score], index) => (
                  <div
                    key={serviceKey}
                    className={`min-w-[180px] rounded-2xl border px-4 py-3 ${
                      index === 0
                        ? "border-lyratech-purple/30 bg-lyratech-purple/10"
                        : "border-black/8 bg-beige/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-dark-blue font-montserrat">
                        {formatServiceLabel(serviceKey)}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold font-montserrat ${
                          index === 0
                            ? "bg-lyratech-purple text-white"
                            : "bg-dark-blue/8 text-dark-blue"
                        }`}
                      >
                        {score} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 border-t border-black/5 pt-4 md:grid-cols-2">
              <div>
                <p className="mb-1 text-xs text-dark-blue/50 font-montserrat">Respuestas originales</p>
                <pre className="max-h-48 overflow-y-auto rounded-xl bg-beige/60 p-3 whitespace-pre-wrap text-xs text-dark-blue font-montserrat">
                  {formatAnswers(detail.raw_answers_json)}
                </pre>
              </div>
              <div>
                <p className="mb-1 text-xs text-dark-blue/50 font-montserrat">Normalizado (ingles)</p>
                <pre className="max-h-48 overflow-y-auto rounded-xl bg-beige/60 p-3 whitespace-pre-wrap text-xs text-dark-blue font-montserrat">
                  {formatAnswers(detail.normalized_answers_en_json)}
                </pre>
              </div>
            </div>

            <div className="border-t border-black/5 pt-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-lyratech-purple/10 text-lyratech-purple">
                  <HiOutlineSparkles size={18} />
                </span>
                <div>
                  <p className="text-xs text-dark-blue/50 font-montserrat">
                    Respuesta del LLM ({detail.llm_status}
                    {detail.llm_model ? ` · ${detail.llm_model}` : ""})
                  </p>
                  <p className="text-sm font-semibold text-dark-blue font-montserrat">
                    Resumen generado
                  </p>
                </div>
              </div>

              {llmEntries.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {llmEntries.map(([key, value]) => (
                    <div
                      key={key}
                      className={`rounded-2xl border p-4 ${
                        key === "summary" || key === "headline"
                          ? "md:col-span-2 border-lyratech-purple/20 bg-lyratech-purple/5"
                          : "border-black/8 bg-white"
                      }`}
                    >
                      <p className="mb-2 text-xs uppercase tracking-[0.14em] text-dark-blue/45 font-montserrat">
                        {formatLlmFieldLabel(key)}
                      </p>
                      <div className="whitespace-pre-wrap text-sm leading-6 text-dark-blue font-montserrat">
                        {formatLlmValue(value)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-black/8 bg-beige/50 p-4 text-sm text-dark-blue/60 font-montserrat">
                  No hubo respuesta estructurada del LLM para este diagnostico.
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 border-t border-black/5 pt-4 md:grid-cols-2">
              <div>
                <p className="mb-1 text-xs text-dark-blue/40 font-montserrat">Correo al usuario</p>
                <p className="text-xs text-dark-blue/70 font-montserrat">
                  {detail.email_delivery_status}
                  {detail.email_delivery_error ? ` - ${detail.email_delivery_error}` : ""}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs text-dark-blue/40 font-montserrat">Creado</p>
                <p className="text-xs text-dark-blue/70 font-montserrat">
                  {new Date(detail.created_at).toLocaleDateString("es-MX", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
