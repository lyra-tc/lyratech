"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/Dashboard/DashboardShell";
import { auth, getCachedUser } from "@/lib/api";
import type { UserInfo } from "@/lib/api";

export default function ProtectedDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("lyratech_token")) {
      router.push("/dashboard/login");
      return;
    }
    const cached = getCachedUser();
    if (cached) setUser(cached);
    auth.me().then(setUser).catch(() => router.push("/dashboard/login"));
  }, [router]);

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
