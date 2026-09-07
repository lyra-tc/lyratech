"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { HiOutlineArrowLeft, HiOutlineTrash } from "react-icons/hi";
import Dropdown from "@/components/shared/Dropdown";
import LoadingDots from "@/components/shared/LoadingDots";
import DiscardChangesDialog from "@/components/shared/DiscardChangesDialog";
import ClientPaymentsEditor, { PaymentRow, newPaymentKey } from "@/components/Dashboard/ClientPaymentsEditor";
import { clientsApi } from "@/lib/api";
import type { Client, ClientStatus, ClientUpdateInput } from "@/lib/api";
import { CLIENT_STATUS_LABELS, PAYMENT_TYPE_LABELS } from "@/lib/clientConstants";
import { SOURCES } from "@/lib/prospectConstants";
import { deepEqual } from "@/lib/deepEqual";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface FormState {
  name: string; email: string; phone: string; company: string; industry: string;
  service: string; source: string; notes: string;
  responsable: string; comisionista: string;
  comision_tipo: "" | "monto" | "porcentaje"; comision_valor: string;
  status: ClientStatus;
  payment_type: "" | "contado" | "diferido" | "iguala";
  project_start_date: string; project_amount: string;
  payments: PaymentRow[];
}

function toForm(c: Client): FormState {
  return {
    name: c.name, email: c.email ?? "", phone: c.phone ?? "", company: c.company ?? "",
    industry: c.industry ?? "", service: c.service ?? "", source: c.source ?? "", notes: c.notes ?? "",
    responsable: c.responsable, comisionista: c.comisionista ?? "",
    comision_tipo: c.comision_tipo ?? "", comision_valor: c.comision_valor ?? "",
    status: c.status, payment_type: c.payment_type ?? "",
    project_start_date: c.project_start_date ?? "", project_amount: c.project_amount ?? "",
    payments: c.payments.map((p) => ({
      _key: newPaymentKey(),
      due_date: p.due_date, concept: p.concept ?? "", amount: p.amount,
      is_paid: p.is_paid, paid_date: p.paid_date ?? null,
    })),
  };
}

function toPayload(f: FormState): ClientUpdateInput {
  return {
    name: f.name.trim(), email: f.email || null, phone: f.phone || null, company: f.company || null,
    industry: f.industry || null, service: f.service || null, source: f.source || null, notes: f.notes || null,
    responsable: f.responsable.trim(), comisionista: f.comisionista || null,
    comision_tipo: f.comision_tipo || null, comision_valor: f.comision_tipo ? (f.comision_valor || null) : null,
    status: f.status, payment_type: f.payment_type || null,
    project_start_date: f.project_start_date || null, project_amount: f.project_amount || null,
    payments: f.payments.map((p) => ({
      due_date: p.due_date, concept: p.concept || null, amount: p.amount || "0",
      is_paid: p.is_paid, paid_date: p.is_paid ? p.paid_date : null,
    })),
  };
}

const inputCls =
  "w-full border border-black/15 rounded-xl px-4 py-2.5 text-sm font-montserrat text-dark-blue outline-none focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple transition-all";

const STATUS_OPTIONS = (Object.keys(CLIENT_STATUS_LABELS) as ClientStatus[]).map((s) => ({
  value: s,
  label: CLIENT_STATUS_LABELS[s],
}));
const COMISION_OPTIONS = [
  { value: "", label: "Sin comisión" },
  { value: "monto", label: "Monto" },
  { value: "porcentaje", label: "Porcentaje" },
];
const PAYMENT_TYPE_OPTIONS = [
  { value: "", label: "—" },
  ...(Object.keys(PAYMENT_TYPE_LABELS) as Array<keyof typeof PAYMENT_TYPE_LABELS>).map((k) => ({
    value: k,
    label: PAYMENT_TYPE_LABELS[k],
  })),
];
const SOURCE_OPTIONS = SOURCES.map((s) => ({ value: s, label: s }));

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-black/5 p-6 space-y-4">
      <h3 className="font-montserrat-bold text-dark-blue text-sm">{title}</h3>
      {children}
    </div>
  );
}

