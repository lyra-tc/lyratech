"use client";

import React, { useEffect, useState } from "react";
import { HiOutlineX } from "react-icons/hi";
import LoadingDots from "@/components/shared/LoadingDots";
import { diagnosticsApi } from "@/lib/api";
import type { DiagnosticSubmissionDetail as DiagnosticSubmissionDetailType } from "@/lib/api";

interface DiagnosticSubmissionDetailProps {
  submissionId: number;
  onClose: () => void;
}

const SERVICE_LABELS: Record<string, string> = {
  process_automation: "Automatización de Procesos",
  fixed_price_project: "Proyecto a Precio Fijo",
  dedicated_team: "Equipo Dedicado",
};

function formatAnswers(answers: Record<string, string[]>): string {
  return Object.entries(answers ?? {})
    .map(([key, values]) => `${key}: ${Array.isArray(values) ? values.join(", ") : String(values)}`)
    .join("\n");
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
        /* ignore — request() already redirects to login on 401 */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="fixed inset-0 bg-dark-blue/60 backdrop-blur-sm cursor-default"
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-black/5">
          <h2 className="font-montserrat-bold text-dark-blue text-lg">
            {detail ? detail.name : "Diagnóstico"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-beige text-dark-blue/50 hover:text-dark-blue transition-colors">
            <HiOutlineX size={18} />
          </button>
        </div>

        {loading || !detail ? (
          <div className="p-10 flex justify-center">
            <LoadingDots />
          </div>
        ) : (
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-montserrat text-dark-blue/50 text-xs mb-1">Email</p>
                <p className="font-montserrat text-dark-blue text-sm break-all">{detail.email}</p>
              </div>
              <div>
                <p className="font-montserrat text-dark-blue/50 text-xs mb-1">Teléfono</p>
                <p className="font-montserrat text-dark-blue text-sm">{detail.phone || "—"}</p>
              </div>
              <div>
                <p className="font-montserrat text-dark-blue/50 text-xs mb-1">Empresa</p>
                <p className="font-montserrat text-dark-blue text-sm">{detail.company || "—"}</p>
              </div>
              <div>
                <p className="font-montserrat text-dark-blue/50 text-xs mb-1">Idioma</p>
                <p className="font-montserrat text-dark-blue text-sm uppercase">{detail.locale}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-black/5">
              <div>
                <p className="font-montserrat text-dark-blue/50 text-xs mb-1">Servicio recomendado</p>
                <p className="font-montserrat text-dark-blue text-sm font-semibold">
                  {SERVICE_LABELS[detail.recommended_primary_service] || detail.recommended_primary_service}
                </p>
              </div>
              <div>
                <p className="font-montserrat text-dark-blue/50 text-xs mb-1">Servicio secundario</p>
                <p className="font-montserrat text-dark-blue text-sm">
                  {detail.recommended_secondary_service
                    ? SERVICE_LABELS[detail.recommended_secondary_service] || detail.recommended_secondary_service
                    : "—"}
                </p>
              </div>
            </div>

            <div>
              <p className="font-montserrat text-dark-blue/50 text-xs mb-1">Puntajes por servicio</p>
              <pre className="font-montserrat text-dark-blue text-xs bg-beige/60 rounded-xl p-3 whitespace-pre-wrap">
                {JSON.stringify(detail.service_scores_json, null, 2)}
              </pre>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-black/5">
              <div>
                <p className="font-montserrat text-dark-blue/50 text-xs mb-1">Respuestas originales</p>
                <pre className="font-montserrat text-dark-blue text-xs bg-beige/60 rounded-xl p-3 whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {formatAnswers(detail.raw_answers_json)}
                </pre>
              </div>
              <div>
                <p className="font-montserrat text-dark-blue/50 text-xs mb-1">Normalizado (inglés)</p>
                <pre className="font-montserrat text-dark-blue text-xs bg-beige/60 rounded-xl p-3 whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {formatAnswers(detail.normalized_answers_en_json)}
                </pre>
              </div>
            </div>

            <div className="pt-4 border-t border-black/5">
              <p className="font-montserrat text-dark-blue/50 text-xs mb-1">
                Respuesta del LLM ({detail.llm_status}{detail.llm_model ? ` · ${detail.llm_model}` : ""})
              </p>
              <pre className="font-montserrat text-dark-blue text-xs bg-beige/60 rounded-xl p-3 whitespace-pre-wrap max-h-56 overflow-y-auto">
                {JSON.stringify(detail.llm_response_json, null, 2)}
              </pre>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-black/5">
              <div>
                <p className="font-montserrat text-dark-blue/40 text-xs mb-1">Correo al usuario</p>
                <p className="font-montserrat text-dark-blue/70 text-xs">
                  {detail.email_delivery_status}
                  {detail.email_delivery_error ? ` — ${detail.email_delivery_error}` : ""}
                </p>
              </div>
              <div>
                <p className="font-montserrat text-dark-blue/40 text-xs mb-1">Creado</p>
                <p className="font-montserrat text-dark-blue/70 text-xs">
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
