"use client";

import React, { useState } from "react";
import { HiOutlineX, HiOutlineCheck } from "react-icons/hi";
import { leadsApi } from "@/lib/api";
import type { Lead, LeadCreate, LeadStatus } from "@/lib/api";
import { STATUS_LABELS, SOURCES } from "@/lib/leadConstants";
import Dropdown from "@/components/shared/Dropdown";

const STATUS_OPTIONS = (Object.keys(STATUS_LABELS) as LeadStatus[]).map((s) => ({
  value: s,
  label: STATUS_LABELS[s],
}));

const SOURCE_OPTIONS = SOURCES.map((s) => ({ value: s, label: s }));

interface LeadFormModalProps {
  editing: Lead | null;
  initialForm: LeadCreate;
  onClose: () => void;
  onSaved: (lead: Lead) => void;
}

function toFormValues(lead: Lead): LeadCreate {
  return {
    name: lead.name,
    email: lead.email || "",
    phone: lead.phone || "",
    company: lead.company || "",
    status: lead.status,
    source: lead.source || "",
    notes: lead.notes || "",
  };
}

export default function LeadFormModal({ editing, initialForm, onClose, onSaved }: LeadFormModalProps) {
  const [form, setForm] = useState<LeadCreate>(editing ? toFormValues(editing) : initialForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
      const saved = editing
        ? await leadsApi.update(editing.id, form)
        : await leadsApi.create(form);
      onSaved(saved);
      onClose();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-dark-blue/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-black/5">
          <h2 className="font-montserrat-bold text-dark-blue text-lg">
            {editing ? "Editar lead" : "Nuevo lead"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-beige text-dark-blue/50 hover:text-dark-blue transition-colors">
            <HiOutlineX size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">Estado</label>
              <Dropdown
                value={form.status ?? "new"}
                onChange={(v) => setForm({ ...form, status: v as LeadStatus })}
                options={STATUS_OPTIONS}
              />
            </div>
            <div>
              <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">
                Fuente <span className="text-red">*</span>
              </label>
              <Dropdown
                value={form.source ?? ""}
                onChange={(v) => { setForm({ ...form, source: v }); setFieldErrors((p) => ({ ...p, source: "" })); }}
                options={SOURCE_OPTIONS}
                hasError={!!fieldErrors.source}
              />
              {fieldErrors.source && <p className="text-red text-xs font-montserrat mt-1">{fieldErrors.source}</p>}
            </div>
          </div>

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
              onClick={onClose}
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
  );
}
