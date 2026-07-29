import type { LeadStatus } from "@/lib/api";

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  qualified: "Calificado",
  proposal: "Propuesta",
  closed: "Cerrado",
  lost: "Perdido",
};

export const STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-blue/20 text-blue border-blue/30",
  contacted: "bg-lyratech-purple/20 text-lyratech-purple border-lyratech-purple/30",
  qualified: "bg-lyratech-green/20 text-lyratech-green border-lyratech-green/30",
  proposal: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
  closed: "bg-lyratech-green/30 text-lyratech-green border-lyratech-green/40",
  lost: "bg-red/20 text-red border-red/30",
};

export const SOURCES = ["Web", "Referido", "Redes sociales", "Email", "Evento", "Otro"];
