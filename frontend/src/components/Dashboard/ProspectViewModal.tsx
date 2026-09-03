"use client";

import React from "react";
import { HiOutlineX } from "react-icons/hi";
import type { Prospect } from "@/lib/api";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/prospectConstants";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface ProspectViewModalProps {
  prospect: Prospect;
  onClose: () => void;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ProspectViewModal({ prospect, onClose }: ProspectViewModalProps) {
  useEscapeKey(onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="fixed inset-0 bg-dark-blue/60 backdrop-blur-sm cursor-default"
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-black/5">
          <h2 className="font-montserrat-bold text-dark-blue text-lg">{prospect.name}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-beige text-dark-blue/50 hover:text-dark-blue transition-colors">
            <HiOutlineX size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-montserrat font-semibold border ${STATUS_COLORS[prospect.status]}`}>
              {STATUS_LABELS[prospect.status]}
            </span>
            {prospect.source && (
              <span className="text-dark-blue/50 text-xs font-montserrat">Fuente: {prospect.source}</span>
            )}
            {prospect.service && (
              <span className="text-dark-blue/50 text-xs font-montserrat">Servicio: {prospect.service}</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-montserrat text-dark-blue/50 text-xs mb-1">Email</p>
              <p className="font-montserrat text-dark-blue text-sm break-all">{prospect.email || "—"}</p>
            </div>
            <div>
              <p className="font-montserrat text-dark-blue/50 text-xs mb-1">Teléfono</p>
              <p className="font-montserrat text-dark-blue text-sm">{prospect.phone || "—"}</p>
            </div>
          </div>

          <div>
            <p className="font-montserrat text-dark-blue/50 text-xs mb-1">Empresa</p>
            <p className="font-montserrat text-dark-blue text-sm">{prospect.company || "—"}</p>
            {prospect.industry && (
              <p className="font-montserrat text-dark-blue/40 text-xs mt-1">Giro: {prospect.industry}</p>
            )}
          </div>

          <div>
            <p className="font-montserrat text-dark-blue/50 text-xs mb-1">Notas</p>
            <p className="font-montserrat text-dark-blue text-sm whitespace-pre-wrap">{prospect.notes || "—"}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-black/5">
            <div>
              <p className="font-montserrat text-dark-blue/40 text-xs mb-1">Creado</p>
              <p className="font-montserrat text-dark-blue/70 text-xs">{formatDate(prospect.created_at)}</p>
            </div>
            <div>
              <p className="font-montserrat text-dark-blue/40 text-xs mb-1">Actualizado</p>
              <p className="font-montserrat text-dark-blue/70 text-xs">{formatDate(prospect.updated_at)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
