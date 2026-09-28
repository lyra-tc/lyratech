"use client";

import React, { useRef, useState } from "react";
import { HiOutlineCheck, HiOutlineX } from "react-icons/hi";
import DiscardChangesDialog from "@/components/shared/DiscardChangesDialog";
import PortfolioFileField from "@/components/Dashboard/PortfolioFileField";
import PortfolioTechInput from "@/components/Dashboard/PortfolioTechInput";
import ProjectCard from "@/components/Portfolio/ProjectCard";
import ProjectLinkButtons from "@/components/Portfolio/ProjectLinkButtons";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useObjectUrl } from "@/hooks/useObjectUrl";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { portfolioApi } from "@/lib/api";
import type { PortfolioProjectAdmin } from "@/lib/api";
import { deepEqual } from "@/lib/deepEqual";
import {
  APP_STORE_HOST,
  PLAY_STORE_HOST,
  PORTFOLIO_CATEGORIES,
  PORTFOLIO_CATEGORY_LABELS,
  PORTFOLIO_DESCRIPTION_MAX,
  PORTFOLIO_LINK_TYPES,
  PORTFOLIO_LINK_TYPE_LABELS,
  PORTFOLIO_LOCALES,
  PORTFOLIO_LOGO_ACCEPT,
  PORTFOLIO_LOGO_MAX_BYTES,
  PORTFOLIO_NAME_MAX,
  PORTFOLIO_URL_MAX,
  PORTFOLIO_VIDEO_ACCEPT,
  PORTFOLIO_VIDEO_MAX_BYTES,
  type PortfolioCategory,
  type PortfolioLinkType,
  type PortfolioLocale,
} from "@/lib/portfolioConstants";

interface FormState {
  name: string;
  descriptions: Record<PortfolioLocale, string>;
  technologies: string[];
  categories: PortfolioCategory[];
  link_type: PortfolioLinkType;
  website_url: string;
  play_store_url: string;
  app_store_url: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  descriptions: { es: "", en: "", fr: "", de: "" },
  technologies: [],
  categories: [],
  link_type: "website",
  website_url: "",
  play_store_url: "",
  app_store_url: "",
};

// The dashboard lives outside the next-intl provider, so the preview gets fixed Spanish labels.
const PREVIEW_LABELS = {
  visit: "Ver proyecto",
  playStore: "Google Play",
  appStore: "App Store",
  watchVideo: "Ver video",
  closeVideo: "Cerrar video",
};

const INPUT_BASE =
  "w-full border rounded-xl px-4 py-2.5 text-sm font-montserrat text-dark-blue outline-none transition-all";
const INPUT_OK = "border-black/15 focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple";
const INPUT_ERROR = "border-red bg-red/5 focus:border-red focus:ring-1 focus:ring-red";

function toFormState(project: PortfolioProjectAdmin): FormState {
  return {
    name: project.name,
    descriptions: { ...project.descriptions },
    technologies: [...project.technologies],
    categories: [...project.categories],
    link_type: project.link_type,
    website_url: project.website_url ?? "",
    play_store_url: project.play_store_url ?? "",
    app_store_url: project.app_store_url ?? "",
  };
}

function isHttpUrl(value: string, host?: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && (!host || url.hostname === host);
  } catch {
    return false;
  }
}

function validate(form: FormState, hasLogo: boolean, hasVideo: boolean): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = "El nombre es requerido";
  for (const locale of PORTFOLIO_LOCALES) {
    if (!form.descriptions[locale].trim()) errors[`description_${locale}`] = "La descripción es requerida";
  }
  if (form.categories.length === 0) errors.categories = "Selecciona al menos una categoría";
  if (!hasLogo) errors.logo = "El logo es requerido";
  if (form.link_type === "website" && !isHttpUrl(form.website_url.trim())) {
    errors.website_url = "Ingresa una URL válida (https://...)";
  }
  if (form.link_type === "store") {
    const play = form.play_store_url.trim();
    const apple = form.app_store_url.trim();
    if (!play && !apple) errors.store = "Agrega al menos un link de Play Store o App Store";
    if (play && !isHttpUrl(play, PLAY_STORE_HOST)) errors.play_store_url = `Debe ser un link de ${PLAY_STORE_HOST}`;
    if (apple && !isHttpUrl(apple, APP_STORE_HOST)) errors.app_store_url = `Debe ser un link de ${APP_STORE_HOST}`;
  }
  if (form.link_type === "video" && !hasVideo) errors.video = "Sube un video";
  return errors;
}

