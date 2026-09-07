import Link from "next/link";
import { HiOutlineArrowLeft } from "react-icons/hi";

/**
 * 404 del dashboard. Se renderiza dentro del layout protegido, así que conserva
 * el sidebar / menú. Lo dispara el catch-all `[...notFound]/page.tsx`.
 */
export default function DashboardNotFound() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-10 text-center">
        <p className="font-montserrat-bold text-lyratech-purple text-5xl mb-1">404</p>
        <h1 className="font-montserrat-bold text-dark-blue text-xl mb-2">
          Página no encontrada
        </h1>
        <p className="font-montserrat text-dark-blue/50 text-sm mb-6">
          La página que buscas no existe o fue movida.
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
