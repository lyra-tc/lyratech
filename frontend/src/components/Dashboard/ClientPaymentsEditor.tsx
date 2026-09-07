"use client";

import React, { useState } from "react";
import { HiOutlineTrash, HiOutlinePlus } from "react-icons/hi";
import Dropdown from "@/components/shared/Dropdown";
import { formatMXN } from "@/lib/format";

export interface PaymentRow {
  _key: string;
  due_date: string;
  concept: string;
  amount: string;
  is_paid: boolean;
  paid_date: string | null;
}

export const newPaymentKey = (): string =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : String(Math.random());

interface Props {
  rows: PaymentRow[];
  onChange: (rows: PaymentRow[]) => void;
  projectAmount: string;
  projectStartDate: string;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

function addMonths(iso: string, k: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const base = new Date(y, m - 1 + k, 1);
  const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  base.setDate(Math.min(d, lastDay));
  return base.toISOString().slice(0, 10);
}

const cell = "w-full border border-black/15 rounded-lg px-2.5 py-1.5 text-sm font-montserrat outline-none focus:border-lyratech-purple";
const MODE_OPTIONS = [
  { value: "single", label: "Pago único" },
  { value: "equal", label: "N pagos iguales" },
  { value: "retainer", label: "Iguala mensual" },
];

export default function ClientPaymentsEditor({ rows, onChange, projectAmount, projectStartDate }: Props) {
  const [genOpen, setGenOpen] = useState(false);
  const [mode, setMode] = useState("single");
  const [genStart, setGenStart] = useState(projectStartDate || todayISO());
  const [genCount, setGenCount] = useState("3");
  const [genMonthly, setGenMonthly] = useState("");
  const [splitTotal, setSplitTotal] = useState(true);

  const programado = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const cobrado = rows.reduce((s, r) => s + (r.is_paid ? Number(r.amount) || 0 : 0), 0);
  const pct = programado > 0 ? Math.round((cobrado / programado) * 100) : 0;

  const missingAmount = mode === "equal" && splitTotal && !(Number(projectAmount) > 0);

  function toggleGen() {
    setGenOpen((o) => !o);
    if (!genOpen) setGenStart(projectStartDate || todayISO());
  }

  function update(i: number, patch: Partial<PaymentRow>) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function remove(i: number) {
    onChange(rows.filter((_, idx) => idx !== i));
  }
  function addRow() {
    onChange([
      ...rows,
      { _key: newPaymentKey(), due_date: projectStartDate || todayISO(), concept: "", amount: "", is_paid: false, paid_date: null },
    ]);
  }
  function togglePaid(i: number, checked: boolean) {
    update(i, { is_paid: checked, paid_date: checked ? (rows[i].paid_date || todayISO()) : null });
  }

  function generate() {
    if (missingAmount) return;
    const start = genStart || todayISO();
    const n = Math.max(1, Math.min(120, Number(genCount) || 1));
    const total = Number(projectAmount) || 0;
    let next: PaymentRow[] = [];
    if (mode === "single") {
      next = [{ _key: newPaymentKey(), due_date: start, concept: "Pago único", amount: projectAmount || "", is_paid: false, paid_date: null }];
    } else if (mode === "equal") {
      const per = splitTotal && total > 0 ? Math.floor((total / n) * 100) / 100 : Number(genMonthly) || 0;
      next = Array.from({ length: n }, (_, k) => ({
        _key: newPaymentKey(),
        due_date: addMonths(start, k),
        concept: `Pago ${k + 1}`,
        amount: per.toFixed(2),
        is_paid: false,
        paid_date: null,
      }));
      if (splitTotal && total > 0) {
        const used = per * n;
        const remainder = Math.round((total - used) * 100) / 100;
        if (remainder !== 0) next[n - 1] = { ...next[n - 1], amount: (per + remainder).toFixed(2) };
      }
    } else {
      const per = Number(genMonthly) || 0;
      next = Array.from({ length: n }, (_, k) => ({
        _key: newPaymentKey(),
        due_date: addMonths(start, k),
        concept: `Mensualidad ${k + 1}`,
        amount: per.toFixed(2),
        is_paid: false,
        paid_date: null,
      }));
    }
    const commit = () => { onChange(next); setGenOpen(false); };
    if (rows.length > 0) {
      if (window.confirm(`Esto reemplaza los ${rows.length} pagos actuales.`)) commit();
    } else {
      commit();
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-montserrat-bold text-dark-blue text-sm">Calendario de pagos</h3>
        <div className="flex gap-2">
          <button type="button" onClick={toggleGen}
            className="text-lyratech-purple font-montserrat font-semibold text-xs hover:underline">
            Generar calendario
          </button>
          <button type="button" onClick={addRow}
            className="inline-flex items-center gap-1 text-lyratech-purple font-montserrat font-semibold text-xs hover:underline">
            <HiOutlinePlus size={13} /> Agregar pago
          </button>
        </div>
      </div>

      {genOpen && (
        <div className="rounded-xl border border-black/10 bg-beige/40 p-3 space-y-2">
          <Dropdown value={mode} onChange={setMode} options={MODE_OPTIONS} />
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={genStart} onChange={(e) => setGenStart(e.target.value)} className={cell} />
            {mode !== "single" && (
              <input type="number" min="1" value={genCount} onChange={(e) => setGenCount(e.target.value)}
                className={cell} placeholder="Número de pagos" />
            )}
            {mode === "retainer" && (
              <input type="number" min="0" value={genMonthly} onChange={(e) => setGenMonthly(e.target.value)}
                className={cell} placeholder="Monto mensual" />
            )}
            {mode === "equal" && !splitTotal && (
              <input type="number" min="0" value={genMonthly} onChange={(e) => setGenMonthly(e.target.value)}
                className={cell} placeholder="Monto por pago" />
            )}
          </div>
          {mode === "equal" && (
            <label className="flex items-center gap-2 text-xs font-montserrat text-dark-blue/70">
              <input type="checkbox" checked={splitTotal} onChange={(e) => setSplitTotal(e.target.checked)} />
              Repartir el monto total del proyecto ({formatMXN(projectAmount)})
            </label>
          )}
          {missingAmount && (
            <p className="text-red text-xs font-montserrat">Captura el monto del proyecto primero</p>
          )}
          <button type="button" onClick={generate} disabled={missingAmount}
            className="bg-lyratech-purple text-white font-montserrat font-semibold text-xs px-3 py-1.5 rounded-lg disabled:opacity-50">
            Generar
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="font-montserrat text-dark-blue/40 text-sm py-4 text-center">Sin pagos programados</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-dark-blue/50 text-xs uppercase font-montserrat-bold">
                <th className="py-2 pr-2">Fecha</th>
                <th className="py-2 pr-2">Concepto</th>
                <th className="py-2 pr-2">Monto</th>
                <th className="py-2 pr-2">Pagado</th>
                <th className="py-2 pr-2">Fecha pago</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r._key} className="border-t border-black/5">
                  <td className="py-1.5 pr-2"><input type="date" value={r.due_date} onChange={(e) => update(i, { due_date: e.target.value })} className={cell} /></td>
                  <td className="py-1.5 pr-2"><input value={r.concept} onChange={(e) => update(i, { concept: e.target.value })} className={cell} placeholder="Concepto" /></td>
                  <td className="py-1.5 pr-2"><input type="number" min="0" value={r.amount} onChange={(e) => update(i, { amount: e.target.value })} className={cell} /></td>
                  <td className="py-1.5 pr-2 text-center"><input type="checkbox" checked={r.is_paid} onChange={(e) => togglePaid(i, e.target.checked)} /></td>
                  <td className="py-1.5 pr-2">
                    <input type="date" value={r.paid_date || ""} disabled={!r.is_paid}
                      onChange={(e) => update(i, { paid_date: e.target.value || null })}
                      className={`${cell} disabled:opacity-40`} />
                  </td>
                  <td className="py-1.5">
                    <button type="button" onClick={() => remove(i)} className="p-1 rounded hover:bg-red/10 text-red">
                      <HiOutlineTrash size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-black/10 font-montserrat text-dark-blue/70 text-xs">
                <td className="py-2" colSpan={6}>
                  Programado: {formatMXN(programado)} · Cobrado: {formatMXN(cobrado)} · {pct}% cobrado
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