function buildFormData(form: FormState, logoFile: File | null, videoFile: File | null): FormData {
  const body = new FormData();
  body.append("name", form.name.trim());
  for (const locale of PORTFOLIO_LOCALES) {
    body.append(`description_${locale}`, form.descriptions[locale].trim());
  }
  body.append("technologies", JSON.stringify(form.technologies));
  body.append("categories", JSON.stringify(form.categories));
  body.append("link_type", form.link_type);
  // Always sent (possibly empty) so a PATCH can clear a URL. A field that
  // doesn't belong to the selected link type is sent empty even if it still
  // holds text from a previous selection — otherwise the backend validates a
  // stray, invisible value (e.g. a half-typed App Store URL left over after
  // switching to "Sitio web") and rejects the whole save with a 422.
  body.append("website_url", form.link_type === "website" ? form.website_url.trim() : "");
  body.append("play_store_url", form.link_type === "store" ? form.play_store_url.trim() : "");
  body.append("app_store_url", form.link_type === "store" ? form.app_store_url.trim() : "");
  if (logoFile) body.append("logo", logoFile);
  if (videoFile && form.link_type === "video") body.append("video", videoFile);
  return body;
}

interface PortfolioFormModalProps {
  editing: PortfolioProjectAdmin | null;
  onClose: () => void;
  onSaved: (project: PortfolioProjectAdmin) => void;
}

