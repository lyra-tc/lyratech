"use client";

import React, { useCallback, useEffect, useState } from "react";
import { HiOutlinePlus, HiOutlinePencil, HiChevronUp, HiChevronDown } from "react-icons/hi";
import LoadingDots from "@/components/shared/LoadingDots";
import DiagnosticQuestionFormModal from "@/components/Dashboard/DiagnosticQuestionFormModal";
import { diagnosticsApi } from "@/lib/api";
import type { DiagnosticQuestion } from "@/lib/api";

export default function DiagnosticQuestionsPage() {
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<DiagnosticQuestion | null>(null);
  const [creating, setCreating] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [actionError, setActionError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await diagnosticsApi.listQuestions();
      setQuestions([...data].sort((a, b) => a.sort_order - b.sort_order));
    } catch {
      /* ignore — request() already redirects to login on 401 */
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

  async function handleMove(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    const reordered = [...questions];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setQuestions(reordered);
    setReordering(true);
    setActionError("");
    try {
      await diagnosticsApi.reorderQuestions(reordered.map((q) => q.id));
      await loadData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "No se pudo reordenar; se restauró el orden guardado");
      await loadData();
    } finally {
      setReordering(false);
    }
  }

  return (
    <>
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-montserrat-bold text-dark-blue text-2xl">Preguntas del Diagnóstico</h1>
            <p className="font-montserrat text-dark-blue/50 text-sm mt-0.5">
              Administra el orden, contenido y opciones de Diagnóstico GO
            </p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 bg-lyratech-purple hover:bg-button-light-purple text-white font-montserrat font-semibold px-4 py-2.5 rounded-xl transition-all text-sm shadow-button hover:scale-[1.02]"
          >
            <HiOutlinePlus size={16} />
            Nueva pregunta
          </button>
        </div>

        {actionError && (
          <div className="bg-red/10 border border-red/30 text-red rounded-lg px-4 py-2.5 text-sm font-montserrat mb-4">
            {actionError}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
          {loading ? (
            <div className="py-16 flex items-center justify-center">
              <LoadingDots />
            </div>
          ) : questions.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-montserrat text-dark-blue/40 text-sm">Aún no hay preguntas</p>
            </div>
          ) : (
            <ul className="divide-y divide-black/5">
              {questions.map((question, index) => (
                <li key={question.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="flex flex-col">
                    <button
                      onClick={() => handleMove(index, -1)}
                      disabled={index === 0 || reordering}
                      className="text-dark-blue/40 hover:text-dark-blue disabled:opacity-30"
                    >
                      <HiChevronUp size={14} />
                    </button>
                    <button
                      onClick={() => handleMove(index, 1)}
                      disabled={index === questions.length - 1 || reordering}
                      className="text-dark-blue/40 hover:text-dark-blue disabled:opacity-30"
                    >
                      <HiChevronDown size={14} />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-montserrat font-semibold text-dark-blue text-sm truncate">
                      {question.config_json.labels.es || question.key}
                    </p>
                    <p className="font-montserrat text-dark-blue/40 text-xs">
                      {question.key} · {question.type}
                    </p>
                  </div>

                  <button
                    onClick={() => handleToggleActive(question)}
                    className={`text-xs font-montserrat font-semibold px-3 py-1.5 rounded-full transition-colors ${
                      question.is_active ? "bg-lyratech-green/10 text-lyratech-green" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {question.is_active ? "Activa" : "Inactiva"}
                  </button>

                  <button
                    onClick={() => setEditing(question)}
                    className="p-1.5 rounded-lg hover:bg-lyratech-purple/10 text-lyratech-purple transition-colors"
                    title="Editar"
                  >
                    <HiOutlinePencil size={15} />
                  </button>
                </li>
              ))}
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
