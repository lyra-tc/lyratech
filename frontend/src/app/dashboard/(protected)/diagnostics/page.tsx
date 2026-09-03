"use client";

import React, { useCallback, useEffect, useState } from "react";
import { HiOutlineSearch, HiOutlineTrash, HiOutlineEye, HiOutlineSwitchHorizontal, HiOutlineRefresh } from "react-icons/hi";
import LoadingDots from "@/components/shared/LoadingDots";
import DiagnosticSubmissionDetail from "@/components/Dashboard/DiagnosticSubmissionDetail";
import Dropdown from "@/components/shared/Dropdown";
import ProspectFormModal from "@/components/Dashboard/ProspectFormModal";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { diagnosticsApi } from "@/lib/api";
import { STATUS_COLORS } from "@/lib/prospectConstants";
import type { DiagnosticSubmissionListItem, ProspectCreate, Prospect } from "@/lib/api";

const SERVICE_LABELS: Record<string, string> = {
  process_automation: "Automatización de Procesos",
  fixed_price_project: "Proyecto a Precio Fijo",
  dedicated_team: "Equipo Dedicado",
};

const CONVERSION_LABELS: Record<string, string> = {
  pending: "Pendiente",
  prospect: "Prospecto",
  lost: "Perdido",
};

const CONVERSION_BADGE: Record<string, string> = {
  pending: "bg-gray-100 text-gray-500",
  prospect: STATUS_COLORS.qualified,
  lost: STATUS_COLORS.lost,
};

type ConversionFilter = "all" | "pending" | "prospect" | "lost";

const CONVERSION_FILTER_OPTIONS: { value: ConversionFilter; label: string }[] = [
  { value: "all", label: "Todas las conversiones" },
  { value: "pending", label: "Pendiente" },
  { value: "prospect", label: "Prospecto" },
  { value: "lost", label: "Perdido" },
];

const EMAIL_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  sent: "Enviado",
  delayed: "Retrasado",
  delivered: "Entregado",
  bounced: "Rebotado",
  complained: "Queja",
  failed: "Falló",
};

const EMAIL_STATUS_BADGE: Record<string, string> = {
  delivered: "bg-lyratech-green/10 text-lyratech-green",
  bounced: "bg-red/10 text-red",
  complained: "bg-red/10 text-red",
  failed: "bg-red/10 text-red",
};

