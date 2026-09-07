"use client";

import React from "react";
import { useCurrentUser } from "@/lib/userContext";

/**
 * Corta el render de una página cuando el usuario no es admin. Se monta ANTES
 * que los hijos, así que sus efectos de carga de datos nunca corren para un
 * usuario sin permiso. El backend es la barrera real; esto solo evita mostrar
 * (e intentar cargar) secciones prohibidas.
 */
export default function AdminOnly({ children }: { children: React.ReactNode }) {
  const user = useCurrentUser();

  if (!user.is_admin) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-10 text-center">
          <h1 className="font-montserrat-bold text-dark-blue text-xl mb-2">
            Sección restringida
          </h1>
          <p className="font-montserrat text-dark-blue/50 text-sm">
            No tienes permiso para ver esta sección. Contacta a un administrador.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
