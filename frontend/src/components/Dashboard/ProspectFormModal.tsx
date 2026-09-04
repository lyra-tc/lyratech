"use client";

import React, { useRef, useState } from "react";
import { HiOutlineX, HiOutlineCheck } from "react-icons/hi";
import { prospectsApi } from "@/lib/api";
import type { Prospect, ProspectCreate, ProspectStatus } from "@/lib/api";
import { STATUS_LABELS, SOURCES } from "@/lib/prospectConstants";
import Dropdown from "@/components/shared/Dropdown";
import DiscardChangesDialog from "@/components/shared/DiscardChangesDialog";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { useScrollLock } from "@/hooks/useScrollLock";
import { deepEqual } from "@/lib/deepEqual";

const SOURCE_OPTIONS = SOURCES.map((s) => ({ value: s, label: s }));

interface ProspectFormModalProps {
  editing: Prospect | null;
  initialForm: ProspectCreate;
  onClose: () => void;
  onSaved: (prospect: Prospect) => void;
  hideLostOnCreate?: boolean;
}

function toFormValues(prospect: Prospect): ProspectCreate {
  return {
    name: prospect.name,
    email: prospect.email || "",
    phone: prospect.phone || "",
    company: prospect.company || "",
    industry: prospect.industry || "",
    service: prospect.service || "",
    status: prospect.status,
    source: prospect.source || "",
    notes: prospect.notes || "",
  };
}

export default function ProspectFormModal({ editing, initialForm, onClose, onSaved, hideLostOnCreate }: ProspectFormModalProps) {
  useScrollLock();
  const initialFormRef = useRef<ProspectCreate>(editing ? toFormValues(editing) : initialForm);
  const [form, setForm] = useState<ProspectCreate>(initialFormRef.current);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isDirty = !deepEqual(form, initialFormRef.current);
  const { requestClose, confirmOpen, confirmDiscard, cancelDiscard } = useUnsavedChangesGuard({
    isDirty,
    onClose,
  });
  useEscapeKey(requestClose, !confirmOpen && !saving);

  // "Reunión agendada" is reachable only through the booking flow (never a
  // manual pick). Once a prospect is there, the only allowed move is "Perdido".
  // The blank "Nuevo prospecto" form also hides "Perdido" (hideLostOnCreate) —
  // conversions still offer it.
  let statusValues: ProspectStatus[];
  if (editing?.status === "meeting_scheduled") {
    statusValues = ["meeting_scheduled", "lost"];
  } else if (!editing && hideLostOnCreate) {
    statusValues = ["meeting_to_schedule", "call_later"];
  } else {
    statusValues = ["meeting_to_schedule", "call_later", "lost"];
  }
  const statusOptions = statusValues.map((s) => ({ value: s, label: STATUS_LABELS[s] }));

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
        ? await prospectsApi.update(editing.id, form)
        : await prospectsApi.create(form);
      onSaved(saved);
      onClose();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={requestClose}
        className="fixed inset-0 bg-dark-blue/60 backdrop-blur-sm cursor-default"
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-black/5">
          <h2 className="font-montserrat-bold text-dark-blue text-lg">
            {editing ? "Editar prospecto" : "Nuevo prospecto"}
          </h2>
          <button onClick={requestClose} className="p-1.5 rounded-lg hover:bg-beige text-dark-blue/50 hover:text-dark-blue transition-colors">
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

          <div>
            <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">Giro de empresa</label>
            <input
              type="text"
              value={form.industry ?? ""}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              className="w-full border border-black/15 rounded-xl px-4 py-2.5 text-sm font-montserrat text-dark-blue outline-none focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple transition-all"
              placeholder="Ej. manufactura, retail, salud"
            />
          </div>

          <div>
            <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">Servicio</label>
            <input
              type="text"
              value={form.service ?? ""}
              onChange={(e) => setForm({ ...form, service: e.target.value })}
              className="w-full border border-black/15 rounded-xl px-4 py-2.5 text-sm font-montserrat text-dark-blue outline-none focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple transition-all"
              placeholder="Ej. automatizaciones, precio-fijo"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">Estado</label>
              <Dropdown
                value={form.status ?? "meeting_to_schedule"}
                onChange={(v) => setForm({ ...form, status: v as ProspectStatus })}
                options={statusOptions}
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
              placeholder="Notas adicionales sobre el prospecto..."
            />
          </div>

          {formError && (
            <div className="bg-red/10 border border-red/30 text-red rounded-lg px-4 py-2.5 text-sm font-montserrat">
              {formError}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              onClick={requestClose}
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
              {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear prospecto"}
            </button>
          </div>
        </div>
      </div>
    </div>
    <DiscardChangesDialog
      open={confirmOpen}
      onConfirm={confirmDiscard}
      onCancel={cancelDiscard}
    />
    </>
  );
}
