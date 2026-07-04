"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  HiOutlineUser,
  HiOutlineLockClosed,
  HiOutlineCheck,
  HiOutlineEye,
  HiOutlineEyeOff,
} from "react-icons/hi";
import { auth, getCachedUser } from "@/lib/api";
import type { UserInfo } from "@/lib/api";

type Tab = "cuenta" | "seguridad";

export default function SettingsPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("cuenta");

  // Cuenta
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Contraseña
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const loadUser = useCallback(async () => {
    try {
      const u = await auth.me();
      setUser(u);
      setFullName(u.full_name);
      setEmail(u.email);
    } catch {
      /* ignore — request() already redirects to login on 401 */
    }
  }, []);

  useEffect(() => {
    const cached = getCachedUser();
    if (cached) {
      setUser(cached);
      setFullName(cached.full_name);
      setEmail(cached.email);
    }
    loadUser();
  }, [loadUser]);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    setProfileSaving(true);
    try {
      const updated = await auth.updateProfile({ full_name: fullName, email });
      setUser(updated);
      localStorage.setItem("lyratech_user", JSON.stringify(updated));
      setProfileMsg({ type: "ok", text: "Perfil actualizado correctamente." });
    } catch (err: unknown) {
      setProfileMsg({ type: "err", text: err instanceof Error ? err.message : "Error al guardar" });
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (newPw !== confirmPw) {
      setPwMsg({ type: "err", text: "Las contraseñas nuevas no coinciden." });
      return;
    }
    if (newPw.length < 6) {
      setPwMsg({ type: "err", text: "La contraseña debe tener al menos 6 caracteres." });
      return;
    }
    setPwSaving(true);
    try {
      await auth.changePassword(currentPw, newPw);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setPwMsg({ type: "ok", text: "Contraseña actualizada correctamente." });
    } catch (err: unknown) {
      setPwMsg({ type: "err", text: err instanceof Error ? err.message : "Error al cambiar contraseña" });
    } finally {
      setPwSaving(false);
    }
  }

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "cuenta", label: "Mi cuenta", icon: HiOutlineUser },
    { id: "seguridad", label: "Seguridad", icon: HiOutlineLockClosed },
  ];

  const inputClass =
    "w-full border border-black/15 rounded-xl px-4 py-2.5 text-sm font-montserrat text-dark-blue outline-none focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple transition-all bg-white";

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-montserrat-bold text-dark-blue text-2xl">Configuración</h1>
        <p className="font-montserrat text-dark-blue/50 text-sm mt-0.5">
          Administra tu cuenta y preferencias
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-black/5 rounded-xl p-1 mb-6 shadow-sm w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-montserrat font-semibold transition-all duration-200 ${
              activeTab === id
                ? "bg-lyratech-purple text-white shadow"
                : "text-dark-blue/50 hover:text-dark-blue hover:bg-beige"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Mi cuenta */}
      {activeTab === "cuenta" && (
        <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6">
          {/* Avatar */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-black/5">
            <div className="w-16 h-16 rounded-full bg-lyratech-purple flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
              {user?.full_name
                ? user.full_name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
                : "?"}
            </div>
            <div>
              <p className="font-montserrat-bold text-dark-blue text-base">{user?.full_name}</p>
              <p className="font-montserrat text-dark-blue/50 text-sm">{user?.email}</p>
              <p className="font-montserrat text-dark-blue/30 text-xs mt-0.5">
                Miembro desde{" "}
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString("es-MX", { month: "long", year: "numeric" })
                  : "—"}
              </p>
            </div>
          </div>

          <form onSubmit={handleProfileSave} className="space-y-4">
            <div>
              <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">
                Nombre completo
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClass}
                placeholder="Tu nombre"
              />
            </div>
            <div>
              <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="tu@email.com"
              />
            </div>

            {profileMsg && (
              <div className={`rounded-lg px-4 py-2.5 text-sm font-montserrat border ${
                profileMsg.type === "ok"
                  ? "bg-lyratech-green/10 border-lyratech-green/30 text-lyratech-green"
                  : "bg-red/10 border-red/30 text-red"
              }`}>
                {profileMsg.text}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={profileSaving}
                className="flex items-center gap-2 bg-lyratech-purple hover:bg-button-light-purple disabled:opacity-50 text-white font-montserrat font-semibold px-5 py-2.5 rounded-xl transition-all text-sm shadow-button hover:scale-[1.02]"
              >
                <HiOutlineCheck size={16} />
                {profileSaving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: Seguridad */}
      {activeTab === "seguridad" && (
        <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6">
          <h2 className="font-montserrat-bold text-dark-blue text-base mb-1">
            Cambiar contraseña
          </h2>
          <p className="font-montserrat text-dark-blue/40 text-sm mb-5">
            Usa una contraseña segura de al menos 6 caracteres.
          </p>

          <form onSubmit={handlePasswordSave} className="space-y-4">
            {/* Current password */}
            <div>
              <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">
                Contraseña actual
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  required
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className={`${inputClass} pr-10`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-blue/30 hover:text-dark-blue transition-colors"
                >
                  {showCurrent ? <HiOutlineEye size={16} /> : <HiOutlineEyeOff size={16} />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  required
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className={`${inputClass} pr-10`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-blue/30 hover:text-dark-blue transition-colors"
                >
                  {showNew ? <HiOutlineEye size={16} /> : <HiOutlineEyeOff size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">
                Confirmar nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className={`${inputClass} pr-10`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-blue/30 hover:text-dark-blue transition-colors"
                >
                  {showConfirm ? <HiOutlineEye size={16} /> : <HiOutlineEyeOff size={16} />}
                </button>
              </div>
            </div>

            {pwMsg && (
              <div className={`rounded-lg px-4 py-2.5 text-sm font-montserrat border ${
                pwMsg.type === "ok"
                  ? "bg-lyratech-green/10 border-lyratech-green/30 text-lyratech-green"
                  : "bg-red/10 border-red/30 text-red"
              }`}>
                {pwMsg.text}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={pwSaving}
                className="flex items-center gap-2 bg-lyratech-purple hover:bg-button-light-purple disabled:opacity-50 text-white font-montserrat font-semibold px-5 py-2.5 rounded-xl transition-all text-sm shadow-button hover:scale-[1.02]"
              >
                <HiOutlineCheck size={16} />
                {pwSaving ? "Guardando..." : "Cambiar contraseña"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
