import type { ProspectStatus } from "@/lib/api";

export const STATUS_LABELS: Record<ProspectStatus, string> = {
  meeting_to_schedule: "Agendar reunión",
  call_later: "Llamar más tarde",
  lost: "Perdido",
};

export const STATUS_COLORS: Record<ProspectStatus, string> = {
  meeting_to_schedule: "bg-blue/20 text-blue border-blue/30",
  call_later: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
  lost: "bg-red/20 text-red border-red/30",
};

export const SOURCES = ["Web", "Referido", "Redes sociales", "Email", "Evento", "Diagnóstico GO", "Otro"];
