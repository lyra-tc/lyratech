// frontend/src/components/Dashboard/RevenueChart.tsx
"use client";

import React from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMXN } from "@/lib/format";
import {
  CUMULATIVE_COLOR,
  MAX_SEGMENTS,
  OTHER_COLOR,
  SEGMENT_COLORS,
} from "@/lib/revenueConstants";
import type { RevenueMonth } from "@/lib/api";

interface Props {
  months: RevenueMonth[];
  labels?: Record<string, string>; // segment key -> display label (Task 8 passes this for status)
}

// Internal key: prefixed so it can't collide with a real segment value (e.g. a
// literal "Otros" industry). Display name is set via the <Bar name> prop.
const OTHER_KEY = "__otros__";
const CUMULATIVE_KEY = "_cumulative";

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-MX", { month: "short", year: "2-digit" });
}

function shortMXN(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`;
  return `${sign}$${Math.round(abs)}`;
}

interface ChartRow {
  month: string;
  [seriesKey: string]: number | string;
}

interface TooltipEntry {
  dataKey: string;
  name?: string;
  value?: number;
  color?: string;
}
interface RevenueTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

function RevenueTooltip({ active, payload, label }: RevenueTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const bars = payload.filter(
    (p) => p.dataKey !== CUMULATIVE_KEY && p.dataKey !== "__total" && (p.value ?? 0) !== 0,
  );
  const cum = payload.find((p) => p.dataKey === CUMULATIVE_KEY);
  const monthTotal = bars.reduce((s, p) => s + (p.value ?? 0), 0);
  return (
    <div className="bg-white border border-black/10 rounded-lg shadow-lg p-3 text-xs font-montserrat min-w-[180px]">
      <p className="font-montserrat-bold text-dark-blue mb-1">{label}</p>
      {bars.map((p) => (
        <p key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name ?? p.dataKey}</span>
          <span className="text-dark-blue tabular-nums">{formatMXN(p.value ?? 0)}</span>
        </p>
      ))}
      <p className="flex justify-between gap-4 border-t border-black/10 mt-1 pt-1">
        <span className="text-dark-blue/60">Total del mes</span>
        <span className="font-montserrat-bold text-dark-blue tabular-nums">{formatMXN(monthTotal)}</span>
      </p>
      {cum && (
        <p className="flex justify-between gap-4">
          <span className="text-dark-blue/60">Acumulado</span>
          <span className="font-montserrat-bold tabular-nums" style={{ color: CUMULATIVE_COLOR }}>
            {formatMXN(cum.value ?? 0)}
          </span>
        </p>
      )}
    </div>
  );
}

export default function RevenueChart({ months, labels }: Props) {
  const { data, seriesKeys } = React.useMemo(() => {
    const totals = new Map<string, number>();
    months.forEach((mo) =>
      Object.entries(mo.segments).forEach(([k, v]) => {
        totals.set(k, (totals.get(k) ?? 0) + Number(v));
      }),
    );
    const ordered = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
    const topKeys = ordered.slice(0, MAX_SEGMENTS);
    const hasOther = ordered.length > MAX_SEGMENTS;
    const keys = hasOther ? [...topKeys, OTHER_KEY] : topKeys;

    let cumulative = 0;
    const rows: ChartRow[] = months.map((mo) => {
      const row: ChartRow = { month: monthLabel(mo.month) };
      let otherSum = 0;
      Object.entries(mo.segments).forEach(([k, v]) => {
        if (topKeys.includes(k)) row[k] = Number(v);
        else otherSum += Number(v);
      });
      if (hasOther) row[OTHER_KEY] = otherSum;
      cumulative += Number(mo.total);
      row[CUMULATIVE_KEY] = cumulative;
      return row;
    });

    return { data: rows, seriesKeys: keys };
    // `labels` only affects <Bar name>, not this transform — intentionally not a dep.
  }, [months]);

  const allZero = months.every((mo) => Number(mo.total) === 0);
  if (months.length === 0 || allZero) {
    return (
      <div className="h-[360px] flex items-center justify-center font-montserrat text-dark-blue/40 text-sm">
        Sin ingresos en este periodo
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={360}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} tickMargin={8} />
        <YAxis
          yAxisId="left"
          tickFormatter={shortMXN}
          tick={{ fontSize: 11 }}
          width={64}
          label={{
            value: "Mensual",
            angle: -90,
            position: "insideLeft",
            style: { fontSize: 10, fill: "#6b7280" },
          }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tickFormatter={shortMXN}
          tick={{ fontSize: 11, fill: CUMULATIVE_COLOR }}
          width={64}
          label={{
            value: "Acumulado",
            angle: 90,
            position: "insideRight",
            style: { fontSize: 10, fill: CUMULATIVE_COLOR },
          }}
        />
        <Tooltip content={<RevenueTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {seriesKeys.map((k, i) => (
          <Bar
            key={k}
            yAxisId="left"
            dataKey={k}
            name={k === OTHER_KEY ? "Otros" : labels?.[k] ?? k}
            stackId="a"
            fill={k === OTHER_KEY ? OTHER_COLOR : SEGMENT_COLORS[i % SEGMENT_COLORS.length]}
          />
        ))}
        <Line
          yAxisId="right"
          type="monotone"
          dataKey={CUMULATIVE_KEY}
          name="Acumulado"
          stroke={CUMULATIVE_COLOR}
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
