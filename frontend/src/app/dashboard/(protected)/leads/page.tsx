"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { HiOutlinePlus, HiOutlineSearch, HiOutlineTrash, HiOutlinePencil, HiOutlineSwitchHorizontal, HiOutlineUpload } from "react-icons/hi";
import ProspectFormModal from "@/components/Dashboard/ProspectFormModal";
import LeadFormModal from "@/components/Dashboard/LeadFormModal";
import LeadImportModal from "@/components/Dashboard/LeadImportModal";
import LoadingDots from "@/components/shared/LoadingDots";
import Pagination from "@/components/shared/Pagination";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { leadsApi } from "@/lib/api";
import type { Lead, ProspectCreate, LeadImportResult } from "@/lib/api";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const debouncedSearch = useDebouncedValue(search);
  const reqId = useRef(0);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [converting, setConverting] = useState<Lead | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);

  useEscapeKey(() => setDeleteId(null), deleteId !== null);
  useScrollLock(deleteId !== null);

  const loadData = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    try {
      const data = await leadsApi.list({ page, pageSize, search: debouncedSearch });
      if (id === reqId.current) {
        setLeads(data.items);
        setTotal(data.total);
      }
    } catch {
      /* ignore — request() already redirects to login on 401 */
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [page, pageSize, debouncedSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleDelete(id: number) {
    try {
      await leadsApi.remove(id);
      await loadData();
    } catch { /* ignore */ } finally {
      setDeleteId(null);
    }
  }

  async function handleConverted(leadId: number) {
    try {
      await leadsApi.remove(leadId);
    } catch { /* ignore */ }
    await loadData();
  }

  function convertInitialForm(lead: Lead): ProspectCreate {
    const notesParts = [
      lead.message?.trim() || "",
      lead.address?.trim() ? `Dirección: ${lead.address.trim()}` : "",
    ].filter(Boolean);
    return {
      name: lead.name,
      email: lead.email || "",
      phone: lead.phone || "",
      company: lead.company || "",
      industry: lead.industry || "",
      service: lead.service || "",
      status: "meeting_to_schedule",
      source: "Web",
      notes: notesParts.join("\n\n"),
    };
  }

  function handleSaved() {
    loadData();
    setShowCreate(false);
    setEditing(null);
  }

  function handleImported(result: LeadImportResult) {
    if (result.inserted > 0) loadData();
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 bg-lyratech-purple hover:bg-button-light-purple text-white font-montserrat font-semibold px-4 py-2.5 rounded-xl transition-all duration-200 shadow-button hover:scale-[1.02] text-sm"
            >
              <HiOutlineUpload size={18} />
              <span className="hidden sm:block">Importar leads</span>
            </button>
            <button
              onClick={() => { setEditing(null); setShowCreate(true); }}
              className="flex items-center gap-2 bg-lyratech-purple hover:bg-button-light-purple text-white font-montserrat font-semibold px-4 py-2.5 rounded-xl transition-all duration-200 shadow-button hover:scale-[1.02] text-sm"
            >
              <HiOutlinePlus size={18} />
              <span className="hidden sm:block">Nuevo lead</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-blue/30" size={16} />
            <input
              type="text"
              placeholder="Buscar por nombre, email o empresa..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-black/10 rounded-xl text-sm font-montserrat text-dark-blue placeholder-dark-blue/30 outline-none focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple transition-all"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
          {loading ? (
            <div className="py-16 flex items-center justify-center">
              <LoadingDots />
            </div>
          ) : leads.length === 0 ? (
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
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-beige/40 transition-colors group">
                      <td className="px-4 py-3.5">
                        <p className="font-montserrat font-semibold text-dark-blue text-sm">{lead.name}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-montserrat text-dark-blue/70 text-sm">{lead.company || "—"}</p>
                        {lead.industry && (
                          <p className="font-montserrat text-dark-blue/40 text-xs mt-0.5">{lead.industry}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-montserrat text-dark-blue/70 text-sm">{lead.email || "—"}</p>
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
                          <button onClick={() => { setShowCreate(false); setEditing(lead); }} className="p-1.5 rounded-lg hover:bg-lyratech-purple/10 text-lyratech-purple transition-colors" title="Editar">
                            <HiOutlinePencil size={15} />
                          </button>
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

        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        />
      </div>

      {(showCreate || editing) && (
        <LeadFormModal
          editing={editing}
          onClose={() => { setShowCreate(false); setEditing(null); }}
          onSaved={handleSaved}
        />
      )}

      {showImport && (
        <LeadImportModal
          onClose={() => setShowImport(false)}
          onImported={handleImported}
        />
      )}

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
