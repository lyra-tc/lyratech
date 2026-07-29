"use client";

import React, { useState } from "react";
import { HiOutlineX, HiOutlineCheck, HiOutlinePlus, HiOutlineTrash } from "react-icons/hi";
import { diagnosticsApi } from "@/lib/api";
import type {
  DiagnosticQuestion,
  DiagnosticQuestionConfig,
  DiagnosticQuestionInput,
  DiagnosticQuestionOption,
} from "@/lib/api";

interface DiagnosticQuestionFormModalProps {
  editing: DiagnosticQuestion | null;
  onClose: () => void;
  onSaved: () => void;
}

// Options need a stable client-side identity for React keys — the DB `value`
// field is user-editable and may be blank/duplicated mid-edit, so it can't be
// used as a key without risking stale-input-focus bugs when options are removed.
interface OptionWithClientId extends DiagnosticQuestionOption {
  _clientId: string;
}

interface FormConfig extends Omit<DiagnosticQuestionConfig, "options"> {
  options: OptionWithClientId[];
}

interface FormState extends Omit<DiagnosticQuestionInput, "config_json"> {
  config_json: FormConfig;
}

const LOCALES: Array<"es" | "en" | "fr" | "de"> = ["es", "en", "fr", "de"];
const SERVICE_KEYS = ["process_automation", "fixed_price_project", "dedicated_team"] as const;

