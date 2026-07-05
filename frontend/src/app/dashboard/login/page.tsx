"use client";

import React, { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { HiOutlineEye, HiOutlineEyeOff } from "react-icons/hi";
import { auth } from "@/lib/api";
import LogoColor from "@/assets/images/Logo/LogoColor.png";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const registered = params.get("registered") === "1";

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
      const { access_token } = await auth.login(email, password);
      localStorage.setItem("lyratech_token", access_token);
      const user = await auth.me();
      localStorage.setItem("lyratech_user", JSON.stringify(user));
      router.push("/dashboard/leads");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-sm">
      <div className="mb-8 flex flex-col items-center">
        <Image src={LogoColor} alt="Lyratech" width={72} height={72} className="mb-4" priority />
        <h1 className="font-zendots text-xl tracking-wide text-white">Lyratech</h1>
        <p className="mt-1 font-montserrat text-sm text-white/50">Panel de administracion</p>
      </div>

      {registered && (
        <div className="mb-5 rounded-lg border border-lyratech-green/40 bg-lyratech-green/20 px-4 py-3 text-sm font-montserrat text-lyratech-green animate-fade-in">
          Cuenta creada exitosamente. Un administrador debe activarla antes de que puedas iniciar sesion.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="login-email" className="mb-1.5 block font-montserrat text-sm text-white/70">
            Correo electronico
          </label>
          <input
            id="login-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@lyratech.com"
            className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm font-montserrat text-white outline-none transition-all duration-200 placeholder:text-white/30 focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple"
          />
        </div>

        <div>
          <label htmlFor="login-password" className="mb-1.5 block font-montserrat text-sm text-white/70">
            Contrasena
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="........"
              className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 pr-10 text-sm font-montserrat text-white outline-none transition-all duration-200 placeholder:text-white/30 focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-white"
            >
              {showPassword ? <HiOutlineEye size={18} /> : <HiOutlineEyeOff size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red/40 bg-red/20 px-4 py-3 text-sm font-montserrat text-red animate-fade-in">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-lyratech-purple py-3 text-sm font-montserrat font-semibold text-white shadow-button transition-all duration-200 hover:scale-[1.02] hover:bg-button-light-purple active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-lyratech-purple" />
          )}
          {loading ? "Iniciando sesion..." : "Iniciar sesion"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <span className="font-montserrat text-sm text-white/40">No tienes cuenta? </span>
        <Link
          href="/dashboard/register"
          className="font-montserrat text-sm text-lyratech-light-purple transition-colors duration-200 hover:text-white"
        >
          Crear cuenta
        </Link>
      </div>

      <p className="mt-4 text-center font-montserrat text-xs text-white/30">
        © {new Date().getFullYear()} Lyratech. Todos los derechos reservados.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-dark-blue px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-lyratech-purple/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-lyratech-purple/10 blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
