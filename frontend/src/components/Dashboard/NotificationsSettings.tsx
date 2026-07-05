"use client";

import React, { useCallback, useEffect, useState } from "react";
import { HiOutlineCheck, HiOutlineMail, HiOutlineTrash } from "react-icons/hi";
import { notificationsApi } from "@/lib/api";
import LoadingDots from "@/components/shared/LoadingDots";
import type { NotificationRecipient } from "@/lib/api";

export default function NotificationsSettings() {
  const [recipients, setRecipients] = useState<NotificationRecipient[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [newRecipientEmail, setNewRecipientEmail] = useState("");
  const [recipientSaving, setRecipientSaving] = useState(false);
  const [recipientMsg, setRecipientMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [deleteRecipientId, setDeleteRecipientId] = useState<number | null>(null);
  const [removingRecipientId, setRemovingRecipientId] = useState<number | null>(null);
  const [testingRecipientId, setTestingRecipientId] = useState<number | null>(null);

  const inputClass =
    "w-full border border-black/15 rounded-xl px-4 py-2.5 text-sm font-montserrat text-dark-blue outline-none focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple transition-all bg-white";

  const loadRecipients = useCallback(async () => {
    setRecipientsLoading(true);
    try {
      const list = await notificationsApi.list();
      setRecipients(list);
    } catch {
      /* ignore - request() already redirects to login on 401 */
    } finally {
      setRecipientsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecipients();
  }, [loadRecipients]);

  async function handleAddRecipient(e: React.FormEvent) {
    e.preventDefault();
    setRecipientMsg(null);
    setRecipientSaving(true);
    try {
      const created = await notificationsApi.create(newRecipientEmail);
      setRecipients((prev) => [...prev, created]);
      setNewRecipientEmail("");
      setRecipientMsg({ type: "ok", text: "Correo agregado correctamente." });
    } catch (err: unknown) {
      setRecipientMsg({ type: "err", text: err instanceof Error ? err.message : "Error al agregar" });
    } finally {
      setRecipientSaving(false);
    }
  }

  async function handleRemoveRecipient(id: number) {
    setRecipientMsg(null);
    setRemovingRecipientId(id);
    try {
      await notificationsApi.remove(id);
      setRecipients((prev) => prev.filter((r) => r.id !== id));
    } catch (err: unknown) {
      setRecipientMsg({ type: "err", text: err instanceof Error ? err.message : "Error al eliminar" });
    } finally {
      setRemovingRecipientId(null);
      setDeleteRecipientId(null);
    }
  }

  async function handleTestRecipient(id: number) {
    setRecipientMsg(null);
    setTestingRecipientId(id);
    try {
      const response = await notificationsApi.sendTest(id);
      setRecipientMsg({ type: "ok", text: response.message });
    } catch (err: unknown) {
      setRecipientMsg({ type: "err", text: err instanceof Error ? err.message : "Error al enviar prueba" });
    } finally {
      setTestingRecipientId(null);
    }
  }

  return (
    <>
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="font-montserrat-bold text-dark-blue text-2xl">Notificaciones</h1>
          <p className="font-montserrat text-dark-blue/50 text-sm mt-0.5">
            Administra los correos que reciben avisos de nuevos prospectos y/o diagnósticos. Puedes agregar, eliminar y probar los correos de notificación desde esta sección.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6">
          <h2 className="font-montserrat-bold text-dark-blue text-base mb-1">
            Correos de notificacion
          </h2>
          <p className="font-montserrat text-dark-blue/40 text-sm mb-5">
            Estas direcciones reciben un aviso cada vez que llega un nuevo prospecto y/o diagnóstico desde el formulario de contacto o formulario de diagnóstico.
          </p>

          {recipientsLoading ? (
            <div className="mb-5 flex justify-center py-3">
              <LoadingDots />
            </div>
          ) : recipients.length === 0 ? (
            <p className="font-montserrat text-dark-blue/40 text-sm mb-4">
              No hay correos configurados aun.
            </p>
          ) : (
            <ul className="space-y-2 mb-5">
              {recipients.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 border border-black/10 rounded-xl px-4 py-2.5"
                >
                  <span className="font-montserrat text-dark-blue text-sm break-all">{r.email}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleTestRecipient(r.id)}
                      disabled={testingRecipientId === r.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-lyratech-purple/20 px-3 py-1.5 text-xs font-montserrat font-semibold text-lyratech-purple transition-colors hover:bg-lyratech-purple/10 disabled:opacity-50"
                      title="Enviar correo de prueba"
                    >
                      <HiOutlineMail size={14} />
                      {testingRecipientId === r.id ? "Enviando..." : "Probar"}
                    </button>
                    <button
                      onClick={() => setDeleteRecipientId(r.id)}
                      className="p-1.5 rounded-lg hover:bg-red/10 text-red transition-colors"
                      title="Eliminar"
                    >
                      <HiOutlineTrash size={15} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleAddRecipient} className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="flex-1">
              <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">
                Correo electronico
              </label>
              <input
                type="email"
                required
                value={newRecipientEmail}
                onChange={(e) => setNewRecipientEmail(e.target.value)}
                className={inputClass}
                placeholder="nuevo@correo.com"
              />
            </div>
            <button
              type="submit"
              disabled={recipientSaving}
              className="flex items-center justify-center gap-2 bg-lyratech-purple hover:bg-button-light-purple disabled:opacity-50 text-white font-montserrat font-semibold px-5 py-2.5 rounded-xl transition-all text-sm shadow-button hover:scale-[1.02] whitespace-nowrap"
            >
              <HiOutlineCheck size={16} />
              {recipientSaving ? "Agregando..." : "Agregar"}
            </button>
          </form>

          {recipientMsg && (
            <div className={`mt-4 rounded-lg px-4 py-2.5 text-sm font-montserrat border ${
              recipientMsg.type === "ok"
                ? "bg-lyratech-green/10 border-lyratech-green/30 text-lyratech-green"
                : "bg-red/10 border-red/30 text-red"
            }`}>
              {recipientMsg.text}
            </div>
          )}
        </div>
      </div>

      {deleteRecipientId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setDeleteRecipientId(null)}
            className="fixed inset-0 bg-dark-blue/60 backdrop-blur-sm cursor-default"
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
            <h3 className="font-montserrat-bold text-dark-blue text-lg mb-2">Eliminar correo</h3>
            <p className="font-montserrat text-dark-blue/60 text-sm mb-6">
              Estas por eliminar este correo de la lista de notificaciones. Esta accion no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteRecipientId(null)}
                disabled={removingRecipientId === deleteRecipientId}
                className="flex-1 border border-black/15 text-dark-blue/70 font-montserrat font-semibold py-2.5 rounded-xl transition-all text-sm hover:bg-beige disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleRemoveRecipient(deleteRecipientId)}
                disabled={removingRecipientId === deleteRecipientId}
                className="flex-1 bg-red hover:bg-dark-red text-white font-montserrat font-semibold py-2.5 rounded-xl transition-all text-sm disabled:opacity-50"
              >
                {removingRecipientId === deleteRecipientId ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