function generateClientId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `opt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function emptyOption(): OptionWithClientId {
  return {
    _clientId: generateClientId(),
    value: "",
    labels: { es: "", en: "", fr: "", de: "" },
    score_weights: { process_automation: 0, fixed_price_project: 0, dedicated_team: 0 },
  };
}

function toFormValues(question: DiagnosticQuestion | null): FormState {
  if (question) {
    return {
      key: question.key,
      type: question.type,
      sort_order: question.sort_order,
      is_active: question.is_active,
      is_required: question.is_required,
      config_json: {
        ...question.config_json,
        options: question.config_json.options.map((option) => ({
          ...option,
          _clientId: generateClientId(),
        })),
      },
    };
  }
  return {
    key: "",
    type: "single_choice",
    sort_order: 0,
    is_active: true,
    is_required: true,
    config_json: {
      labels: { es: "", en: "", fr: "", de: "" },
      placeholder: { es: "", en: "", fr: "", de: "" },
      help_text: { es: "", en: "", fr: "", de: "" },
      options: [emptyOption()],
    },
  };
}

function toApiOptions(options: OptionWithClientId[]): DiagnosticQuestionOption[] {
  return options.map((option) => ({
    value: option.value,
    labels: option.labels,
    score_weights: option.score_weights,
  }));
}

function validateOptions(options: OptionWithClientId[]): string | null {
  const trimmedValues = options.map((option) => option.value.trim());
  const hasEmpty = trimmedValues.some((value) => !value);
  const hasDuplicates = new Set(trimmedValues).size !== trimmedValues.length;
  if (hasEmpty || hasDuplicates) {
    return "Cada opción necesita un valor único y no vacío";
  }
  return null;
}

export default function DiagnosticQuestionFormModal({
  editing,
  onClose,
  onSaved,
}: DiagnosticQuestionFormModalProps) {
  const [form, setForm] = useState<FormState>(toFormValues(editing));
  const [activeLocale, setActiveLocale] = useState<"es" | "en" | "fr" | "de">("es");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  function updateLabel(locale: string, value: string) {
    setForm((prev) => ({
      ...prev,
      config_json: { ...prev.config_json, labels: { ...prev.config_json.labels, [locale]: value } },
    }));
  }

  function updateOption(index: number, updater: (opt: OptionWithClientId) => OptionWithClientId) {
    setForm((prev) => ({
      ...prev,
      config_json: {
        ...prev.config_json,
        options: prev.config_json.options.map((opt, i) => (i === index ? updater(opt) : opt)),
      },
    }));
  }

  function addOption() {
    setForm((prev) => ({
      ...prev,
      config_json: { ...prev.config_json, options: [...prev.config_json.options, emptyOption()] },
    }));
  }

  function removeOption(index: number) {
    setForm((prev) => ({
      ...prev,
      config_json: { ...prev.config_json, options: prev.config_json.options.filter((_, i) => i !== index) },
    }));
  }

  async function handleSave() {
    if (!form.key.trim()) {
      setFormError("La clave (key) es requerida");
      return;
    }
    if (form.type !== "open_text") {
      const optionsError = validateOptions(form.config_json.options);
      if (optionsError) {
        setFormError(optionsError);
        return;
      }
    }
    setSaving(true);
    setFormError("");
    try {
      const payload: DiagnosticQuestionInput = {
        ...form,
        config_json: {
          ...form.config_json,
          options: toApiOptions(form.config_json.options),
        },
      };
      if (editing) {
        await diagnosticsApi.updateQuestion(editing.id, payload);
      } else {
        await diagnosticsApi.createQuestion(payload);
      }
      onSaved();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="fixed inset-0 bg-dark-blue/60 backdrop-blur-sm cursor-default"
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-black/5">
          <h2 className="font-montserrat-bold text-dark-blue text-lg">
            {editing ? "Editar pregunta" : "Nueva pregunta"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-beige text-dark-blue/50 hover:text-dark-blue transition-colors">
            <HiOutlineX size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">Clave (key)</label>
              <input
                type="text"
                value={form.key}
                disabled={!!editing}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                className="w-full border border-black/15 rounded-xl px-4 py-2.5 text-sm font-montserrat text-dark-blue outline-none focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple transition-all disabled:bg-beige disabled:text-dark-blue/50"
                placeholder="main_goal"
              />
            </div>
            <div>
              <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">Tipo</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border border-black/15 rounded-xl px-4 py-2.5 text-sm font-montserrat text-dark-blue outline-none focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple transition-all"
              >
                <option value="single_choice">Selección simple</option>
                <option value="multi_choice">Selección múltiple</option>
                <option value="open_text">Texto abierto</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 font-montserrat text-dark-blue/70 text-sm">
              <input
                type="checkbox"
                checked={form.is_required}
                onChange={(e) => setForm({ ...form, is_required: e.target.checked })}
              />
              Requerida
            </label>
            <label className="flex items-center gap-2 font-montserrat text-dark-blue/70 text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              Activa
            </label>
          </div>

          <div>
            <div className="flex gap-2 mb-2">
              {LOCALES.map((locale) => (
                <button
                  key={locale}
                  type="button"
                  onClick={() => setActiveLocale(locale)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-montserrat font-semibold uppercase transition-colors ${
                    activeLocale === locale ? "bg-lyratech-purple text-white" : "bg-beige text-dark-blue/60"
                  }`}
                >
                  {locale}
                </button>
              ))}
            </div>
            <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">
              Texto de la pregunta ({activeLocale})
            </label>
            <input
              type="text"
              value={form.config_json.labels[activeLocale] || ""}
              onChange={(e) => updateLabel(activeLocale, e.target.value)}
              className="w-full border border-black/15 rounded-xl px-4 py-2.5 text-sm font-montserrat text-dark-blue outline-none focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple transition-all"
            />
          </div>

          {form.type !== "open_text" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block font-montserrat text-dark-blue/70 text-sm">Opciones ({activeLocale})</label>
                <button onClick={addOption} className="flex items-center gap-1 text-xs font-montserrat font-semibold text-lyratech-purple">
                  <HiOutlinePlus size={14} />
                  Agregar opción
                </button>
              </div>
              <div className="space-y-3">
                {form.config_json.options.map((option, index) => (
                  <div key={option._clientId} className="border border-black/10 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={option.value}
                        onChange={(e) => updateOption(index, (opt) => ({ ...opt, value: e.target.value }))}
                        placeholder="value (clave estable en inglés)"
                        className="flex-1 border border-black/15 rounded-lg px-3 py-2 text-xs font-montserrat outline-none focus:border-lyratech-purple"
                      />
                      <button onClick={() => removeOption(index)} className="p-1.5 rounded-lg hover:bg-red/10 text-red">
                        <HiOutlineTrash size={14} />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={option.labels[activeLocale] || ""}
                      onChange={(e) =>
                        updateOption(index, (opt) => ({
                          ...opt,
                          labels: { ...opt.labels, [activeLocale]: e.target.value },
                        }))
                      }
                      placeholder={`Texto mostrado (${activeLocale})`}
                      className="w-full border border-black/15 rounded-lg px-3 py-2 text-xs font-montserrat outline-none focus:border-lyratech-purple"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      {SERVICE_KEYS.map((serviceKey) => (
                        <div key={serviceKey}>
                          <label className="block font-montserrat text-dark-blue/40 text-[10px] mb-1">{serviceKey}</label>
                          <input
                            type="number"
                            value={option.score_weights[serviceKey] ?? 0}
                            onChange={(e) =>
                              updateOption(index, (opt) => ({
                                ...opt,
                                score_weights: { ...opt.score_weights, [serviceKey]: Number(e.target.value) },
                              }))
                            }
                            className="w-full border border-black/15 rounded-lg px-2 py-1.5 text-xs font-montserrat outline-none focus:border-lyratech-purple"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
              {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear pregunta"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
