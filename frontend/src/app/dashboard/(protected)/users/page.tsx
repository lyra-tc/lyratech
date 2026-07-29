"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  HiOutlineKey,
  HiOutlineShieldCheck,
  HiOutlineStar,
  HiOutlineTrash,
  HiOutlineX,
} from "react-icons/hi";
import LoadingDots from "@/components/shared/LoadingDots";
import { auth, usersApi } from "@/lib/api";
import type { UserInfo } from "@/lib/api";

interface PasswordModalState {
  userId: number;
  fullName: string;
}

interface DeleteModalState {
  userId: number;
  fullName: string;
}

export default function UsersPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [passwordModal, setPasswordModal] = useState<PasswordModalState | null>(null);
  const [deleteModal, setDeleteModal] = useState<DeleteModalState | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const loadUsers = useCallback(async () => {
    const list = await usersApi.list();
    setUsers(list);
  }, []);

  useEffect(() => {
    async function loadPage() {
      setLoading(true);
      setError("");

      try {
        const me = await auth.me();
        if (!me.is_admin) {
          router.replace("/dashboard/leads");
          return;
        }

        setCurrentUser(me);
        await loadUsers();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar los usuarios");
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, [loadUsers, router]);

  async function runUserAction(userId: number, action: () => Promise<void>) {
    setActionLoadingId(userId);
    setError("");

    try {
      await action();
      await loadUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo completar la accion");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleSubmitPasswordReset() {
    if (!passwordModal || !newPassword.trim()) return;

    await runUserAction(passwordModal.userId, () =>
      usersApi.resetPassword(passwordModal.userId, newPassword.trim())
    );
    setPasswordModal(null);
    setNewPassword("");
  }

  async function handleConfirmDelete() {
    if (!deleteModal) return;

    await runUserAction(deleteModal.userId, () => usersApi.remove(deleteModal.userId));
    setDeleteModal(null);
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingDots />
      </div>
    );
  }

  if (!currentUser?.is_admin) {
    return null;
  }

  return (
    <>
      <div className="mx-auto max-w-6xl p-4 md:p-8">
        <div className="mb-6">
          <h1 className="font-montserrat-bold text-2xl text-dark-blue">Users</h1>
          <p className="mt-0.5 font-montserrat text-sm text-dark-blue/50">
            Activa cuentas nuevas y administra permisos. Solo el superadmin puede quitar admin a otros admins.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red/30 bg-red/10 px-4 py-2.5 text-sm font-montserrat text-red">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
          <div className="hidden grid-cols-[2fr_1fr_1fr_2fr] gap-4 border-b border-black/5 bg-beige/60 px-5 py-3 md:grid">
            <span className="font-montserrat text-xs font-semibold uppercase tracking-[0.14em] text-dark-blue/45">
              Usuario
            </span>
            <span className="font-montserrat text-xs font-semibold uppercase tracking-[0.14em] text-dark-blue/45">
              Estado
            </span>
            <span className="font-montserrat text-xs font-semibold uppercase tracking-[0.14em] text-dark-blue/45">
              Rol
            </span>
            <span className="font-montserrat text-xs font-semibold uppercase tracking-[0.14em] text-dark-blue/45">
              Acciones
            </span>
          </div>

          <div className="divide-y divide-black/5">
            {users.map((user) => {
              const isBusy = actionLoadingId === user.id;
              const isSuperadmin = user.is_superadmin;
              const isAdmin = user.is_admin;
              const canDemoteAdmin =
                currentUser.is_superadmin && user.is_admin && !user.is_superadmin;
              const disableGeneralActions = isBusy || isAdmin || isSuperadmin;

              return (
                <div key={user.id} className="grid gap-4 px-5 py-4 md:grid-cols-[2fr_1fr_1fr_2fr] md:items-center">
                  <div className="min-w-0">
                    <p className="truncate font-montserrat text-sm font-semibold text-dark-blue">
                      {user.full_name}
                    </p>
                    <p className="truncate font-montserrat text-xs text-dark-blue/45">{user.email}</p>
                  </div>

                  <div>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-montserrat font-semibold ${
                        user.is_active ? "bg-lyratech-green/10 text-lyratech-green" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {user.is_active ? "Activo" : "Pendiente"}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {isSuperadmin && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-montserrat font-semibold text-amber-700">
                        <HiOutlineStar size={12} />
                        Superadmin
                      </span>
                    )}
                    {isAdmin && !isSuperadmin && (
                      <span className="inline-flex rounded-full bg-lyratech-purple/10 px-3 py-1 text-xs font-montserrat font-semibold text-lyratech-purple">
                        Admin
                      </span>
                    )}
                    {!isAdmin && (
                      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-montserrat font-semibold text-slate-600">
                        Usuario
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={disableGeneralActions}
                      onClick={() =>
                        runUserAction(user.id, async () => {
                          await usersApi.update(user.id, { is_active: !user.is_active });
                        })
                      }
                      className="rounded-xl border border-black/10 px-3 py-2 text-xs font-montserrat font-semibold text-dark-blue transition-all hover:bg-beige disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {user.is_active ? "Desactivar" : "Activar"}
                    </button>

                    {!isAdmin && (
                      <button
                        disabled={isBusy}
                        onClick={() =>
                          runUserAction(user.id, async () => {
                            await usersApi.update(user.id, { is_admin: true });
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-xl border border-lyratech-purple/20 px-3 py-2 text-xs font-montserrat font-semibold text-lyratech-purple transition-all hover:bg-lyratech-purple/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <HiOutlineShieldCheck size={14} />
                        Hacer admin
                      </button>
                    )}

                    {canDemoteAdmin && (
                      <button
                        disabled={isBusy}
                        onClick={() =>
                          runUserAction(user.id, async () => {
                            await usersApi.update(user.id, { is_admin: false });
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-xl border border-amber-300/40 px-3 py-2 text-xs font-montserrat font-semibold text-amber-700 transition-all hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <HiOutlineShieldCheck size={14} />
                        Quitar admin
                      </button>
                    )}

                    <button
                      disabled={disableGeneralActions}
                      onClick={() => {
                        setNewPassword("");
                        setPasswordModal({ userId: user.id, fullName: user.full_name });
                      }}
                      className="inline-flex items-center gap-1 rounded-xl border border-black/10 px-3 py-2 text-xs font-montserrat font-semibold text-dark-blue transition-all hover:bg-beige disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <HiOutlineKey size={14} />
                      Reset password
                    </button>

                    <button
                      disabled={disableGeneralActions}
                      onClick={() => setDeleteModal({ userId: user.id, fullName: user.full_name })}
                      className="inline-flex items-center gap-1 rounded-xl border border-red/20 px-3 py-2 text-xs font-montserrat font-semibold text-red transition-all hover:bg-red/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <HiOutlineTrash size={14} />
                      Eliminar
                    </button>
                  </div>

                  {(isSuperadmin || isAdmin) && (
                    <div className="md:col-span-4">
                      <p className="font-montserrat text-xs text-dark-blue/40">
                        {isSuperadmin
                          ? "La cuenta superadmin no se puede modificar ni eliminar."
                          : canDemoteAdmin
                            ? "Como superadmin, puedes quitar admin a esta cuenta. El resto de acciones siguen bloqueadas mientras sea admin."
                            : "Las cuentas admin no se pueden cambiar ni borrar desde una cuenta admin normal."}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {passwordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Cerrar modal"
            onClick={() => {
              setPasswordModal(null);
              setNewPassword("");
            }}
            className="fixed inset-0 bg-dark-blue/60 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/5 p-5">
              <div>
                <h2 className="font-montserrat-bold text-lg text-dark-blue">Reset password</h2>
                <p className="mt-1 font-montserrat text-sm text-dark-blue/45">
                  Cambiar contrasena para {passwordModal.fullName}
                </p>
              </div>
              <button
                onClick={() => {
                  setPasswordModal(null);
                  setNewPassword("");
                }}
                className="rounded-lg p-1.5 text-dark-blue/50 transition-colors hover:bg-beige hover:text-dark-blue"
              >
                <HiOutlineX size={18} />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block font-montserrat text-sm text-dark-blue/70">
                  Nueva contrasena
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimo 6 caracteres"
                  className="w-full rounded-xl border border-black/15 px-4 py-2.5 text-sm font-montserrat text-dark-blue outline-none transition-all focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setPasswordModal(null);
                    setNewPassword("");
                  }}
                  className="flex-1 rounded-xl border border-black/15 py-2.5 text-sm font-montserrat font-semibold text-dark-blue/70 transition-all hover:bg-beige"
                >
                  Cancelar
                </button>
                <button
                  disabled={!newPassword.trim() || (passwordModal.userId === actionLoadingId)}
                  onClick={handleSubmitPasswordReset}
                  className="flex-1 rounded-xl bg-lyratech-purple py-2.5 text-sm font-montserrat font-semibold text-white transition-all hover:bg-button-light-purple disabled:opacity-50"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Cerrar modal"
            onClick={() => setDeleteModal(null)}
            className="fixed inset-0 bg-dark-blue/60 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/5 p-5">
              <div>
                <h2 className="font-montserrat-bold text-lg text-dark-blue">Eliminar usuario</h2>
                <p className="mt-1 font-montserrat text-sm text-dark-blue/45">
                  Esta accion no se puede deshacer.
                </p>
              </div>
              <button
                onClick={() => setDeleteModal(null)}
                className="rounded-lg p-1.5 text-dark-blue/50 transition-colors hover:bg-beige hover:text-dark-blue"
              >
                <HiOutlineX size={18} />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <p className="font-montserrat text-sm text-dark-blue">
                Vas a eliminar la cuenta de <span className="font-semibold">{deleteModal.fullName}</span>.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteModal(null)}
                  className="flex-1 rounded-xl border border-black/15 py-2.5 text-sm font-montserrat font-semibold text-dark-blue/70 transition-all hover:bg-beige"
                >
                  Cancelar
                </button>
                <button
                  disabled={deleteModal.userId === actionLoadingId}
                  onClick={handleConfirmDelete}
                  className="flex-1 rounded-xl bg-red py-2.5 text-sm font-montserrat font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
