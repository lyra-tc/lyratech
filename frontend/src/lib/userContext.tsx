"use client";

import React, { createContext, useContext } from "react";
import type { UserInfo } from "@/lib/api";

const UserContext = createContext<UserInfo | null>(null);

export function UserProvider({
  user,
  children,
}: {
  user: UserInfo;
  children: React.ReactNode;
}) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

/**
 * El layout protegido garantiza que el usuario está cargado antes de renderizar
 * páginas hijas, así que este hook siempre devuelve un usuario dentro de
 * `/dashboard/(protected)`.
 */
export function useCurrentUser(): UserInfo {
  const user = useContext(UserContext);
  if (!user) {
    throw new Error("useCurrentUser debe usarse dentro de <UserProvider>");
  }
  return user;
}
