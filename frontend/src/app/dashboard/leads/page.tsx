"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineX,
  HiOutlineCheck,
} from "react-icons/hi";
import DashboardShell from "@/components/Dashboard/DashboardShell";
import { leadsApi, auth } from "@/lib/api";
import type { Lead, LeadCreate, LeadStatus, UserInfo } from "@/lib/api";

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  qualified: "Calificado",
  proposal: "Propuesta",
  closed: "Cerrado",
  lost: "Perdido",
};

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-blue/20 text-blue border-blue/30",
  contacted: "bg-lyratech-purple/20 text-lyratech-purple border-lyratech-purple/30",
  qualified: "bg-lyratech-green/20 text-lyratech-green border-lyratech-green/30",
  proposal: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
  closed: "bg-lyratech-green/30 text-lyratech-green border-lyratech-green/40",
  lost: "bg-red/20 text-red border-red/30",
};

const SOURCES = ["Web", "Referido", "Redes sociales", "Email", "Evento", "Otro"];
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
  const [user, setUser] = useState<UserInfo | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filtered, setFiltered] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [form, setForm] = useState<LeadCreate>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
    setForm(EMPTY_FORM);
    setFormError("");
    setFieldErrors({});
    setShowModal(true);
  }

  function openEdit(lead: Lead) {
    setEditing(lead);
    setForm({
      name: lead.name,
      email: lead.email || "",
      phone: lead.phone || "",
      company: lead.company || "",
      status: lead.status,
      source: lead.source || "",
      notes: lead.notes || "",
    });
    setFormError("");
    setFieldErrors({});
    setShowModal(true);
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};
    const email = form.email ?? "";
    const phone = form.phone ?? "";
    if (!form.name.trim()) errors.name = "El nombre es requerido";
    if (!email.trim() && !phone.trim())
      errors.contact = "Ingresa al menos un email o teléfono";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.email = "Ingresa un correo válido";
    if (!form.source) errors.source = "La fuente es requerida";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave() {
    if (!validateForm()) return;
    setSaving(true);
    setFormError("");
    try {
      if (editing) {
        const updated = await leadsApi.update(editing.id, form);
        setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      } else {
        const created = await leadsApi.create(form);
        setLeads((prev) => [created, ...prev]);
      }
      setShowModal(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-blue flex items-center justify-center">
        <div className="text-white/60 font-montserrat text-sm animate-pulse">Cargando...</div>
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
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "all")}
            className="bg-white border border-black/10 rounded-xl px-3 py-2.5 text-sm font-montserrat text-dark-blue outline-none focus:border-lyratech-purple transition-all"
          >
            <option value="all">Todos los estados</option>
            {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-montserrat text-dark-blue/40 text-sm">
                {search || statusFilter !== "all"
                  ? "No hay leads que coincidan con la búsqueda"
                  : "Aún no hay leads. ¡Crea el primero!"}
              </p>
            </div>
          ) : (
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
                    <tr key={lead.id} className="hover:bg-beige/40 transition-colors group">
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
                          <button onClick={() => openEdit(lead)} className="p-1.5 rounded-lg hover:bg-lyratech-purple/10 text-lyratech-purple transition-colors" title="Editar">
                            <HiOutlinePencil size={15} />
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

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-dark-blue/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b border-black/5">
              <h2 className="font-montserrat-bold text-dark-blue text-lg">
                {editing ? "Editar lead" : "Nuevo lead"}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-beige text-dark-blue/50 hover:text-dark-blue transition-colors">
                <HiOutlineX size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Nombre */}
              <div>
                <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">
                  Nombre <span className="text-red">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => { setForm({ ...form, name: e.target.value }); setFieldErrors((p) => ({ ...p, name: "" })); }}
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm font-montserrat text-dark-blue outline-none transition-all ${fieldErrors.name ? "border-red bg-red/5 focus:border-red focus:ring-1 focus:ring-red" : "border-black/15 focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple"}`}
                  placeholder="Nombre completo"
                />
                {fieldErrors.name && <p className="text-red text-xs font-montserrat mt-1">{fieldErrors.name}</p>}
              </div>

              {/* Email + Teléfono */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">
                    Email <span className="text-red">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.email}
                    onChange={(e) => { setForm({ ...form, email: e.target.value }); setFieldErrors((p) => ({ ...p, email: "", contact: "" })); }}
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm font-montserrat text-dark-blue outline-none transition-all ${fieldErrors.email || fieldErrors.contact ? "border-red bg-red/5 focus:border-red focus:ring-1 focus:ring-red" : "border-black/15 focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple"}`}
                    placeholder="email@ejemplo.com"
                  />
                  {fieldErrors.email && <p className="text-red text-xs font-montserrat mt-1">{fieldErrors.email}</p>}
                </div>
                <div>
                  <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">
                    Teléfono <span className="text-red">*</span>
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => { setForm({ ...form, phone: e.target.value }); setFieldErrors((p) => ({ ...p, contact: "" })); }}
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm font-montserrat text-dark-blue outline-none transition-all ${fieldErrors.contact ? "border-red bg-red/5 focus:border-red focus:ring-1 focus:ring-red" : "border-black/15 focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple"}`}
                    placeholder="+52 000 000 0000"
                  />
                </div>
              </div>
              {fieldErrors.contact && (
                <p className="text-red text-xs font-montserrat -mt-2">{fieldErrors.contact}</p>
              )}

              {/* Empresa */}
              <div>
                <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">Empresa</label>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className="w-full border border-black/15 rounded-xl px-4 py-2.5 text-sm font-montserrat text-dark-blue outline-none focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple transition-all"
                  placeholder="Nombre de la empresa"
                />
              </div>

              {/* Estado + Fuente */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">Estado</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as LeadStatus })}
                    className="w-full border border-black/15 rounded-xl px-4 py-2.5 text-sm font-montserrat text-dark-blue outline-none focus:border-lyratech-purple transition-all bg-white"
                  >
                    {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">
                    Fuente <span className="text-red">*</span>
                  </label>
                  <select
                    value={form.source}
                    onChange={(e) => { setForm({ ...form, source: e.target.value }); setFieldErrors((p) => ({ ...p, source: "" })); }}
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm font-montserrat text-dark-blue outline-none transition-all bg-white ${fieldErrors.source ? "border-red bg-red/5 focus:border-red" : "border-black/15 focus:border-lyratech-purple"}`}
                  >
                    <option value="">Seleccionar...</option>
                    {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {fieldErrors.source && <p className="text-red text-xs font-montserrat mt-1">{fieldErrors.source}</p>}
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">Notas</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="w-full border border-black/15 rounded-xl px-4 py-2.5 text-sm font-montserrat text-dark-blue outline-none focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple transition-all resize-none"
                  placeholder="Notas adicionales sobre el lead..."
                />
              </div>

              {formError && (
                <div className="bg-red/10 border border-red/30 text-red rounded-lg px-4 py-2.5 text-sm font-montserrat">
                  {formError}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-black/15 text-dark-blue/70 hover:text-dark-blue font-montserrat font-semibold py-2.5 rounded-xl transition-all text-sm hover:bg-beige"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-lyratech-purple hover:bg-button-light-purple disabled:opacity-50 text-white font-montserrat font-semibold py-2.5 rounded-xl transition-all text-sm shadow-button hover:scale-[1.02]"
                >
                  <HiOutlineCheck size={16} />
                  {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear lead"}
                </button>
              </div>
            </div>
          </div>
        </div>
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
                onClick={() => handleDelete(deleteId as number)}
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
