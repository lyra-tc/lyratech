"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlinePencil,
  HiOutlineTrash,
} from "react-icons/hi";
import ProspectFormModal from "@/components/Dashboard/ProspectFormModal";
import ProspectViewModal from "@/components/Dashboard/ProspectViewModal";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import LoadingDots from "@/components/shared/LoadingDots";
import Dropdown from "@/components/shared/Dropdown";
import { prospectsApi } from "@/lib/api";
import type { Prospect, ProspectCreate, ProspectStatus } from "@/lib/api";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/prospectConstants";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Todos los estados" },
  ...(Object.keys(STATUS_LABELS) as ProspectStatus[]).map((s) => ({ value: s, label: STATUS_LABELS[s] })),
];

const EMPTY_FORM: ProspectCreate = {
  name: "",
  email: "",
  phone: "",
  company: "",
  service: "",
  status: "new",
  source: "",
  notes: "",
};

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [filtered, setFiltered] = useState<Prospect[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProspectStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Prospect | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [viewing, setViewing] = useState<Prospect | null>(null);

  useEscapeKey(() => setDeleteId(null), deleteId !== null);

  const loadData = useCallback(async () => {
    try {
      const data = await prospectsApi.list();
      setProspects(data);
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
    let list = prospects;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.email?.toLowerCase().includes(q) ||
          p.company?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") list = list.filter((p) => p.status === statusFilter);
    setFiltered(list);
  }, [prospects, search, statusFilter]);

  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(prospect: Prospect) {
    setEditing(prospect);
    setShowModal(true);
  }

  function handleSaved(saved: Prospect) {
    setProspects((prev) =>
      prev.some((p) => p.id === saved.id)
        ? prev.map((p) => (p.id === saved.id ? saved : p))
        : [saved, ...prev]
    );
  }

  async function handleDelete(id: number) {
    try {
      await prospectsApi.remove(id);
      setProspects((prev) => prev.filter((p) => p.id !== id));
    } catch { /* ignore */ } finally {
      setDeleteId(null);
    }
  }

  const stats = {
    total: prospects.length,
    new: prospects.filter((p) => p.status === "new").length,
    qualified: prospects.filter((p) => p.status === "qualified").length,
    closed: prospects.filter((p) => p.status === "closed").length,
  };

  const emptyMessage =
    search || statusFilter !== "all"
      ? "No hay prospectos que coincidan con la búsqueda"
      : "Aún no hay prospectos. ¡Crea el primero!";

  let tableContent: React.ReactNode;
  if (loading) {
    tableContent = (
      <div className="py-16 flex items-center justify-center">
        <LoadingDots />
      </div>
    );
  } else if (filtered.length === 0) {
    tableContent = (
      <div className="py-16 text-center">
        <p className="font-montserrat text-dark-blue/40 text-sm">{emptyMessage}</p>
      </div>
    );
  } else {
    tableContent = (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-black/5 bg-beige/60">
              {["Nombre", "Empresa", "Contacto", "Servicio", "Estado", "Fuente", "Acciones"].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-montserrat-bold text-dark-blue/50 text-xs uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {filtered.map((prospect) => (
              <tr
                key={prospect.id}
                onClick={() => setViewing(prospect)}
                className="hover:bg-beige/40 transition-colors group cursor-pointer"
              >
                <td className="px-4 py-3.5">
                  <p className="font-montserrat font-semibold text-dark-blue text-sm">{prospect.name}</p>
                  <p className="font-montserrat text-dark-blue/40 text-xs mt-0.5">
                    {new Date(prospect.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </td>
                <td className="px-4 py-3.5">
                  <span className="font-montserrat text-dark-blue/70 text-sm">{prospect.company || "—"}</span>
                </td>
                <td className="px-4 py-3.5">
                  <p className="font-montserrat text-dark-blue/70 text-sm">{prospect.email || "—"}</p>
                  <p className="font-montserrat text-dark-blue/40 text-xs">{prospect.phone || ""}</p>
                </td>
                <td className="px-4 py-3.5">
                  <span className="font-montserrat text-dark-blue/60 text-sm">{prospect.service || "—"}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-montserrat font-semibold border ${STATUS_COLORS[prospect.status]}`}>
                    {STATUS_LABELS[prospect.status]}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="font-montserrat text-dark-blue/60 text-sm">{prospect.source || "—"}</span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(prospect); }}
                      className="p-1.5 rounded-lg hover:bg-lyratech-purple/10 text-lyratech-purple transition-colors"
                      title="Editar"
                    >
                      <HiOutlinePencil size={15} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteId(prospect.id); }}
                      className="p-1.5 rounded-lg hover:bg-red/10 text-red transition-colors"
                      title="Eliminar"
                    >
                      <HiOutlineTrash size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      {/* Page content */}
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-montserrat-bold text-dark-blue text-2xl">Prospectos</h1>
            <p className="font-montserrat text-dark-blue/50 text-sm mt-0.5">
              Pipeline de prospectos
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-lyratech-purple hover:bg-button-light-purple text-white font-montserrat font-semibold px-4 py-2.5 rounded-xl transition-all duration-200 shadow-button hover:scale-[1.02] text-sm"
          >
            <HiOutlinePlus size={18} />
            <span className="hidden sm:block">Nuevo prospecto</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total", value: stats.total, color: "bg-dark-blue" },
            { label: "Nuevos", value: stats.new, color: "bg-blue" },
            { label: "Calificados", value: stats.qualified, color: "bg-lyratech-green" },
            { label: "Cerrados", value: stats.closed, color: "bg-lyratech-purple" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl p-4 shadow-sm border border-black/5">
              <p className="font-montserrat text-dark-blue/50 text-xs mb-1">{label}</p>
              <div className="flex items-end gap-2">
                <span className="font-montserrat-bold text-dark-blue text-3xl">{value}</span>
                <div className={`w-2 h-2 rounded-full ${color} mb-1.5`} />
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
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
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as ProspectStatus | "all")}
              options={STATUS_FILTER_OPTIONS}
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
          {tableContent}
        </div>
      </div>

      {/* View Modal */}
      {viewing && <ProspectViewModal prospect={viewing} onClose={() => setViewing(null)} />}

      {/* Create / Edit Modal */}
      {showModal && (
        <ProspectFormModal
          editing={editing}
          initialForm={EMPTY_FORM}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}

      {/* Delete Confirm */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setDeleteId(null)}
            className="fixed inset-0 bg-dark-blue/60 backdrop-blur-sm cursor-default"
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
            <h3 className="font-montserrat-bold text-dark-blue text-lg mb-2">Eliminar prospecto</h3>
            <p className="font-montserrat text-dark-blue/60 text-sm mb-6">
              ¿Estás seguro que deseas eliminar este prospecto? Esta acción no se puede deshacer.
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
