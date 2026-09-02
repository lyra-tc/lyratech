"use client";

import React from "react";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface DiscardChangesDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * "You have unsaved changes" confirmation, shown on top of a form modal when the
 * user tries to dismiss it with pending edits. Styled to match the dashboard's
 * delete-confirmation dialogs.
 */
export default function DiscardChangesDialog({ open, onConfirm, onCancel }: DiscardChangesDialogProps) {
  useEscapeKey(onCancel, open);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Seguir editando"
        onClick={onCancel}
        className="fixed inset-0 bg-dark-blue/60 backdrop-blur-sm cursor-default"
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
        <h3 className="font-montserrat-bold text-dark-blue text-lg mb-2">¿Descartar cambios?</h3>
        <p className="font-montserrat text-dark-blue/60 text-sm mb-6">
          Tenés cambios sin guardar. Si salís ahora se van a perder.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-black/15 text-dark-blue/70 font-montserrat font-semibold py-2.5 rounded-xl transition-all text-sm hover:bg-beige"
          >
            Seguir editando
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red hover:bg-dark-red text-white font-montserrat font-semibold py-2.5 rounded-xl transition-all text-sm"
          >
            Descartar cambios
          </button>
        </div>
      </div>
    </div>
  );
}
