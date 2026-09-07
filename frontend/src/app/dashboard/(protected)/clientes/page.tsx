"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { HiOutlineSearch, HiOutlineTrash } from "react-icons/hi";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useScrollLock } from "@/hooks/useScrollLock";
import AdminOnly from "@/components/Dashboard/AdminOnly";
import LoadingDots from "@/components/shared/LoadingDots";
import Dropdown from "@/components/shared/Dropdown";
import Pagination from "@/components/shared/Pagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { clientsApi } from "@/lib/api";
import type { ClientListItem, ClientStats, ClientStatus } from "@/lib/api";
import { CLIENT_STATUS_LABELS, CLIENT_STATUS_COLORS } from "@/lib/clientConstants";
import { formatMXN } from "@/lib/format";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Todos los estados" },
  ...(Object.keys(CLIENT_STATUS_LABELS) as ClientStatus[]).map((s) => ({ value: s, label: CLIENT_STATUS_LABELS[s] })),
];

function ClientesPageInner() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [loading, setLoading] = useState(true);
  const debouncedSearch = useDebouncedValue(search);
  const reqId = useRef(0);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEscapeKey(() => setDeleteId(null), deleteId !== null);
  useScrollLock(deleteId !== null);

  const loadData = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    try {
      const data = await clientsApi.list({
        page,
        pageSize,
        search: debouncedSearch,
        status: statusFilter === "all" ? "" : statusFilter,
      });
      if (id === reqId.current) {
        setClients(data.items);
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
      setStats(await clientsApi.stats());
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

  async function handleDelete(id: number) {
    setDeleting(true);
    try {
      await clientsApi.remove(id);
      await loadData();
      loadStats();
    } catch {
      /* ignore */
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }

  const tiles: { label: string; value: React.ReactNode; color: string; money?: boolean }[] = [
    { label: "Total", value: stats?.total ?? 0, color: "bg-dark-blue" },
    { label: "Nuevo", value: stats?.by_status.nuevo ?? 0, color: "bg-blue" },
    { label: "En proceso", value: stats?.by_status.en_proceso ?? 0, color: "bg-yellow-500" },
    { label: "Con mantenimiento", value: stats?.by_status.con_mantenimiento ?? 0, color: "bg-lyratech-purple" },
    { label: "Cerrado", value: stats?.by_status.cerrado ?? 0, color: "bg-lyratech-green" },
    { label: "Perdido", value: stats?.by_status.perdido ?? 0, color: "bg-red" },
    { label: "Contratado", value: formatMXN(stats?.contratado_total), color: "bg-dark-blue", money: true },
    { label: "Cobrado", value: formatMXN(stats?.cobrado_total), color: "bg-lyratech-green", money: true },
  ];

  const emptyMessage =
    search || statusFilter !== "all"
      ? "No hay clientes que coincidan con la búsqueda"
      : "Aún no hay clientes. Transformá un prospecto para empezar.";

  let tableContent: React.ReactNode;
  if (loading) {
    tableContent = (
      <div className="py-16 flex items-center justify-center">
        <LoadingDots />
      </div>
    );
  } else if (clients.length === 0) {
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
              {["Nombre", "Empresa", "Responsable", "Estado", "Monto", "Cobrado", "Inicio", ""].map((h, i) => (
                <th
                  key={h || `col-${i}`}
                  className="text-left px-4 py-3 font-montserrat-bold text-dark-blue/50 text-xs uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {clients.map((c) => (
              <tr
                key={c.id}
                onClick={() => router.push(`/dashboard/clientes/${c.id}`)}
                className="hover:bg-beige/40 transition-colors group cursor-pointer"
              >
                <td className="px-4 py-3.5">
                  <p className="font-montserrat font-semibold text-dark-blue text-sm">{c.name}</p>
                  <p className="font-montserrat text-dark-blue/40 text-xs mt-0.5">
                    {new Date(c.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </td>
                <td className="px-4 py-3.5">
                  <p className="font-montserrat text-dark-blue/70 text-sm">{c.company || "—"}</p>
                  {c.industry && <p className="font-montserrat text-dark-blue/40 text-xs mt-0.5">{c.industry}</p>}
                </td>
                <td className="px-4 py-3.5">
                  <span className="font-montserrat text-dark-blue/70 text-sm">{c.responsable}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-montserrat font-semibold border ${CLIENT_STATUS_COLORS[c.status]}`}
                  >
                    {CLIENT_STATUS_LABELS[c.status]}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="font-montserrat text-dark-blue/70 text-sm">{formatMXN(c.project_amount)}</span>
                </td>
                <td className="px-4 py-3.5">
                  <p className="font-montserrat text-dark-blue/70 text-sm">{formatMXN(c.paid_total)}</p>
                  {c.project_amount && Number(c.project_amount) > 0 && (
                    <p className="font-montserrat text-dark-blue/40 text-xs">
                      {Math.round((Number(c.paid_total) / Number(c.project_amount)) * 100)}%
                    </p>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <span className="font-montserrat text-dark-blue/40 text-xs">
                    {c.project_start_date
                      ? new Date(c.project_start_date).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
                      : "—"}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); }}
                    className="p-1.5 rounded-lg hover:bg-red/10 text-red transition-colors"
                    title="Eliminar"
                  >
                    <HiOutlineTrash size={15} />
                  </button>
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
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-montserrat-bold text-dark-blue text-2xl">Clientes</h1>
            <p className="font-montserrat text-dark-blue/50 text-sm mt-0.5">
              Proyectos en curso y cerrados
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {tiles.map(({ label, value, color, money }) => (
            <div key={label} className="bg-white rounded-xl p-4 shadow-sm border border-black/5">
              <p className="font-montserrat text-dark-blue/50 text-xs mb-1">{label}</p>
              <div className="flex items-end gap-2 min-w-0">
                <span
                  className={`font-montserrat-bold text-dark-blue min-w-0 ${
                    money ? "text-lg break-words tabular-nums" : "text-3xl"
                  }`}
                >
                  {value}
                </span>
                <div className={`w-2 h-2 rounded-full ${color} mb-1.5 flex-shrink-0`} />
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
              placeholder="Buscar por nombre, empresa o responsable..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-black/10 rounded-xl text-sm font-montserrat text-dark-blue placeholder-dark-blue/30 outline-none focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple transition-all"
            />
          </div>
          <div className="w-full sm:w-56">
            <Dropdown
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v as ClientStatus | "all"); setPage(1); }}
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

      {/* Delete Confirm */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => !deleting && setDeleteId(null)}
            className="fixed inset-0 bg-dark-blue/60 backdrop-blur-sm cursor-default"
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
            <h3 className="font-montserrat-bold text-dark-blue text-lg mb-2">Eliminar cliente</h3>
            <p className="font-montserrat text-dark-blue/60 text-sm mb-6">
              ¿Estás seguro que deseas eliminar este cliente? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="flex-1 border border-black/15 text-dark-blue/70 font-montserrat font-semibold py-2.5 rounded-xl transition-all text-sm hover:bg-beige disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
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

export default function ClientesPage() {
  return (
    <AdminOnly>
      <ClientesPageInner />
    </AdminOnly>
  );
}
