"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineCalendar,
} from "react-icons/hi";
import ProspectFormModal from "@/components/Dashboard/ProspectFormModal";
import ProspectViewModal from "@/components/Dashboard/ProspectViewModal";
import BookingModal from "@/components/shared/BookingModal";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useScrollLock } from "@/hooks/useScrollLock";
import LoadingDots from "@/components/shared/LoadingDots";
import Dropdown from "@/components/shared/Dropdown";
import Pagination from "@/components/shared/Pagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { prospectsApi } from "@/lib/api";
import type { Prospect, ProspectCreate, ProspectStatus, ProspectStats } from "@/lib/api";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/prospectConstants";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Todos los estados" },
  ...(Object.keys(STATUS_LABELS) as ProspectStatus[]).map((s) => ({ value: s, label: STATUS_LABELS[s] })),
];

const EMPTY_FORM: ProspectCreate = {
  name: "",
  email: "",
  phone: "",
  company: "",
  industry: "",
  service: "",
  status: "meeting_to_schedule",
  source: "",
  notes: "",
};

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProspectStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<ProspectStats | null>(null);
  const [loading, setLoading] = useState(true);
  const debouncedSearch = useDebouncedValue(search);
  const reqId = useRef(0);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Prospect | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [viewing, setViewing] = useState<Prospect | null>(null);
  const [bookingProspect, setBookingProspect] = useState<Prospect | null>(null);
  const [confirmBooked, setConfirmBooked] = useState<Prospect | null>(null);
  const [bookingError, setBookingError] = useState("");
  const [markingBooked, setMarkingBooked] = useState(false);

  useEscapeKey(() => setDeleteId(null), deleteId !== null);
  useEscapeKey(() => closeConfirmBooked(), confirmBooked !== null && !markingBooked);
  useScrollLock(deleteId !== null || confirmBooked !== null);

  const loadData = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    try {
      const data = await prospectsApi.list({
        page,
        pageSize,
        search: debouncedSearch,
        status: statusFilter === "all" ? "" : statusFilter,
      });
      if (id === reqId.current) {
        setProspects(data.items);
        setTotal(data.total);
      }
    } catch {
      /* ignore — request() already redirects to login on 401 */
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, statusFilter]);

  const loadStats = useCallback(async () => {
    try {
      setStats(await prospectsApi.stats());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(prospect: Prospect) {
    setEditing(prospect);
    setShowModal(true);
  }

  function handleSaved() {
    loadData();
    loadStats();
  }

  async function handleDelete(id: number) {
    try {
      await prospectsApi.remove(id);
      await loadData();
      loadStats();
    } catch { /* ignore */ } finally {
      setDeleteId(null);
    }
  }

  function closeConfirmBooked() {
    setConfirmBooked(null);
    setBookingError("");
  }

  function handleBookingClose() {
    const prospect = bookingProspect;
    setBookingProspect(null);
    if (prospect) {
      setBookingError("");
      setConfirmBooked(prospect);
    }
  }

  async function confirmMeetingScheduled(prospect: Prospect) {
    setMarkingBooked(true);
    setBookingError("");
    try {
      await prospectsApi.update(prospect.id, { status: "meeting_scheduled" });
      await loadData();
      loadStats();
      closeConfirmBooked();
    } catch (err: unknown) {
      setBookingError(err instanceof Error ? err.message : "Error al actualizar el estado");
    } finally {
      setMarkingBooked(false);
    }
  }

  const tiles = [
    { label: "Total", value: stats?.total ?? 0, color: "bg-dark-blue" },
    { label: "Agendar reunión", value: stats?.meeting_to_schedule ?? 0, color: "bg-blue" },
    { label: "Llamar más tarde", value: stats?.call_later ?? 0, color: "bg-yellow-500" },
    { label: "Reunión agendada", value: stats?.meeting_scheduled ?? 0, color: "bg-lyratech-purple" },
    { label: "Perdidos", value: stats?.lost ?? 0, color: "bg-red" },
  ];

  const emptyMessage =
    search || statusFilter !== "all"
      ? "No hay prospectos que coincidan con la búsqueda"
      : "Aún no hay prospectos. ¡Crea el primero!";

  let tableContent: React.ReactNode;
  if (loading) {
    tableContent = (
      <div className="py-16 flex items-center justify-center">
        <LoadingDots />
      </div>
    );
  } else if (prospects.length === 0) {
    tableContent = (
      <div className="py-16 text-center">
        <p className="font-montserrat text-dark-blue/40 text-sm">{emptyMessage}</p>
      </div>
    );
  } else {
    tableContent = (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-black/5 bg-beige/60">
              {["Nombre", "Empresa", "Contacto", "Servicio", "Estado", "Fuente", "Acciones"].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-montserrat-bold text-dark-blue/50 text-xs uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {prospects.map((prospect) => (
              <tr
                key={prospect.id}
                onClick={() => setViewing(prospect)}
                className="hover:bg-beige/40 transition-colors group cursor-pointer"
              >
                <td className="px-4 py-3.5">
                  <p className="font-montserrat font-semibold text-dark-blue text-sm">{prospect.name}</p>
                  <p className="font-montserrat text-dark-blue/40 text-xs mt-0.5">
                    {new Date(prospect.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </td>
                <td className="px-4 py-3.5">
                  <p className="font-montserrat text-dark-blue/70 text-sm">{prospect.company || "—"}</p>
                  {prospect.industry && (
                    <p className="font-montserrat text-dark-blue/40 text-xs mt-0.5">{prospect.industry}</p>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <p className="font-montserrat text-dark-blue/70 text-sm">{prospect.email || "—"}</p>
                  <p className="font-montserrat text-dark-blue/40 text-xs">{prospect.phone || ""}</p>
                </td>
                <td className="px-4 py-3.5">
                  <span className="font-montserrat text-dark-blue/60 text-sm">{prospect.service || "—"}</span>
                </td>
                <td className="px-4 py-3.5">
                  {prospect.status === "meeting_to_schedule" ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); setBookingProspect(prospect); }}
                      title="Agendar reunión"
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-montserrat font-semibold border transition-all hover:brightness-95 hover:scale-[1.03] ${STATUS_COLORS[prospect.status]}`}
                    >
                      <HiOutlineCalendar size={13} />
                      {STATUS_LABELS[prospect.status]}
                    </button>
                  ) : (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-montserrat font-semibold border ${STATUS_COLORS[prospect.status]}`}>
                      {STATUS_LABELS[prospect.status]}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <span className="font-montserrat text-dark-blue/60 text-sm">{prospect.source || "—"}</span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(prospect); }}
                      className="p-1.5 rounded-lg hover:bg-lyratech-purple/10 text-lyratech-purple transition-colors"
                      title="Editar"
                    >
                      <HiOutlinePencil size={15} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteId(prospect.id); }}
                      className="p-1.5 rounded-lg hover:bg-red/10 text-red transition-colors"
                      title="Eliminar"
                    >
                      <HiOutlineTrash size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      {/* Page content */}
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-montserrat-bold text-dark-blue text-2xl">Prospectos</h1>
            <p className="font-montserrat text-dark-blue/50 text-sm mt-0.5">
              Pipeline de prospectos
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-lyratech-purple hover:bg-button-light-purple text-white font-montserrat font-semibold px-4 py-2.5 rounded-xl transition-all duration-200 shadow-button hover:scale-[1.02] text-sm"
          >
            <HiOutlinePlus size={18} />
            <span className="hidden sm:block">Nuevo prospecto</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {tiles.map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl p-4 shadow-sm border border-black/5">
              <p className="font-montserrat text-dark-blue/50 text-xs mb-1">{label}</p>
              <div className="flex items-end gap-2">
                <span className="font-montserrat-bold text-dark-blue text-3xl">{value}</span>
                <div className={`w-2 h-2 rounded-full ${color} mb-1.5`} />
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-blue/30" size={16} />
            <input
              type="text"
              placeholder="Buscar por nombre, email o empresa..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-black/10 rounded-xl text-sm font-montserrat text-dark-blue placeholder-dark-blue/30 outline-none focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple transition-all"
            />
          </div>
          <div className="w-full sm:w-56">
            <Dropdown
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v as ProspectStatus | "all"); setPage(1); }}
              options={STATUS_FILTER_OPTIONS}
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
          {tableContent}
        </div>

        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        />
      </div>

      {/* View Modal */}
      {viewing && <ProspectViewModal prospect={viewing} onClose={() => setViewing(null)} />}

      {/* Booking Modal */}
      <BookingModal
        isOpen={bookingProspect !== null}
        onClose={handleBookingClose}
        title={bookingProspect ? `Agendar reunión con ${bookingProspect.name}` : "Agendar reunión"}
      />

      {/* Confirm meeting scheduled */}
      {confirmBooked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => !markingBooked && closeConfirmBooked()}
            className="fixed inset-0 bg-dark-blue/60 backdrop-blur-sm cursor-default"
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
            <h3 className="font-montserrat-bold text-dark-blue text-lg mb-2">¿Ya agendaste la reunión?</h3>
            <p className="font-montserrat text-dark-blue/60 text-sm mb-6">
              Marca a <span className="font-semibold text-dark-blue">{confirmBooked.name}</span> como{" "}
              <span className="font-semibold">Reunión agendada</span> si completaste el agendado en el calendario.
            </p>
            {bookingError && (
              <div className="bg-red/10 border border-red/30 text-red rounded-lg px-3 py-2 text-xs font-montserrat mb-4">
                {bookingError}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={closeConfirmBooked}
                disabled={markingBooked}
                className="flex-1 border border-black/15 text-dark-blue/70 font-montserrat font-semibold py-2.5 rounded-xl transition-all text-sm hover:bg-beige disabled:opacity-50"
              >
                Todavía no
              </button>
              <button
                onClick={() => confirmMeetingScheduled(confirmBooked)}
                disabled={markingBooked}
                className="flex-1 bg-lyratech-purple hover:bg-button-light-purple text-white font-montserrat font-semibold py-2.5 rounded-xl transition-all text-sm disabled:opacity-50"
              >
                {markingBooked ? "Guardando..." : "Sí, marcar como agendada"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <ProspectFormModal
          editing={editing}
          initialForm={EMPTY_FORM}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
          hideLostOnCreate
        />
      )}

      {/* Delete Confirm */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setDeleteId(null)}
            className="fixed inset-0 bg-dark-blue/60 backdrop-blur-sm cursor-default"
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
            <h3 className="font-montserrat-bold text-dark-blue text-lg mb-2">Eliminar prospecto</h3>
            <p className="font-montserrat text-dark-blue/60 text-sm mb-6">
              ¿Estás seguro que deseas eliminar este prospecto? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 border border-black/15 text-dark-blue/70 font-montserrat font-semibold py-2.5 rounded-xl transition-all text-sm hover:bg-beige"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 bg-red hover:bg-dark-red text-white font-montserrat font-semibold py-2.5 rounded-xl transition-all text-sm"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
