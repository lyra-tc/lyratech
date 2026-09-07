import { notFound } from "next/navigation";

// Cualquier URL bajo /dashboard que no coincida con una página cae aquí. Vive
// dentro del grupo (protected) para que el 404 se muestre con el sidebar/menú.
// Sin este catch-all, Next sirve su 404 genérico en vez de not-found.tsx.
export default function DashboardCatchAll() {
  notFound();
}
