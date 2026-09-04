"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/Dashboard/DashboardShell";
import LoadingDots from "@/components/shared/LoadingDots";
import { auth } from "@/lib/api";
import type { UserInfo } from "@/lib/api";

type AuthStatus = "checking" | "authenticated" | "unauthenticated";

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-dark-blue">
      <LoadingDots />
    </div>
  );
}

export default function ProtectedDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    // The middleware already blocked this route unless a session cookie is
    // present, so here we only need to confirm the cookie is still valid.
    let cancelled = false;
    auth
      .me({ skipAuthRedirect: true })
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setStatus("authenticated");
      })
      .catch(async () => {
        if (cancelled) return;
        // Clear the stale cookie so the middleware stops treating the browser
        // as "has a session" on the next navigation.
        await auth.logout().catch(() => {});
        if (cancelled) return;
        setStatus("unauthenticated");
        router.replace("/dashboard/login");
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  // Never render the dashboard (nor its child pages / API calls) until we have
  // confirmed a valid session. Prevents the "dashboard flash then bounce to
  // login" seen with an expired session cookie.
  if (status !== "authenticated" || !user) {
    return <FullScreenLoader />;
  }

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
