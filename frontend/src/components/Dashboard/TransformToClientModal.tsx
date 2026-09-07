"use client";

import React, { useState } from "react";
import { HiOutlineX } from "react-icons/hi";
import Dropdown from "@/components/shared/Dropdown";
import { clientsApi } from "@/lib/api";
import type { Client, Prospect, ComisionTipo } from "@/lib/api";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useScrollLock } from "@/hooks/useScrollLock";

interface Props {
  prospect: Prospect;
  onClose: () => void;
  onDone: (client: Client) => void;
}

const COMISION_OPTIONS = [
  { value: "", label: "Sin comisión" },
  { value: "monto", label: "Monto" },
  { value: "porcentaje", label: "Porcentaje" },
];

const inputCls =
  "w-full border border-black/15 rounded-xl px-4 py-2.5 text-sm font-montserrat text-dark-blue outline-none focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple transition-all";

export default function TransformToClientModal({ prospect, onClose, onDone }: Props) {
  useScrollLock();
  const [responsable, setResponsable] = useState("");
  const [comisionista, setComisionista] = useState("");
  const [comisionTipo, setComisionTipo] = useState("");
  const [comisionValor, setComisionValor] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEscapeKey(() => { if (!saving) onClose(); });

  async function handleSave() {
    if (!responsable.trim()) {
      setError("El responsable es obligatorio");
      return;
    }
    if (comisionTipo && (!comisionValor || Number(comisionValor) <= 0)) {
      setError("Indica el valor de la comisión");
      return;
    }
    if (comisionTipo === "porcentaje" && Number(comisionValor) > 100) {
      setError("El porcentaje no puede ser mayor a 100");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const client = await clientsApi.fromProspect(prospect.id, {
        responsable: responsable.trim(),
        comisionista: comisionista.trim() || undefined,
        comision_tipo: (comisionTipo || null) as ComisionTipo | null,
        comision_valor: comisionTipo ? comisionValor : null,
      });
      onDone(client);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo transformar");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Cerrar" onClick={() => !saving && onClose()}
        className="fixed inset-0 bg-dark-blue/60 backdrop-blur-sm cursor-default" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-black/5">
          <h2 className="font-montserrat-bold text-dark-blue text-lg">Transformar a cliente</h2>
          <button onClick={() => !saving && onClose()} className="p-1.5 rounded-lg hover:bg-beige text-dark-blue/50 hover:text-dark-blue transition-colors">
            <HiOutlineX size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="font-montserrat text-dark-blue/60 text-sm">
            <span className="font-semibold text-dark-blue">{prospect.name}</span>
            {prospect.company ? ` · ${prospect.company}` : ""} se moverá a Clientes.
          </p>

          <div>
            <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">
              Responsable <span className="text-red">*</span>
            </label>
            <input value={responsable} onChange={(e) => { setResponsable(e.target.value); setError(""); }}
              className={inputCls} placeholder="Quién da seguimiento" />
          </div>

          <div>
            <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">Comisionista</label>
            <input value={comisionista} onChange={(e) => setComisionista(e.target.value)}
              className={inputCls} placeholder="Opcional" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">Comisión</label>
              <Dropdown value={comisionTipo} onChange={(v) => { setComisionTipo(v); setError(""); }} options={COMISION_OPTIONS} />
            </div>
            {comisionTipo && (
              <div>
                <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">
                  {comisionTipo === "porcentaje" ? "%" : "Monto"}
                </label>
                <input type="number" min="0" value={comisionValor}
                  onChange={(e) => { setComisionValor(e.target.value); setError(""); }}
                  className={inputCls} placeholder={comisionTipo === "porcentaje" ? "10" : "5000"} />
              </div>
            )}
          </div>

          {error && <p className="text-red text-xs font-montserrat">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button onClick={() => !saving && onClose()} disabled={saving}
              className="flex-1 border border-black/15 text-dark-blue/70 font-montserrat font-semibold py-2.5 rounded-xl text-sm hover:bg-beige disabled:opacity-50">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-lyratech-purple hover:bg-button-light-purple text-white font-montserrat font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">
              {saving ? "Transformando…" : "Transformar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