export default function PortfolioFormModal({ editing, onClose, onSaved }: PortfolioFormModalProps) {
  useScrollLock();
  const initialFormRef = useRef<FormState>(editing ? toFormState(editing) : EMPTY_FORM);
  const [form, setForm] = useState<FormState>(initialFormRef.current);
  const [activeLocale, setActiveLocale] = useState<PortfolioLocale>("es");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const logoPreview = useObjectUrl(logoFile) ?? editing?.logo_url ?? null;
  const videoPreview = useObjectUrl(videoFile) ?? editing?.video_url ?? null;

  const isDirty = !deepEqual(form, initialFormRef.current) || logoFile !== null || videoFile !== null;
  const { requestClose, confirmOpen, confirmDiscard, cancelDiscard } = useUnsavedChangesGuard({
    isDirty,
    onClose,
  });
  useEscapeKey(requestClose, !confirmOpen && !saving);

  function patch(changes: Partial<FormState>, ...clearErrors: string[]) {
    setForm((prev) => ({ ...prev, ...changes }));
    if (clearErrors.length) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        for (const key of clearErrors) delete next[key];
        return next;
      });
    }
  }

  function setFieldError(key: string, message: string) {
    setFieldErrors((prev) => ({ ...prev, [key]: message }));
  }

  function toggleCategory(category: PortfolioCategory) {
    const next = form.categories.includes(category)
      ? form.categories.filter((c) => c !== category)
      : [...form.categories, category];
    patch({ categories: next }, "categories");
  }

  async function handleSave() {
    const errors = validate(form, Boolean(logoPreview), Boolean(videoPreview));
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      const localeWithError = PORTFOLIO_LOCALES.find((locale) => errors[`description_${locale}`]);
      if (localeWithError) setActiveLocale(localeWithError);
      return;
    }
    setSaving(true);
    setFormError("");
    setProgress(videoFile ? 0 : null);
    try {
      const body = buildFormData(form, logoFile, videoFile);
      const saved = editing
        ? await portfolioApi.update(editing.id, body, setProgress)
        : await portfolioApi.create(body, setProgress);
      onSaved(saved);
      onClose();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
      setProgress(null);
    }
  }

  const description = form.descriptions[activeLocale];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button
          type="button"
          aria-label="Cerrar"
          onClick={requestClose}
          className="fixed inset-0 bg-dark-blue/60 backdrop-blur-sm cursor-default"
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="portfolio-form-modal-title"
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto animate-scale-in"
        >
          <div className="flex items-center justify-between p-6 border-b border-black/5">
            <h2 id="portfolio-form-modal-title" className="font-montserrat-bold text-dark-blue text-lg">
              {editing ? "Editar proyecto" : "Nuevo proyecto"}
            </h2>
            <button
              onClick={requestClose}
              aria-label="Cerrar"
              className="p-1.5 rounded-lg hover:bg-beige text-dark-blue/50 hover:text-dark-blue transition-colors"
            >
              <HiOutlineX size={18} />
            </button>
          </div>

          <div className="p-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* --- Formulario --- */}
            <div className="space-y-5">
              {/* Logo */}
              <div>
                <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">
                  Logo <span className="text-red">*</span>
                </label>
                <PortfolioFileField
                  kind="image"
                  accept={PORTFOLIO_LOGO_ACCEPT}
                  maxBytes={PORTFOLIO_LOGO_MAX_BYTES}
                  previewUrl={logoPreview}
                  fileName={logoFile?.name ?? null}
                  helpText="PNG, JPG, WebP o SVG · máx. 2 MB"
                  hasError={Boolean(fieldErrors.logo)}
                  onSelect={(file) => {
                    setLogoFile(file);
                    setFieldError("logo", "");
                  }}
                  onError={(message) => setFieldError("logo", message)}
                />
                {fieldErrors.logo && <p className="text-red text-xs font-montserrat mt-1">{fieldErrors.logo}</p>}
              </div>

              {/* Nombre */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="font-montserrat text-dark-blue/70 text-sm">
                    Nombre <span className="text-red">*</span>
                  </label>
                  <span className="font-montserrat text-dark-blue/50 text-xs">
                    {form.name.length}/{PORTFOLIO_NAME_MAX}
                  </span>
                </div>
                <input
                  type="text"
                  value={form.name}
                  maxLength={PORTFOLIO_NAME_MAX}
                  onChange={(e) => patch({ name: e.target.value }, "name")}
                  className={`${INPUT_BASE} ${fieldErrors.name ? INPUT_ERROR : INPUT_OK}`}
                  placeholder="Nombre del proyecto"
                />
                {fieldErrors.name && <p className="text-red text-xs font-montserrat mt-1">{fieldErrors.name}</p>}
              </div>

              {/* Descripción por idioma */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="font-montserrat text-dark-blue/70 text-sm">
                    Descripción <span className="text-red">*</span>
                  </label>
                  <div className="flex gap-1">
                    {PORTFOLIO_LOCALES.map((locale) => {
                      const hasError = Boolean(fieldErrors[`description_${locale}`]);
                      return (
                        <button
                          key={locale}
                          type="button"
                          onClick={() => setActiveLocale(locale)}
                          className={`font-montserrat text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                            activeLocale === locale
                              ? "bg-lyratech-purple text-white"
                              : hasError
                                ? "bg-red/10 text-red"
                                : "bg-beige text-dark-blue/60 hover:text-dark-blue"
                          }`}
                        >
                          {locale.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <textarea
                  value={description}
                  maxLength={PORTFOLIO_DESCRIPTION_MAX}
                  rows={3}
                  onChange={(e) =>
                    patch(
                      { descriptions: { ...form.descriptions, [activeLocale]: e.target.value } },
                      `description_${activeLocale}`
                    )
                  }
                  className={`${INPUT_BASE} resize-none ${
                    fieldErrors[`description_${activeLocale}`] ? INPUT_ERROR : INPUT_OK
                  }`}
                  placeholder={`Descripción en ${activeLocale.toUpperCase()}`}
                />
                <div className="flex justify-between mt-1">
                  <p className="text-red text-xs font-montserrat">
                    {PORTFOLIO_LOCALES.some((l) => fieldErrors[`description_${l}`])
                      ? "Completa la descripción en los 4 idiomas"
                      : ""}
                  </p>
                  <p className="text-dark-blue/50 text-xs font-montserrat">
                    {description.length}/{PORTFOLIO_DESCRIPTION_MAX}
                  </p>
                </div>
              </div>

              {/* Tecnologías */}
              <div>
                <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">Tecnologías</label>
                <PortfolioTechInput
                  value={form.technologies}
                  onChange={(technologies) => patch({ technologies })}
                />
              </div>

              {/* Categorías */}
              <div>
                <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">
                  Categorías <span className="text-red">*</span>
                </label>
                <div className="flex flex-wrap gap-4">
                  {PORTFOLIO_CATEGORIES.map((category) => (
                    <label key={category} className="flex items-center gap-2 font-montserrat text-sm text-dark-blue">
                      <input
                        type="checkbox"
                        checked={form.categories.includes(category)}
                        onChange={() => toggleCategory(category)}
                        className="accent-lyratech-purple w-4 h-4"
                      />
                      {PORTFOLIO_CATEGORY_LABELS[category]}
                    </label>
                  ))}
                </div>
                {fieldErrors.categories && (
                  <p className="text-red text-xs font-montserrat mt-1">{fieldErrors.categories}</p>
                )}
              </div>

              {/* Tipo de enlace */}
              <div>
                <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">
                  Tipo de enlace <span className="text-red">*</span>
                </label>
                <div className="grid grid-cols-3 gap-1 bg-beige rounded-xl p-1">
                  {PORTFOLIO_LINK_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => patch({ link_type: type }, "website_url", "store", "play_store_url", "app_store_url", "video")}
                      className={`font-montserrat text-sm font-semibold py-2 rounded-lg transition-colors ${
                        form.link_type === type ? "bg-white text-lyratech-purple shadow-sm" : "text-dark-blue/60"
                      }`}
                    >
                      {PORTFOLIO_LINK_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
                {editing?.video_url && form.link_type !== "video" && (
                  <p className="text-dark-blue/60 text-xs font-montserrat mt-1.5">
                    Al guardar se eliminará el video actual.
                  </p>
                )}
              </div>

              {form.link_type === "website" && (
                <div>
                  <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">
                    URL del sitio <span className="text-red">*</span>
                  </label>
                  <input
                    type="url"
                    value={form.website_url}
                    maxLength={PORTFOLIO_URL_MAX}
                    onChange={(e) => patch({ website_url: e.target.value }, "website_url")}
                    className={`${INPUT_BASE} ${fieldErrors.website_url ? INPUT_ERROR : INPUT_OK}`}
                    placeholder="https://ejemplo.com"
                  />
                  {fieldErrors.website_url && (
                    <p className="text-red text-xs font-montserrat mt-1">{fieldErrors.website_url}</p>
                  )}
                </div>
              )}

              {form.link_type === "store" && (
                <div className="space-y-3">
                  <div>
                    <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">Play Store</label>
                    <input
                      type="url"
                      value={form.play_store_url}
                      maxLength={PORTFOLIO_URL_MAX}
                      onChange={(e) => patch({ play_store_url: e.target.value }, "play_store_url", "store")}
                      className={`${INPUT_BASE} ${fieldErrors.play_store_url || fieldErrors.store ? INPUT_ERROR : INPUT_OK}`}
                      placeholder="https://play.google.com/store/apps/details?id=..."
                    />
                    {fieldErrors.play_store_url && (
                      <p className="text-red text-xs font-montserrat mt-1">{fieldErrors.play_store_url}</p>
                    )}
                  </div>
                  <div>
                    <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">App Store</label>
                    <input
                      type="url"
                      value={form.app_store_url}
                      maxLength={PORTFOLIO_URL_MAX}
                      onChange={(e) => patch({ app_store_url: e.target.value }, "app_store_url", "store")}
                      className={`${INPUT_BASE} ${fieldErrors.app_store_url || fieldErrors.store ? INPUT_ERROR : INPUT_OK}`}
                      placeholder="https://apps.apple.com/mx/app/..."
                    />
                    {fieldErrors.app_store_url && (
                      <p className="text-red text-xs font-montserrat mt-1">{fieldErrors.app_store_url}</p>
                    )}
                  </div>
                  {fieldErrors.store && <p className="text-red text-xs font-montserrat">{fieldErrors.store}</p>}
                </div>
              )}

              {form.link_type === "video" && (
                <div>
                  <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">
                    Video <span className="text-red">*</span>
                  </label>
                  <PortfolioFileField
                    kind="video"
                    accept={PORTFOLIO_VIDEO_ACCEPT}
                    maxBytes={PORTFOLIO_VIDEO_MAX_BYTES}
                    previewUrl={videoPreview}
                    fileName={videoFile?.name ?? null}
                    helpText="MP4 o WebM · máx. 50 MB"
                    hasError={Boolean(fieldErrors.video)}
                    onSelect={(file) => {
                      setVideoFile(file);
                      setFieldError("video", "");
                    }}
                    onError={(message) => setFieldError("video", message)}
                  />
                  {fieldErrors.video && <p className="text-red text-xs font-montserrat mt-1">{fieldErrors.video}</p>}
                </div>
              )}

              {progress !== null && (
                <div>
                  <div className="h-2 w-full bg-beige rounded-full overflow-hidden">
                    <div className="h-full bg-lyratech-purple transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-dark-blue/50 text-xs font-montserrat mt-1">
                    {progress === 100 ? "Procesando…" : `Subiendo… ${progress}%`}
                  </p>
                </div>
              )}

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
                  {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear proyecto"}
                </button>
              </div>
            </div>

            {/* --- Vista previa --- */}
            <div className="lg:sticky lg:top-0 self-start">
              <p className="font-montserrat text-dark-blue/70 text-sm mb-1.5">
                Vista previa ({activeLocale.toUpperCase()})
              </p>
              <div className="max-w-[340px]">
                <ProjectCard
                  name={form.name || "Nombre del proyecto"}
                  description={description || "La descripción aparecerá aquí."}
                  technologies={form.technologies}
                  logoUrl={logoPreview ?? ""}
                  actions={
                    <ProjectLinkButtons
                      project={{
                        name: form.name,
                        link_type: form.link_type,
                        website_url: form.website_url || null,
                        play_store_url: form.play_store_url || null,
                        app_store_url: form.app_store_url || null,
                        video_url: videoPreview,
                      }}
                      labels={PREVIEW_LABELS}
                      variant="icon"
                    />
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <DiscardChangesDialog open={confirmOpen} onConfirm={confirmDiscard} onCancel={cancelDiscard} />
    </>
  );
}