export default function ClienteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [form, setForm] = useState<FormState | null>(null);
  const initialRef = useRef<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [pendingNav, setPendingNav] = useState<null | "back" | "delete">(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useScrollLock(confirmDelete);
  useEscapeKey(() => setConfirmDelete(false), confirmDelete);

  useEffect(() => {
    let active = true;
    setLoading(true);
    clientsApi
      .get(Number(id))
      .then((c) => {
        if (!active) return;
        const f = toForm(c);
        setForm(f);
        initialRef.current = f;
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setNotFound(true);
        setLoading(false);
      });
    return () => { active = false; };
  }, [id]);

  const isDirty = form !== null && initialRef.current !== null && !deepEqual(form, initialRef.current);

  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  function set(patch: Partial<FormState>) {
    setForm((f) => (f ? { ...f, ...patch } : f));
    setSaved(false);
  }

  function goBack() {
    if (isDirty) setPendingNav("back");
    else router.push("/dashboard/clientes");
  }

  function requestDelete() {
    if (isDirty) setPendingNav("delete");
    else setConfirmDelete(true);
  }

  function confirmDiscard() {
    const target = pendingNav;
    setPendingNav(null);
    if (target === "delete") setConfirmDelete(true);
    else router.push("/dashboard/clientes");
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await clientsApi.remove(Number(id));
      router.push("/dashboard/clientes");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "No se pudo eliminar");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function handleSave() {
    if (!form) return;
    setSaveAttempted(true);
    setSaveError("");
    if (!form.responsable.trim()) {
      setSaveError("El responsable es obligatorio");
      return;
    }
    if (form.comision_tipo) {
      const v = Number(form.comision_valor);
      if (!form.comision_valor || !Number.isFinite(v) || v <= 0) {
        setSaveError("Indica el valor de la comisión");
        return;
      }
      if (form.comision_tipo === "porcentaje" && v > 100) {
        setSaveError("El porcentaje no puede ser mayor a 100");
        return;
      }
    }
    setSaving(true);
    try {
      const updated = await clientsApi.update(Number(id), toPayload(form));
      const f = toForm(updated);
      setForm(f);
      initialRef.current = f;
      setSaved(true);
      setSaveAttempted(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <LoadingDots />
      </div>
    );
  }

  if (notFound || !form) {
    return (
      <div className="p-8 max-w-3xl mx-auto text-center">
        <p className="font-montserrat text-dark-blue/50 text-sm mb-4">Cliente no encontrado</p>
        <button
          onClick={() => router.push("/dashboard/clientes")}
          className="inline-flex items-center gap-2 text-lyratech-purple font-montserrat font-semibold text-sm hover:underline"
        >
          <HiOutlineArrowLeft size={16} /> Volver a Clientes
        </button>
      </div>
    );
  }

  const responsableError = saveAttempted && !form.responsable.trim();

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <button
            onClick={goBack}
            className="inline-flex items-center gap-1.5 text-dark-blue/50 hover:text-dark-blue font-montserrat text-sm mb-2 transition-colors"
          >
            <HiOutlineArrowLeft size={15} /> Volver
          </button>
          <h1 className="font-montserrat-bold text-dark-blue text-2xl truncate">{form.name || "Cliente"}</h1>
          {form.company && (
            <p className="font-montserrat text-dark-blue/50 text-sm mt-0.5 truncate">{form.company}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-44">
            <Dropdown
              value={form.status}
              onChange={(v) => set({ status: v as ClientStatus })}
              options={STATUS_OPTIONS}
            />
          </div>
          <button
            onClick={requestDelete}
            className="p-2.5 rounded-xl border border-black/15 hover:bg-red/10 text-red transition-colors"
            title="Eliminar cliente"
          >
            <HiOutlineTrash size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-5">
        {/* Contacto */}
        <SectionCard title="Contacto">
          <Field label="Nombre">
            <input value={form.name} onChange={(e) => set({ name: e.target.value })} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email">
              <input value={form.email} onChange={(e) => set({ email: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Teléfono">
              <input value={form.phone} onChange={(e) => set({ phone: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Empresa">
              <input value={form.company} onChange={(e) => set({ company: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Giro de empresa">
              <input value={form.industry} onChange={(e) => set({ industry: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Servicio">
              <input value={form.service} onChange={(e) => set({ service: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Fuente">
              <Dropdown value={form.source} onChange={(v) => set({ source: v })} options={SOURCE_OPTIONS} />
            </Field>
          </div>
          <Field label="Notas">
            <textarea
              value={form.notes}
              onChange={(e) => set({ notes: e.target.value })}
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </Field>
        </SectionCard>

        {/* Seguimiento */}
        <SectionCard title="Seguimiento">
          <Field label="Responsable *">
            <input
              value={form.responsable}
              onChange={(e) => set({ responsable: e.target.value })}
              className={
                responsableError
                  ? "w-full border border-red bg-red/5 rounded-xl px-4 py-2.5 text-sm font-montserrat text-dark-blue outline-none focus:border-red focus:ring-1 focus:ring-red transition-all"
                  : inputCls
              }
              placeholder="Quién da seguimiento"
            />
            {responsableError && (
              <p className="text-red text-xs font-montserrat mt-1">El responsable es obligatorio</p>
            )}
          </Field>
          <Field label="Comisionista">
            <input value={form.comisionista} onChange={(e) => set({ comisionista: e.target.value })} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Comisión">
              <Dropdown
                value={form.comision_tipo}
                onChange={(v) => set({ comision_tipo: v as FormState["comision_tipo"] })}
                options={COMISION_OPTIONS}
              />
            </Field>
            {form.comision_tipo && (
              <Field label={form.comision_tipo === "porcentaje" ? "%" : "Monto"}>
                <input
                  type="number"
                  min="0"
                  value={form.comision_valor}
                  onChange={(e) => set({ comision_valor: e.target.value })}
                  className={inputCls}
                />
              </Field>
            )}
          </div>
        </SectionCard>

        {/* Proyecto */}
        <SectionCard title="Proyecto">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Esquema de pago">
              <Dropdown
                value={form.payment_type}
                onChange={(v) => set({ payment_type: v as FormState["payment_type"] })}
                options={PAYMENT_TYPE_OPTIONS}
              />
            </Field>
            <Field label="Fecha de inicio">
              <input
                type="date"
                value={form.project_start_date}
                onChange={(e) => set({ project_start_date: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Monto del proyecto">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-blue/40 text-sm font-montserrat">$</span>
              <input
                type="number"
                min="0"
                value={form.project_amount}
                onChange={(e) => set({ project_amount: e.target.value })}
                className={`${inputCls} pl-7`}
              />
            </div>
          </Field>
        </SectionCard>

        {/* Calendario de pagos */}
        <SectionCard title="Calendario de pagos">
          <ClientPaymentsEditor
            rows={form.payments}
            onChange={(payments) => set({ payments })}
            projectAmount={form.project_amount}
            projectStartDate={form.project_start_date}
          />
        </SectionCard>
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 mt-6 -mx-4 md:-mx-8 px-4 md:px-8 py-4 bg-white/90 backdrop-blur border-t border-black/5 flex items-center justify-between gap-3">
        <div className="font-montserrat text-xs">
          {saveError ? (
            <span className="text-red">{saveError}</span>
          ) : isDirty ? (
            <span className="text-dark-blue/40">Cambios sin guardar</span>
          ) : saved ? (
            <span className="text-lyratech-green">Guardado</span>
          ) : null}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !isDirty}
          className="bg-lyratech-purple hover:bg-button-light-purple disabled:opacity-50 text-white font-montserrat font-semibold px-5 py-2.5 rounded-xl transition-all text-sm shadow-button"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      <DiscardChangesDialog
        open={pendingNav !== null}
        onConfirm={confirmDiscard}
        onCancel={() => setPendingNav(null)}
      />

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => !deleting && setConfirmDelete(false)}
            className="fixed inset-0 bg-dark-blue/60 backdrop-blur-sm cursor-default"
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
            <h3 className="font-montserrat-bold text-dark-blue text-lg mb-2">Eliminar cliente</h3>
            <p className="font-montserrat text-dark-blue/60 text-sm mb-6">
              ¿Estás seguro que deseas eliminar este cliente? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="flex-1 border border-black/15 text-dark-blue/70 font-montserrat font-semibold py-2.5 rounded-xl transition-all text-sm hover:bg-beige disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red hover:bg-dark-red text-white font-montserrat font-semibold py-2.5 rounded-xl transition-all text-sm disabled:opacity-50"
              >
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