export default function DiagnosticsPage() {
  const [submissions, setSubmissions] = useState<DiagnosticSubmissionListItem[]>([]);
  const [filtered, setFiltered] = useState<DiagnosticSubmissionListItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [conversionFilter, setConversionFilter] = useState<ConversionFilter>("all");
  const [converting, setConverting] = useState<{ submissionId: number; form: ProspectCreate } | null>(null);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [preparingId, setPreparingId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEscapeKey(() => setDeleteId(null), deleteId !== null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await diagnosticsApi.listSubmissions();
      setSubmissions(data);
    } catch {
      /* ignore — request() already redirects to login on 401 */
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshEmailStatuses = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await diagnosticsApi.refreshEmailStatus();
      setSubmissions(data);
      try {
        sessionStorage.setItem("diag_email_status_refreshed_at", String(Date.now()));
      } catch {
        /* sessionStorage unavailable — fine */
      }
    } catch {
      /* ignore */
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadData();
      if (cancelled) return;
      let lastRefreshed = 0;
      try {
        lastRefreshed = Number(sessionStorage.getItem("diag_email_status_refreshed_at")) || 0;
      } catch {
        /* sessionStorage unavailable */
      }
      // Skip the (slow) auto-refresh if we ran one in the last 2 minutes.
      if (Date.now() - lastRefreshed > 120_000) {
        refreshEmailStatuses();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadData, refreshEmailStatuses]);

  // Search + conversion filtering is client-side over the already-loaded list
  // (the submissions list is not paginated); the server params exist but aren't used here.
  useEffect(() => {
    let list = submissions;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.company?.toLowerCase().includes(q)
      );
    }
    if (conversionFilter !== "all") {
      list = list.filter((s) => s.conversion_status === conversionFilter);
    }
    setFiltered(list);
  }, [submissions, search, conversionFilter]);

  async function handleDelete(id: number) {
    try {
      await diagnosticsApi.removeSubmission(id);
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      /* ignore */
    } finally {
      setDeleteId(null);
    }
  }

  async function openConvert(submission: DiagnosticSubmissionListItem) {
    setConvertError(null);
    setPreparingId(submission.id);
    let phone = "";
    let summary = "";
    try {
      const detail = await diagnosticsApi.getSubmission(submission.id);
      phone = detail.phone || "";
      summary =
        typeof detail.llm_response_json?.summary === "string"
          ? (detail.llm_response_json.summary as string)
          : "";
    } catch {
      /* fall back to list data */
    }
    try {
      const serviceLabel =
        SERVICE_LABELS[submission.recommended_primary_service] ||
        submission.recommended_primary_service;
      const notes =
        `Desde Diagnóstico GO #${submission.id} · Servicio recomendado: ${serviceLabel}` +
        (summary ? ` · Resumen: ${summary}` : "");
      setConverting({
        submissionId: submission.id,
        form: {
          name: submission.name,
          email: submission.email,
          phone,
          company: submission.company || "",
          service: serviceLabel,
          status: "new",
          source: "Diagnóstico GO",
          notes,
        },
      });
    } finally {
      setPreparingId(null);
    }
  }

  async function handleConverted(prospect: Prospect) {
    if (!converting) return;
    setConvertError(null);
    const target = converting.submissionId;
    try {
      const updated = await diagnosticsApi.markConverted(target, prospect.id);
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === target
            ? { ...s, conversion_status: updated.conversion_status, converted_prospect_id: updated.converted_prospect_id }
            : s
        )
      );
    } catch {
      setConvertError(
        "El prospecto se creó correctamente, pero no se pudo marcar el diagnóstico como convertido. El prospecto ya existe en el pipeline — no lo conviertas de nuevo desde aquí; márcalo manualmente o contacta soporte."
      );
    }
  }

  const emptyMessage = search
    ? "No hay diagnósticos que coincidan con la búsqueda"
    : "Aún no hay diagnósticos";

  return (
    <>
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-montserrat-bold text-dark-blue text-2xl">Diagnósticos</h1>
            <p className="font-montserrat text-dark-blue/50 text-sm mt-0.5">
              Envíos del Diagnóstico GO desde la página de servicios
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-blue/30" size={16} />
            <input
              type="text"
              placeholder="Buscar por nombre, email o empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-black/10 rounded-xl text-sm font-montserrat text-dark-blue placeholder-dark-blue/30 outline-none focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple transition-all"
            />
          </div>
          <div className="w-full sm:w-56">
            <Dropdown
              value={conversionFilter}
              onChange={(v) => setConversionFilter(v as ConversionFilter)}
              options={CONVERSION_FILTER_OPTIONS}
            />
          </div>
          <button
            onClick={refreshEmailStatuses}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 border border-black/15 text-dark-blue/70 hover:text-dark-blue hover:bg-beige font-montserrat font-semibold px-4 py-2.5 rounded-xl transition-all text-sm disabled:opacity-50 whitespace-nowrap"
          >
            <HiOutlineRefresh size={16} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Actualizando..." : "Actualizar estados"}
          </button>
        </div>

        {convertError && (
          <div className="mb-5 rounded-xl border border-red/30 bg-red/10 px-4 py-3 text-sm font-montserrat text-red flex items-start justify-between gap-3">
            <span>{convertError}</span>
            <button onClick={() => setConvertError(null)} className="shrink-0 font-semibold hover:underline">
              Cerrar
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
          {loading ? (
            <div className="py-16 flex items-center justify-center">
              <LoadingDots />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-montserrat text-dark-blue/40 text-sm">{emptyMessage}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-black/5 bg-beige/60">
                    {["Nombre", "Empresa", "Servicio recomendado", "Idioma", "Correo", "Conversión", "Fecha", "Acciones"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-montserrat-bold text-dark-blue/50 text-xs uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {filtered.map((submission) => (
                    <tr key={submission.id} className="hover:bg-beige/40 transition-colors group">
                      <td className="px-4 py-3.5">
                        <p className="font-montserrat font-semibold text-dark-blue text-sm">{submission.name}</p>
                        <p className="font-montserrat text-dark-blue/40 text-xs">{submission.email}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-montserrat text-dark-blue/70 text-sm">{submission.company || "—"}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-montserrat text-dark-blue/60 text-sm">
                          {SERVICE_LABELS[submission.recommended_primary_service] || submission.recommended_primary_service}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-montserrat text-dark-blue/60 text-sm uppercase">{submission.locale}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`font-montserrat text-xs font-semibold px-2 py-1 rounded-full ${
                            EMAIL_STATUS_BADGE[submission.email_delivery_status] || "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {EMAIL_STATUS_LABELS[submission.email_delivery_status] || submission.email_delivery_status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`font-montserrat text-xs font-semibold px-2 py-1 rounded-full ${CONVERSION_BADGE[submission.conversion_status] || CONVERSION_BADGE.pending}`}>
                          {CONVERSION_LABELS[submission.conversion_status] || submission.conversion_status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-montserrat text-dark-blue/40 text-xs">
                          {new Date(submission.created_at).toLocaleDateString("es-MX", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          {submission.conversion_status === "pending" && (
                            <button
                              onClick={() => openConvert(submission)}
                              disabled={preparingId === submission.id}
                              className="p-1.5 rounded-lg hover:bg-lyratech-purple/10 text-lyratech-purple transition-colors disabled:opacity-50"
                              title="Convertir a prospecto"
                            >
                              <HiOutlineSwitchHorizontal size={15} />
                            </button>
                          )}
                          <button onClick={() => setViewingId(submission.id)} className="p-1.5 rounded-lg hover:bg-lyratech-purple/10 text-lyratech-purple transition-colors" title="Ver detalle">
                            <HiOutlineEye size={15} />
                          </button>
                          <button onClick={() => setDeleteId(submission.id)} className="p-1.5 rounded-lg hover:bg-red/10 text-red transition-colors" title="Eliminar">
                            <HiOutlineTrash size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {viewingId !== null && (
        <DiagnosticSubmissionDetail submissionId={viewingId} onClose={() => setViewingId(null)} />
      )}

      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setDeleteId(null)}
            className="fixed inset-0 bg-dark-blue/60 backdrop-blur-sm cursor-default"
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
            <h3 className="font-montserrat-bold text-dark-blue text-lg mb-2">Eliminar diagnóstico</h3>
            <p className="font-montserrat text-dark-blue/60 text-sm mb-6">
              ¿Estás seguro que deseas eliminar este diagnóstico? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 border border-black/15 text-dark-blue/70 font-montserrat font-semibold py-2.5 rounded-xl transition-all text-sm hover:bg-beige"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 bg-red hover:bg-dark-red text-white font-montserrat font-semibold py-2.5 rounded-xl transition-all text-sm"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {converting && (
        <ProspectFormModal
          editing={null}
          initialForm={converting.form}
          onClose={() => setConverting(null)}
          onSaved={handleConverted}
        />
      )}
    </>
  );
}
