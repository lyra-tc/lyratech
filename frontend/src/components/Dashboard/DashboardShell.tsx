"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import {
  HiOutlineUsers,
  HiOutlineInboxIn,
  HiOutlineLogout,
  HiOutlineCog,
  HiOutlineMail,
  HiOutlineChartBar,
  HiOutlineClipboardList,
  HiChevronLeft,
  HiChevronRight,
} from "react-icons/hi";
import Logo from "@/assets/images/Navbar/White_Logo.png";
import type { UserInfo } from "@/lib/api";

const NAV_ITEMS = [
  { label: "Leads", mobileLabel: "Leads", href: "/dashboard/leads", icon: HiOutlineUsers },
  { label: "Prospects", mobileLabel: "Prospects", href: "/dashboard/prospects", icon: HiOutlineInboxIn },
  { label: "Diagnósticos", mobileLabel: "Diag.", href: "/dashboard/diagnostics", icon: HiOutlineChartBar },
  { label: "Preguntas", mobileLabel: "Preg.", href: "/dashboard/diagnostics/questions", icon: HiOutlineClipboardList },
  { label: "Notificaciones", mobileLabel: "Notif.", href: "/dashboard/notifications", icon: HiOutlineMail },
  { label: "Settings", mobileLabel: "Settings", href: "/dashboard/settings", icon: HiOutlineCog },
];

interface DashboardShellProps {
  user: UserInfo | null;
  children: React.ReactNode;
}

export default function DashboardShell({ user, children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  function handleLogout() {
    localStorage.removeItem("lyratech_token");
    localStorage.removeItem("lyratech_user");
    router.push("/dashboard/login");
  }

  const initials = user?.full_name
    ? user.full_name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : "?";

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center px-4 py-5 border-b border-white/10 ${collapsed ? "justify-center" : "gap-3"}`}>
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image src={Logo} alt="Lyratech" width={32} height={32} priority />
          {!collapsed && (
            <span className="font-zendots text-white text-sm tracking-wide">Lyratech</span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                collapsed ? "justify-center" : ""
              } ${
                active
                  ? "bg-lyratech-purple text-white shadow-md"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={20} className="flex-shrink-0" />
              {!collapsed && (
                <span className="font-montserrat text-sm font-medium">{label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User button — solo en desktop */}
      {!isMobile && (
        <div className="px-3 pb-4 border-t border-white/10 pt-4 relative">
          {/* Popup card */}
          {userMenuOpen && user && (
            <>
              <button
                type="button"
                aria-label="Cerrar menú"
                onClick={() => setUserMenuOpen(false)}
                className="fixed inset-0 z-10 cursor-default"
              />
              <div className="absolute bottom-full left-3 right-3 mb-2 z-20 bg-[#1e2130] border border-white/10 rounded-xl shadow-2xl p-4 animate-fade-in">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-lyratech-purple flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{user.full_name}</p>
                    <p className="text-white/50 text-xs truncate">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-white/70 hover:bg-red/20 hover:text-red transition-all duration-200 text-sm font-montserrat"
                >
                  <HiOutlineLogout size={16} />
                  Cerrar sesión
                </button>
              </div>
            </>
          )}

          {/* Trigger */}
          <button
            onClick={() => setUserMenuOpen((o) => !o)}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-white/10 transition-all duration-200 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-lyratech-purple flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            {!collapsed && user && (
              <div className="min-w-0 text-left">
                <p className="text-white text-xs font-semibold truncate">{user.full_name}</p>
                <p className="text-white/50 text-xs truncate">{user.email}</p>
              </div>
            )}
          </button>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div className="min-h-screen bg-beige flex flex-col">
        {/* Mobile top bar */}
        <header className="fixed top-0 left-0 right-0 z-40 bg-dark-blue flex items-center justify-between px-4 h-14 border-b border-white/10">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src={Logo} alt="Lyratech" width={24} height={24} />
            <span className="font-zendots text-white text-sm">Lyratech</span>
          </Link>

          {/* Avatar + popup */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((o) => !o)}
              className="w-8 h-8 rounded-full bg-lyratech-purple flex items-center justify-center text-white text-xs font-bold"
            >
              {initials}
            </button>

            {userMenuOpen && user && (
              <>
                <button
                  type="button"
                  aria-label="Cerrar menú"
                  onClick={() => setUserMenuOpen(false)}
                  className="fixed inset-0 z-10 cursor-default"
                />
                <div className="absolute right-0 top-full mt-2 z-20 w-56 bg-[#1e2130] border border-white/10 rounded-xl shadow-2xl p-4 animate-fade-in">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-lyratech-purple flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-xs font-semibold truncate">{user.full_name}</p>
                      <p className="text-white/50 text-xs truncate">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-white/70 hover:bg-red/20 hover:text-red transition-all duration-200 text-sm font-montserrat"
                  >
                    <HiOutlineLogout size={16} />
                    Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 mt-14 pb-24">{children}</main>

        {/* Floating pill nav */}
        <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-dark-blue rounded-full shadow-2xl border border-white/10 px-2.5 py-2 flex items-center gap-2">
          {NAV_ITEMS.map(({ mobileLabel, href, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} className="relative flex flex-col items-center justify-center w-20 py-2.5 rounded-full">
                {active && (
                  <motion.div
                    layoutId="mobile-nav-active-pill"
                    className="absolute inset-0 bg-lyratech-purple rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className={`relative z-10 flex flex-col items-center gap-1 transition-colors duration-200 ${active ? "text-white" : "text-white/60"}`}>
                  <Icon size={19} />
                  <span className="font-montserrat text-[9px] font-medium whitespace-nowrap">{mobileLabel}</span>
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-beige flex">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-dark-blue border-r border-white/10 z-30 transition-all duration-300 ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        {sidebarContent}

        {/* Toggle pill */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute top-1/2 -translate-y-1/2 -right-3.5 w-7 h-7 rounded-full bg-dark-blue border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-lyratech-purple transition-all duration-200 shadow-md"
        >
          {collapsed ? <HiChevronRight size={14} /> : <HiChevronLeft size={14} />}
        </button>
      </aside>

      {/* Content — margin matches sidebar width */}
      <main
        className={`flex-1 transition-all duration-300 ${collapsed ? "ml-16" : "ml-60"}`}
      >
        {children}
      </main>
    </div>
  );
}
