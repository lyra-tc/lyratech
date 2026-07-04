"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlinePencil,
  HiOutlineTrash,
} from "react-icons/hi";
import DashboardShell from "@/components/Dashboard/DashboardShell";
import LeadFormModal from "@/components/Dashboard/LeadFormModal";
import LeadViewModal from "@/components/Dashboard/LeadViewModal";
import LoadingDots from "@/components/shared/LoadingDots";
import Dropdown from "@/components/shared/Dropdown";
import { leadsApi, auth, getCachedUser } from "@/lib/api";
import type { Lead, LeadCreate, LeadStatus, UserInfo } from "@/lib/api";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/leadConstants";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Todos los estados" },
  ...(Object.keys(STATUS_LABELS) as LeadStatus[]).map((s) => ({ value: s, label: STATUS_LABELS[s] })),
];

const EMPTY_FORM: LeadCreate = {
  name: "",
  email: "",
  phone: "",
  company: "",
  status: "new",
  source: "",
  notes: "",
};

export default function LeadsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(() => getCachedUser());
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filtered, setFiltered] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [viewing, setViewing] = useState<Lead | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [userData, leadsData] = await Promise.all([auth.me(), leadsApi.list()]);
      setUser(userData);
      setLeads(leadsData);
    } catch {
      router.push("/dashboard/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!localStorage.getItem("lyratech_token")) {
      router.push("/dashboard/login");
      return;
    }
    loadData();
  }, [loadData, router]);

  useEffect(() => {
    let list = leads;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q) ||
          l.company?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") list = list.filter((l) => l.status === statusFilter);
    setFiltered(list);
  }, [leads, search, statusFilter]);

  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(lead: Lead) {
    setEditing(lead);
    setShowModal(true);
  }

  function handleSaved(saved: Lead) {
    setLeads((prev) =>
      prev.some((l) => l.id === saved.id)
        ? prev.map((l) => (l.id === saved.id ? saved : l))
        : [saved, ...prev]
    );
  }

  async function handleDelete(id: number) {
    try {
      await leadsApi.remove(id);
      setLeads((prev) => prev.filter((l) => l.id !== id));
    } catch { /* ignore */ } finally {
      setDeleteId(null);
    }
  }

  const stats = {
    total: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    qualified: leads.filter((l) => l.status === "qualified").length,
    closed: leads.filter((l) => l.status === "closed").length,
  };

  const emptyMessage =
    search || statusFilter !== "all"
      ? "No hay leads que coincidan con la búsqueda"
      : "Aún no hay leads. ¡Crea el primero!";

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
              {["Nombre", "Empresa", "Contacto", "Estado", "Fuente", "Acciones"].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-montserrat-bold text-dark-blue/50 text-xs uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {filtered.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => setViewing(lead)}
                className="hover:bg-beige/40 transition-colors group cursor-pointer"
              >
                <td className="px-4 py-3.5">
                  <p className="font-montserrat font-semibold text-dark-blue text-sm">{lead.name}</p>
                  <p className="font-montserrat text-dark-blue/40 text-xs mt-0.5">
                    {new Date(lead.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </td>
                <td className="px-4 py-3.5">
                  <span className="font-montserrat text-dark-blue/70 text-sm">{lead.company || "—"}</span>
                </td>
                <td className="px-4 py-3.5">
                  <p className="font-montserrat text-dark-blue/70 text-sm">{lead.email || "—"}</p>
                  <p className="font-montserrat text-dark-blue/40 text-xs">{lead.phone || ""}</p>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-montserrat font-semibold border ${STATUS_COLORS[lead.status]}`}>
                    {STATUS_LABELS[lead.status]}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="font-montserrat text-dark-blue/60 text-sm">{lead.source || "—"}</span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(lead); }}
                      className="p-1.5 rounded-lg hover:bg-lyratech-purple/10 text-lyratech-purple transition-colors"
                      title="Editar"
                    >
                      <HiOutlinePencil size={15} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteId(lead.id); }}
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
    <DashboardShell user={user}>
      {/* Page content */}
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-montserrat-bold text-dark-blue text-2xl">Leads</h1>
            <p className="font-montserrat text-dark-blue/50 text-sm mt-0.5">
              Gestiona tus prospectos y clientes potenciales
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-lyratech-purple hover:bg-button-light-purple text-white font-montserrat font-semibold px-4 py-2.5 rounded-xl transition-all duration-200 shadow-button hover:scale-[1.02] text-sm"
          >
            <HiOutlinePlus size={18} />
            <span className="hidden sm:block">Nuevo lead</span>
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
              onChange={(v) => setStatusFilter(v as LeadStatus | "all")}
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
      {viewing && (
        <LeadViewModal lead={viewing} onClose={() => setViewing(null)} />
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <LeadFormModal
          editing={editing}
          initialForm={EMPTY_FORM}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}

      {/* Delete Confirm */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-dark-blue/60 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
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
    </DashboardShell>
  );
}
