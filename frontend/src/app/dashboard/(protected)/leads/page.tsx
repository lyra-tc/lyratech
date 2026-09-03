"use client";

import React, { useState, useEffect, useCallback } from "react";
import { HiOutlineSearch, HiOutlineTrash, HiOutlineSwitchHorizontal } from "react-icons/hi";
import ProspectFormModal from "@/components/Dashboard/ProspectFormModal";
import LoadingDots from "@/components/shared/LoadingDots";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { leadsApi } from "@/lib/api";
import type { Lead, ProspectCreate } from "@/lib/api";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filtered, setFiltered] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [converting, setConverting] = useState<Lead | null>(null);

  useEscapeKey(() => setDeleteId(null), deleteId !== null);

  const loadData = useCallback(async () => {
    try {
      const data = await leadsApi.list();
      setLeads(data);
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
    let list = leads;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          l.company?.toLowerCase().includes(q)
      );
    }
    setFiltered(list);
  }, [leads, search]);

  async function handleDelete(id: number) {
    try {
      await leadsApi.remove(id);
      setLeads((prev) => prev.filter((l) => l.id !== id));
    } catch { /* ignore */ } finally {
      setDeleteId(null);
    }
  }

  async function handleConverted(leadId: number) {
    try {
      await leadsApi.remove(leadId);
    } catch { /* ignore */ }
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
  }

  function convertInitialForm(lead: Lead): ProspectCreate {
    return {
      name: lead.name,
      email: lead.email,
      phone: lead.phone || "",
      company: lead.company || "",
      service: lead.service || "",
      status: "meeting_to_schedule",
      source: "Web",
      notes: lead.message || "",
    };
  }

  const emptyMessage = search
    ? "No hay leads que coincidan con la búsqueda"
    : "Aún no hay leads";

  return (
    <>
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-montserrat-bold text-dark-blue text-2xl">Leads</h1>
            <p className="font-montserrat text-dark-blue/50 text-sm mt-0.5">
              Envíos del formulario de contacto del sitio web
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
                    {["Nombre", "Empresa", "Contacto", "Servicio", "Mensaje", "Fecha", "Acciones"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-montserrat-bold text-dark-blue/50 text-xs uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {filtered.map((lead) => (
                    <tr key={lead.id} className="hover:bg-beige/40 transition-colors group">
                      <td className="px-4 py-3.5">
                        <p className="font-montserrat font-semibold text-dark-blue text-sm">{lead.name}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-montserrat text-dark-blue/70 text-sm">{lead.company || "—"}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-montserrat text-dark-blue/70 text-sm">{lead.email}</p>
                        <p className="font-montserrat text-dark-blue/40 text-xs">{lead.phone || ""}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-montserrat text-dark-blue/60 text-sm">{lead.service || "—"}</span>
                      </td>
                      <td className="px-4 py-3.5 max-w-xs">
                        <p className="font-montserrat text-dark-blue/60 text-sm truncate" title={lead.message || ""}>
                          {lead.message || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-montserrat text-dark-blue/40 text-xs">
                          {new Date(lead.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setConverting(lead)} className="p-1.5 rounded-lg hover:bg-lyratech-purple/10 text-lyratech-purple transition-colors" title="Convertir a prospecto">
                            <HiOutlineSwitchHorizontal size={15} />
                          </button>
                          <button onClick={() => setDeleteId(lead.id)} className="p-1.5 rounded-lg hover:bg-red/10 text-red transition-colors" title="Eliminar">
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

      {converting && (
        <ProspectFormModal
          editing={null}
          initialForm={convertInitialForm(converting)}
          onClose={() => setConverting(null)}
          onSaved={() => handleConverted(converting.id)}
        />
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
            <h3 className="font-montserrat-bold text-dark-blue text-lg mb-2">Eliminar lead</h3>
            <p className="font-montserrat text-dark-blue/60 text-sm mb-6">
              ¿Estás seguro que deseas eliminar este lead? Esta acción no se puede deshacer.
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
