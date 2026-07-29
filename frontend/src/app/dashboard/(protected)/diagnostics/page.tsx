"use client";

import React, { useCallback, useEffect, useState } from "react";
import { HiOutlineSearch, HiOutlineTrash, HiOutlineEye } from "react-icons/hi";
import LoadingDots from "@/components/shared/LoadingDots";
import DiagnosticSubmissionDetail from "@/components/Dashboard/DiagnosticSubmissionDetail";
import { diagnosticsApi } from "@/lib/api";
import type { DiagnosticSubmissionListItem } from "@/lib/api";

const SERVICE_LABELS: Record<string, string> = {
  process_automation: "Automatización de Procesos",
  fixed_price_project: "Proyecto a Precio Fijo",
  dedicated_team: "Equipo Dedicado",
};

const EMAIL_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  sent: "Enviado",
  failed: "Falló",
};

export default function DiagnosticsPage() {
  const [submissions, setSubmissions] = useState<DiagnosticSubmissionListItem[]>([]);
  const [filtered, setFiltered] = useState<DiagnosticSubmissionListItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

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

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    setFiltered(list);
  }, [submissions, search]);

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
        </div>

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
                    {["Nombre", "Empresa", "Servicio recomendado", "Idioma", "Correo", "Fecha", "Acciones"].map((h) => (
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
                            submission.email_delivery_status === "sent"
                              ? "bg-lyratech-green/10 text-lyratech-green"
                              : submission.email_delivery_status === "failed"
                              ? "bg-red/10 text-red"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {EMAIL_STATUS_LABELS[submission.email_delivery_status] || submission.email_delivery_status}
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
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
    </>
  );
}
