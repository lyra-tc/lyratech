import type { ClientStatus, PaymentType } from "@/lib/api";

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  nuevo: "Nuevo",
  en_proceso: "En proceso",
  con_mantenimiento: "Con mantenimiento",
  cerrado: "Cerrado",
  perdido: "Perdido",
};

export const CLIENT_STATUS_COLORS: Record<ClientStatus, string> = {
  nuevo: "bg-blue/20 text-blue border-blue/30",
  en_proceso: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
  con_mantenimiento: "bg-lyratech-purple/20 text-lyratech-purple border-lyratech-purple/30",
  cerrado: "bg-lyratech-green/20 text-lyratech-green border-lyratech-green/30",
  perdido: "bg-red/20 text-red border-red/30",
};

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  contado: "Contado",
  diferido: "Diferido",
  iguala: "Iguala",
};
