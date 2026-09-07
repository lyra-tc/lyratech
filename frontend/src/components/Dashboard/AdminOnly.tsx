"use client";

import React from "react";
import Link from "next/link";
import { HiOutlineArrowLeft } from "react-icons/hi";
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
          <p className="font-montserrat text-dark-blue/50 text-sm mb-6">
            No tienes permiso para ver esta sección. Contacta a un administrador.
          </p>
          <Link
            href="/dashboard/prospects"
            className="inline-flex items-center gap-2 bg-lyratech-purple hover:bg-button-light-purple text-white font-montserrat font-semibold px-4 py-2.5 rounded-xl transition-all duration-200 shadow-button hover:scale-[1.02] text-sm"
          >
            <HiOutlineArrowLeft size={16} />
            Volver a prospectos
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
