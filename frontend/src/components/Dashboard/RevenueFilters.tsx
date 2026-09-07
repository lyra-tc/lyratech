// frontend/src/components/Dashboard/RevenueFilters.tsx
"use client";

import React from "react";
import { HiOutlineDownload } from "react-icons/hi";
import Dropdown from "@/components/shared/Dropdown";
import { CLIENT_STATUS_LABELS } from "@/lib/clientConstants";
import { DATE_PRESETS, GROUP_BY_OPTIONS } from "@/lib/revenueConstants";
import type { RevenueGroupBy } from "@/lib/revenueConstants";
import type { ClientStatus, RevenueFilterOptions } from "@/lib/api";

const INPUT =
  "w-full border border-black/15 rounded-xl px-4 py-2.5 text-sm font-montserrat text-dark-blue outline-none focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple transition-all";

const ALL = { value: "", label: "Todos" };

interface Props {
  preset: string;
  onPreset: (v: string) => void;
  customFrom: string;
  customTo: string;
  onCustomFrom: (v: string) => void;
  onCustomTo: (v: string) => void;
  rangeError?: string;
  responsable: string;
  onResponsable: (v: string) => void;
  status: string;
  onStatus: (v: string) => void;
  service: string;
  onService: (v: string) => void;
  industry: string;
  onIndustry: (v: string) => void;
  groupBy: RevenueGroupBy;
  onGroupBy: (v: RevenueGroupBy) => void;
  options: RevenueFilterOptions | null;
  onExport: () => void;
  exporting: boolean;
  exportError?: string;
}

export default function RevenueFilters({
  preset, onPreset, customFrom, customTo, onCustomFrom, onCustomTo, rangeError,
  responsable, onResponsable, status, onStatus, service, onService,
  industry, onIndustry, groupBy, onGroupBy, options, onExport, exporting, exportError,
}: Props) {
  const statusOptions = [
    ALL,
    ...(Object.keys(CLIENT_STATUS_LABELS) as ClientStatus[]).map((s) => ({
      value: s,
      label: CLIENT_STATUS_LABELS[s],
    })),
  ];
  const toOpts = (values: string[] | undefined) =>
    [ALL, ...(values ?? []).map((v) => ({ value: v, label: v }))];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-4 mb-6 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className="font-montserrat text-dark-blue/50 text-xs mb-1 block">Rango</label>
          <Dropdown
            value={preset}
            onChange={onPreset}
            options={DATE_PRESETS.map((p) => ({ value: p.value, label: p.label }))}
          />
        </div>

        {preset === "custom" && (
          <div className="grid grid-cols-2 gap-3 sm:col-span-1">
            <div>
              <label htmlFor="rev-from" className="font-montserrat text-dark-blue/50 text-xs mb-1 block">Desde</label>
              <input
                id="rev-from"
                type="month"
                value={customFrom}
                max={customTo || undefined}
                onChange={(e) => onCustomFrom(e.target.value)}
                className={`${INPUT} ${rangeError ? "border-red bg-red/5" : ""}`}
              />
            </div>
            <div>
              <label htmlFor="rev-to" className="font-montserrat text-dark-blue/50 text-xs mb-1 block">Hasta</label>
              <input
                id="rev-to"
                type="month"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => onCustomTo(e.target.value)}
                className={`${INPUT} ${rangeError ? "border-red bg-red/5" : ""}`}
              />
            </div>
            {rangeError && (
              <p role="alert" className="text-red text-xs font-montserrat col-span-2">{rangeError}</p>
            )}
          </div>
        )}

        <div>
          <label className="font-montserrat text-dark-blue/50 text-xs mb-1 block">Responsable</label>
          <Dropdown value={responsable} onChange={onResponsable} options={toOpts(options?.responsables)} />
        </div>
        <div>
          <label className="font-montserrat text-dark-blue/50 text-xs mb-1 block">Estado</label>
          <Dropdown value={status} onChange={onStatus} options={statusOptions} />
        </div>
        <div>
          <label className="font-montserrat text-dark-blue/50 text-xs mb-1 block">Servicio</label>
          <Dropdown value={service} onChange={onService} options={toOpts(options?.services)} />
        </div>
        <div>
          <label className="font-montserrat text-dark-blue/50 text-xs mb-1 block">Giro</label>
          <Dropdown value={industry} onChange={onIndustry} options={toOpts(options?.industries)} />
        </div>
        <div>
          <label className="font-montserrat text-dark-blue/50 text-xs mb-1 block">Apilar por</label>
          <Dropdown
            value={groupBy}
            onChange={(v) => onGroupBy(v as RevenueGroupBy)}
            options={GROUP_BY_OPTIONS}
          />
        </div>
      </div>

      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={onExport}
          disabled={exporting || !!rangeError}
          className="inline-flex items-center gap-2 bg-lyratech-purple hover:bg-button-light-purple text-white font-montserrat font-semibold px-4 py-2.5 rounded-xl transition-all text-sm disabled:opacity-50"
        >
          <HiOutlineDownload size={16} />
          {exporting ? "Exportando…" : "Exportar CSV"}
        </button>
        {exportError && (
          <p role="alert" className="text-red text-xs font-montserrat text-right">{exportError}</p>
        )}
      </div>
    </div>
  );
}
