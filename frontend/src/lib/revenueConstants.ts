export type RevenueGroupBy = "responsable" | "status" | "service" | "industry";

export const GROUP_BY_OPTIONS: { value: RevenueGroupBy; label: string }[] = [
  { value: "responsable", label: "Responsable" },
  { value: "status", label: "Estado" },
  { value: "service", label: "Servicio" },
  { value: "industry", label: "Giro" },
];

const iso = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export interface DatePreset {
  value: string;
  label: string;
  resolve: () => { date_from: string; date_to: string };
}

export const DATE_PRESETS: DatePreset[] = [
  {
    value: "last12",
    label: "Últimos 12 meses",
    resolve: () => {
      const now = new Date();
      return {
        date_from: iso(new Date(now.getFullYear(), now.getMonth() - 11, 1)),
        date_to: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      };
    },
  },
  {
    value: "thisYear",
    label: "Este año",
    resolve: () => {
      const y = new Date().getFullYear();
      return { date_from: `${y}-01-01`, date_to: `${y}-12-31` };
    },
  },
  {
    value: "lastYear",
    label: "Año pasado",
    resolve: () => {
      const y = new Date().getFullYear() - 1;
      return { date_from: `${y}-01-01`, date_to: `${y}-12-31` };
    },
  },
  { value: "custom", label: "Personalizado", resolve: () => ({ date_from: "", date_to: "" }) },
];

// morados derivados de lyratech-purple + un acento; gris para "Otros"
export const SEGMENT_COLORS = ["#2e3163", "#434689", "#5f66ae", "#7f85c0", "#9fa4d2", "#bfc3e4"];
export const OTHER_COLOR = "#9ca3af";
export const CUMULATIVE_COLOR = "#0F8F26";
export const MAX_SEGMENTS = 6;
