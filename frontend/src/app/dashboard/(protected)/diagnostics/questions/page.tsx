"use client";

import React, { useCallback, useEffect, useState } from "react";
import { HiOutlineMenuAlt4, HiOutlinePencil, HiOutlinePlus } from "react-icons/hi";
import LoadingDots from "@/components/shared/LoadingDots";
import DiagnosticQuestionFormModal from "@/components/Dashboard/DiagnosticQuestionFormModal";
import { diagnosticsApi } from "@/lib/api";
import type { DiagnosticQuestion } from "@/lib/api";

function reorderQuestionsList(
  items: DiagnosticQuestion[],
  fromId: number,
  toId: number
): DiagnosticQuestion[] {
  if (fromId === toId) return items;

  const fromIndex = items.findIndex((item) => item.id === fromId);
  const toIndex = items.findIndex((item) => item.id === toId);

  if (fromIndex === -1 || toIndex === -1) return items;

  const reordered = [...items];
  const [movedItem] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, movedItem);
  return reordered;
}

export default function DiagnosticQuestionsPage() {
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<DiagnosticQuestion | null>(null);
  const [creating, setCreating] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [hasPendingOrder, setHasPendingOrder] = useState(false);
  const [draggedQuestionId, setDraggedQuestionId] = useState<number | null>(null);
  const [dragOverQuestionId, setDragOverQuestionId] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await diagnosticsApi.listQuestions();
      setQuestions([...data].sort((a, b) => a.sort_order - b.sort_order));
      setHasPendingOrder(false);
      setDraggedQuestionId(null);
      setDragOverQuestionId(null);
    } catch {
      /* ignore: request() already redirects to login on 401 */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleToggleActive(question: DiagnosticQuestion) {
    setActionError("");
    try {
      const updated = await diagnosticsApi.updateQuestion(question.id, { is_active: !question.is_active });
      setQuestions((prev) => prev.map((q) => (q.id === question.id ? updated : q)));
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "No se pudo actualizar el estado de la pregunta");
    }
  }

  function handleReorder(fromId: number, toId: number) {
    setQuestions((prev) => reorderQuestionsList(prev, fromId, toId));
    setHasPendingOrder(true);
    setActionError("");
  }

  async function handleSaveOrder() {
    setSavingOrder(true);
    setActionError("");

    try {
      await diagnosticsApi.reorderQuestions(questions.map((question) => question.id));
      await loadData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "No se pudo guardar el nuevo orden");
    } finally {
      setSavingOrder(false);
    }
  }

  async function handleDiscardOrder() {
    setActionError("");
    await loadData();
  }

  return (
    <>
      <div className="mx-auto max-w-4xl p-4 md:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-montserrat-bold text-2xl text-dark-blue">Preguntas del Diagnostico</h1>
            <p className="mt-0.5 font-montserrat text-sm text-dark-blue/50">
              Administra el orden, contenido y opciones de Diagnostico GO
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasPendingOrder && (
              <>
                <button
                  onClick={handleDiscardOrder}
                  disabled={savingOrder}
                  className="rounded-xl border border-black/15 px-4 py-2.5 text-sm font-montserrat font-semibold text-dark-blue/70 transition-all hover:bg-beige disabled:opacity-50"
                >
                  Descartar cambios
                </button>
                <button
                  onClick={handleSaveOrder}
                  disabled={savingOrder}
                  className="rounded-xl bg-lyratech-green px-4 py-2.5 text-sm font-montserrat font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-50"
                >
                  {savingOrder ? "Guardando..." : "Guardar orden"}
                </button>
              </>
            )}

            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 rounded-xl bg-lyratech-purple px-4 py-2.5 text-sm font-montserrat font-semibold text-white shadow-button transition-all hover:scale-[1.02] hover:bg-button-light-purple"
            >
              <HiOutlinePlus size={16} />
              Nueva pregunta
            </button>
          </div>
        </div>

        {actionError && (
          <div className="mb-4 rounded-lg border border-red/30 bg-red/10 px-4 py-2.5 text-sm font-montserrat text-red">
            {actionError}
          </div>
        )}

        {hasPendingOrder && (
          <div className="mb-4 rounded-xl border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm font-montserrat text-amber-900">
            Reacomoda las preguntas con drag and drop y guarda al final para aplicar el nuevo orden.
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <LoadingDots />
            </div>
          ) : questions.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-montserrat text-sm text-dark-blue/40">Aun no hay preguntas</p>
            </div>
          ) : (
            <ul className="divide-y divide-black/5">
              {questions.map((question, index) => {
                const isDragged = draggedQuestionId === question.id;
                const isDragOver = dragOverQuestionId === question.id && draggedQuestionId !== question.id;

                return (
                  <li
                    key={question.id}
                    draggable={!savingOrder}
                    onDragStart={() => {
                      setDraggedQuestionId(question.id);
                      setDragOverQuestionId(question.id);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (draggedQuestionId !== null && draggedQuestionId !== question.id) {
                        setDragOverQuestionId(question.id);
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (draggedQuestionId !== null && draggedQuestionId !== question.id) {
                        handleReorder(draggedQuestionId, question.id);
                      }
                      setDraggedQuestionId(null);
                      setDragOverQuestionId(null);
                    }}
                    onDragEnd={() => {
                      setDraggedQuestionId(null);
                      setDragOverQuestionId(null);
                    }}
                    className={`flex items-center gap-3 px-4 py-3.5 transition-all ${
                      isDragged ? "cursor-grabbing opacity-60" : "cursor-grab"
                    } ${isDragOver ? "bg-lyratech-purple/5" : ""}`}
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-beige text-dark-blue/45">
                      <HiOutlineMenuAlt4 size={18} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-dark-blue/5 px-2 py-1 text-[11px] font-montserrat font-semibold text-dark-blue/55">
                          {index + 1}
                        </span>
                        <p className="truncate font-montserrat text-sm font-semibold text-dark-blue">
                          {question.config_json.labels.es || question.key}
                        </p>
                      </div>
                      <p className="mt-1 font-montserrat text-xs text-dark-blue/40">
                        {question.key} · {question.type}
                      </p>
                    </div>

                    <button
                      onClick={() => handleToggleActive(question)}
                      className={`rounded-full px-3 py-1.5 text-xs font-montserrat font-semibold transition-colors ${
                        question.is_active ? "bg-lyratech-green/10 text-lyratech-green" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {question.is_active ? "Activa" : "Inactiva"}
                    </button>

                    <button
                      onClick={() => setEditing(question)}
                      className="rounded-lg p-1.5 text-lyratech-purple transition-colors hover:bg-lyratech-purple/10"
                      title="Editar"
                    >
                      <HiOutlinePencil size={15} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {(editing || creating) && (
        <DiagnosticQuestionFormModal
          editing={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            setEditing(null);
            setCreating(false);
            loadData();
          }}
        />
      )}
    </>
  );
}
