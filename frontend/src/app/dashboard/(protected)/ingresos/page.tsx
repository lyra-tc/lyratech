"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import LoadingDots from "@/components/shared/LoadingDots";
import RevenueFilters from "@/components/Dashboard/RevenueFilters";
import { revenueApi } from "@/lib/api";
import type { RevenueResponse, RevenueFilterOptions } from "@/lib/api";
import { DATE_PRESETS, GROUP_BY_OPTIONS } from "@/lib/revenueConstants";
import type { RevenueGroupBy } from "@/lib/revenueConstants";
import { CLIENT_STATUS_LABELS } from "@/lib/clientConstants";
import { formatMXN } from "@/lib/format";

const RevenueChart = dynamic(() => import("@/components/Dashboard/RevenueChart"), { ssr: false });

const STATUS_LABELS = CLIENT_STATUS_LABELS as Record<string, string>;

// "YYYY-MM" (from <input type=month>) -> API date bounds
const firstDay = (ym: string) => `${ym}-01`;
const lastDay = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return `${ym}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
};

export default function IngresosPage() {
  const [preset, setPreset] = useState("last12");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [responsable, setResponsable] = useState("");
  const [status, setStatus] = useState("");
  const [service, setService] = useState("");
  const [industry, setIndustry] = useState("");
  const [groupBy, setGroupBy] = useState<RevenueGroupBy>("responsable");

  const [data, setData] = useState<RevenueResponse | null>(null);
  const [options, setOptions] = useState<RevenueFilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const reqId = useRef(0);

  const rangeError = useMemo(() => {
    if (preset !== "custom") return "";
    if (!customFrom || !customTo) return "Elige ambas fechas";
    if (customFrom > customTo) return "La fecha inicial no puede ser posterior a la final";
    return "";
  }, [preset, customFrom, customTo]);

  const range = useMemo(() => {
    if (preset === "custom") {
      if (rangeError) return null;
      return { date_from: firstDay(customFrom), date_to: lastDay(customTo) };
    }
    const p = DATE_PRESETS.find((x) => x.value === preset);
    return p ? p.resolve() : null;
  }, [preset, customFrom, customTo, rangeError]);

  const params = useMemo(
    () =>
      range
        ? {
            ...range,
            responsable: responsable || undefined,
            status: status || undefined,
            service: service || undefined,
            industry: industry || undefined,
            group_by: groupBy,
          }
        : null,
    [range, responsable, status, service, industry, groupBy],
  );

  const loadData = useCallback(async () => {
    if (!params) {
      reqId.current++; // discard any in-flight response
      setLoading(false);
      return;
    }
    const id = ++reqId.current;
    setLoading(true);
    try {
      const res = await revenueApi.data(params);
      if (id === reqId.current) setData(res);
    } catch {
      /* ignore — request() redirects on 401 */
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    revenueApi.filters().then(setOptions).catch(() => {});
  }, []);

  async function handleExport() {
    if (!params) return;
    setExporting(true);
    setExportError("");
    try {
      await revenueApi.exportCsv(params);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "No se pudo exportar el CSV");
    } finally {
      setExporting(false);
    }
  }

  const kpis = rangeError ? undefined : data?.kpis;
  const tiles = [
    { label: "Cobrado en el periodo", value: kpis ? formatMXN(kpis.period_total) : "—" },
    { label: "Cobrado este mes", value: kpis ? formatMXN(kpis.current_month_total) : "—" },
    { label: "Promedio mensual", value: kpis ? formatMXN(kpis.monthly_avg) : "—" },
    { label: "Pendiente por cobrar", value: kpis ? formatMXN(kpis.pending_to_collect) : "—" },
  ];

  const groupLabel = GROUP_BY_OPTIONS.find((o) => o.value === groupBy)?.label ?? "";
  const chartLabels = groupBy === "status" ? STATUS_LABELS : undefined;
  const periodTotalNum = Number(data?.kpis.period_total ?? 0);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="font-montserrat-bold text-dark-blue text-2xl">Ingresos</h1>
        <p className="font-montserrat text-dark-blue/50 text-sm mt-0.5">Cobranza de proyectos por mes</p>
      </div>

      <RevenueFilters
        preset={preset}
        onPreset={setPreset}
        customFrom={customFrom}
        customTo={customTo}
        onCustomFrom={setCustomFrom}
        onCustomTo={setCustomTo}
        responsable={responsable}
        onResponsable={setResponsable}
        status={status}
        onStatus={setStatus}
        service={service}
        onService={setService}
        industry={industry}
        onIndustry={setIndustry}
        groupBy={groupBy}
        onGroupBy={setGroupBy}
        options={options}
        onExport={handleExport}
        exporting={exporting}
        exportError={exportError || undefined}
        rangeError={rangeError || undefined}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {tiles.map((t) => (
          <div key={t.label} className="bg-white rounded-xl p-4 shadow-sm border border-black/5">
            <p className="font-montserrat text-dark-blue/50 text-xs mb-1">{t.label}</p>
            <span className="font-montserrat-bold text-dark-blue text-lg break-words tabular-nums">{t.value}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-4 mb-6">
        {rangeError ? (
          <div className="h-[360px] flex items-center justify-center font-montserrat text-dark-blue/40 text-sm">
            {rangeError}
          </div>
        ) : loading ? (
          <div className="h-[360px] flex items-center justify-center">
            <LoadingDots />
          </div>
        ) : data ? (
          <RevenueChart months={data.months} labels={chartLabels} />
        ) : (
          <div className="h-[360px] flex items-center justify-center font-montserrat text-dark-blue/40 text-sm">
            No se pudieron cargar los datos
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-4">
        <h2 className="font-montserrat-bold text-dark-blue text-sm mb-3">Total por {groupLabel.toLowerCase()}</h2>
        {rangeError || !data || data.breakdown.length === 0 ? (
          <p className="font-montserrat text-dark-blue/40 text-sm py-4 text-center">Sin datos</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-dark-blue/50 text-xs uppercase font-montserrat-bold">
                  <th className="py-2 pr-2">{groupLabel}</th>
                  <th className="py-2 pr-2">Cobrado</th>
                  <th className="py-2 pr-2">% del total</th>
                </tr>
              </thead>
              <tbody>
                {data.breakdown.map((row) => (
                  <tr key={row.key} className="border-t border-black/5 font-montserrat text-dark-blue/80">
                    <td className="py-2 pr-2">
                      {groupBy === "status" ? STATUS_LABELS[row.key] ?? row.label : row.label}
                    </td>
                    <td className="py-2 pr-2 tabular-nums">{formatMXN(row.total)}</td>
                    <td className="py-2 pr-2 tabular-nums">
                      {periodTotalNum > 0 ? Math.round((Number(row.total) / periodTotalNum) * 100) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
