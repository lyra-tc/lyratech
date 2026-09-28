"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  HiOutlineArrowDown,
  HiOutlineArrowUp,
  HiOutlinePencil,
  HiOutlinePlus,
  HiOutlineTrash,
} from "react-icons/hi";
import AdminOnly from "@/components/Dashboard/AdminOnly";
import PortfolioFormModal from "@/components/Dashboard/PortfolioFormModal";
import LoadingDots from "@/components/shared/LoadingDots";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useScrollLock } from "@/hooks/useScrollLock";
import { portfolioApi } from "@/lib/api";
import type { PortfolioProjectAdmin } from "@/lib/api";
import { PORTFOLIO_CATEGORY_LABELS, PORTFOLIO_LINK_TYPE_LABELS } from "@/lib/portfolioConstants";

function PortafolioPageInner() {
  const [projects, setProjects] = useState<PortfolioProjectAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // undefined = closed, null = creating, project = editing
  const [editing, setEditing] = useState<PortfolioProjectAdmin | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<PortfolioProjectAdmin | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEscapeKey(() => setDeleteTarget(null), deleteTarget !== null && !deleting);
  useScrollLock(deleteTarget !== null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProjects(await portfolioApi.listAdmin());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el portafolio");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function runRowAction(id: number, action: () => Promise<void>) {
    // Only one row action at a time: prevents overlapping order/publish
    // mutations that would race and leave the list out of sync.
    if (busyId !== null) return;
    setBusyId(id);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar");
    } finally {
      setBusyId(null);
    }
  }

  const move = (project: PortfolioProjectAdmin, direction: "up" | "down") =>
    runRowAction(project.id, async () => setProjects(await portfolioApi.move(project.id, direction)));

  const togglePublished = (project: PortfolioProjectAdmin) =>
    runRowAction(project.id, async () => {
      const updated = await portfolioApi.setPublished(project.id, !project.is_published);
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    });

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await portfolioApi.remove(deleteTarget.id);
      setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  function handleSaved(saved: PortfolioProjectAdmin) {
    setProjects((prev) =>
      prev.some((p) => p.id === saved.id)
        ? prev.map((p) => (p.id === saved.id ? saved : p))
        : [...prev, saved]
    );
  }

  return (
    <>
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-montserrat-bold text-dark-blue text-2xl">Portafolio</h1>
            <p className="font-montserrat text-dark-blue/50 text-sm mt-0.5">
              Proyectos que se muestran en el Home y en /portfolio
            </p>
          </div>
          <button
            onClick={() => setEditing(null)}
            className="flex items-center gap-2 bg-lyratech-purple hover:bg-button-light-purple text-white font-montserrat font-semibold px-4 py-2.5 rounded-xl transition-all duration-200 shadow-button hover:scale-[1.02] text-sm"
          >
            <HiOutlinePlus size={16} />
            Nuevo proyecto
          </button>
        </div>

        {error && (
          <div className="bg-red/10 border border-red/30 text-red rounded-lg px-4 py-2.5 text-sm font-montserrat mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingDots />
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-10 text-center font-montserrat text-dark-blue/50 text-sm">
            Aún no hay proyectos. Crea el primero con &quot;Nuevo proyecto&quot;.
          </div>
        ) : (
          <ul className="space-y-3">
            {projects.map((project, index) => {
              // Locks every row's actions while any row action is in flight —
              // not just this row's — so move/publish/delete can't overlap.
              const busy = busyId !== null;
              return (
                <li
                  key={project.id}
                  className={`bg-white rounded-2xl shadow-sm border border-black/5 p-4 flex flex-col md:flex-row md:items-center gap-4 ${
                    project.is_published ? "" : "opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="relative w-16 h-16 shrink-0 rounded-xl bg-gray-50 border border-black/5">
                      <Image src={project.logo_url} alt={project.name} fill className="object-contain p-2" unoptimized />
                    </div>
                    <div className="min-w-0">
                      <p className="font-montserrat-bold text-dark-blue truncate">{project.name}</p>
                      <p className="font-montserrat text-dark-blue/50 text-xs truncate">{project.descriptions.es}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <span className="font-montserrat text-[11px] bg-lyratech-purple/10 text-lyratech-purple rounded-full px-2 py-0.5">
                          {PORTFOLIO_LINK_TYPE_LABELS[project.link_type]}
                        </span>
                        {project.categories.map((c) => (
                          <span key={c} className="font-montserrat text-[11px] border border-black/10 text-dark-blue/60 rounded-full px-2 py-0.5">
                            {PORTFOLIO_CATEGORY_LABELS[c]}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 md:gap-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={project.is_published}
                      aria-label="Publicado"
                      disabled={busy}
                      onClick={() => togglePublished(project)}
                      className="flex items-center gap-2 font-montserrat text-xs text-dark-blue/70 disabled:opacity-50"
                    >
                      <span
                        className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
                          project.is_published ? "bg-lyratech-purple" : "bg-black/20"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                            project.is_published ? "translate-x-4" : "translate-x-0.5"
                          }`}
                        />
                      </span>
                      {project.is_published ? "Publicado" : "Oculto"}
                    </button>

                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        aria-label="Subir"
                        disabled={busy || index === 0}
                        onClick={() => move(project, "up")}
                        className="p-2 rounded-lg hover:bg-beige text-dark-blue/60 disabled:opacity-30"
                      >
                        <HiOutlineArrowUp size={16} />
                      </button>
                      <button
                        aria-label="Bajar"
                        disabled={busy || index === projects.length - 1}
                        onClick={() => move(project, "down")}
                        className="p-2 rounded-lg hover:bg-beige text-dark-blue/60 disabled:opacity-30"
                      >
                        <HiOutlineArrowDown size={16} />
                      </button>
                      <button
                        aria-label="Editar"
                        disabled={busy}
                        onClick={() => setEditing(project)}
                        className="p-2 rounded-lg hover:bg-beige text-dark-blue/60 disabled:opacity-30"
                      >
                        <HiOutlinePencil size={16} />
                      </button>
                      <button
                        aria-label="Eliminar"
                        disabled={busy}
                        onClick={() => setDeleteTarget(project)}
                        className="p-2 rounded-lg hover:bg-red/10 text-red disabled:opacity-30"
                      >
                        <HiOutlineTrash size={16} />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {editing !== undefined && (
        <PortfolioFormModal
          editing={editing}
          onClose={() => setEditing(undefined)}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => !deleting && setDeleteTarget(null)}
            className="fixed inset-0 bg-dark-blue/60 backdrop-blur-sm cursor-default"
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
            <h3 className="font-montserrat-bold text-dark-blue text-lg mb-2">Eliminar proyecto</h3>
            <p className="font-montserrat text-dark-blue/60 text-sm mb-6">
              ¿Seguro que deseas eliminar &quot;{deleteTarget.name}&quot;? Se borrarán también su logo y
              video. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 border border-black/15 text-dark-blue/70 font-montserrat font-semibold py-2.5 rounded-xl transition-all text-sm hover:bg-beige disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 bg-red hover:bg-dark-red text-white font-montserrat font-semibold py-2.5 rounded-xl transition-all text-sm disabled:opacity-50"
              >
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function PortafolioPage() {
  return (
    <AdminOnly>
      <PortafolioPageInner />
    </AdminOnly>
  );
}
