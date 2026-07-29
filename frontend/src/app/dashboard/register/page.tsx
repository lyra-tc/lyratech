"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HiArrowLeft, HiOutlineEye, HiOutlineEyeOff } from "react-icons/hi";
import { auth } from "@/lib/api";
import LogoColor from "@/assets/images/Logo/LogoColor.png";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("lyratech_token")) {
      router.replace("/dashboard/leads");
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await auth.register(email, fullName, password);
      router.push("/dashboard/login?registered=1");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al crear la cuenta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-dark-blue flex items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-lyratech-purple/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-lyratech-purple/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <Image src={LogoColor} alt="Lyratech" width={72} height={72} className="mb-4" priority />
            <h1 className="font-zendots text-white text-xl tracking-wide">Lyratech</h1>
            <p className="font-montserrat text-white/50 text-sm mt-1">Crear cuenta</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-montserrat text-white/70 text-sm mb-1.5">
                Nombre completo
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-lg px-4 py-3 text-sm font-montserrat outline-none focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple transition-all duration-200"
              />
            </div>

            <div>
              <label className="block font-montserrat text-white/70 text-sm mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@lyratech.com"
                className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-lg px-4 py-3 text-sm font-montserrat outline-none focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple transition-all duration-200"
              />
            </div>

            <div>
              <label className="block font-montserrat text-white/70 text-sm mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-lg px-4 py-3 pr-10 text-sm font-montserrat outline-none focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                >
                  {showPassword ? <HiOutlineEye size={18} /> : <HiOutlineEyeOff size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red/20 border border-red/40 text-red rounded-lg px-4 py-3 text-sm font-montserrat animate-fade-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-lyratech-purple hover:bg-button-light-purple disabled:opacity-50 disabled:cursor-not-allowed text-white font-montserrat font-semibold py-3 rounded-lg transition-all duration-200 shadow-button hover:scale-[1.02] active:scale-[0.98] text-sm mt-2"
            >
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/dashboard/login"
              className="inline-flex items-center gap-1.5 font-montserrat text-white/40 hover:text-white/70 text-sm transition-colors duration-200"
            >
              <HiArrowLeft size={14} />
              Volver al inicio de sesión
            </Link>
          </div>

          <p className="font-montserrat text-white/30 text-xs text-center mt-4">
            © {new Date().getFullYear()} Lyratech. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
