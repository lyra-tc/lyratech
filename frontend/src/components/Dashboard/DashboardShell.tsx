"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import {
  HiChevronLeft,
  HiChevronRight,
  HiDotsHorizontal,
  HiOutlineChartBar,
  HiOutlineClipboardList,
  HiOutlineCog,
  HiOutlineInboxIn,
  HiOutlineLogout,
  HiOutlineMail,
  HiOutlineUsers,
} from "react-icons/hi";
import Logo from "@/assets/images/Navbar/White_Logo.png";
import type { UserInfo } from "@/lib/api";

const NAV_ITEMS = [
  { label: "Leads", mobileLabel: "Leads", href: "/dashboard/leads", icon: HiOutlineUsers },
  { label: "Prospects", mobileLabel: "Prospects", href: "/dashboard/prospects", icon: HiOutlineInboxIn },
  { label: "Diagnosticos", mobileLabel: "Diag.", href: "/dashboard/diagnostics", icon: HiOutlineChartBar },
  { label: "Preguntas", mobileLabel: "Preg.", href: "/dashboard/diagnostics/questions", icon: HiOutlineClipboardList },
  { label: "Notificaciones", mobileLabel: "Notif.", href: "/dashboard/notifications", icon: HiOutlineMail },
  { label: "Users", mobileLabel: "Users", href: "/dashboard/users", icon: HiOutlineUsers, adminOnly: true },
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
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    setUserMenuOpen(false);
    setMobileMoreOpen(false);
  }, [pathname]);

  function handleLogout() {
    localStorage.removeItem("lyratech_token");
    localStorage.removeItem("lyratech_user");
    router.push("/dashboard/login");
  }

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase()
    : "?";

  const visibleNavItems = NAV_ITEMS.filter((item) => !item.adminOnly || user?.is_admin);
  const mobilePrimaryNavItems = visibleNavItems.slice(0, 2);
  const mobileMoreNavItems = visibleNavItems.slice(2);
  const mobileMoreActive = mobileMoreNavItems.some(({ href }) => pathname === href);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div
        className={`flex items-center border-b border-white/10 px-4 py-5 ${
          collapsed ? "justify-center" : "gap-3"
        }`}
      >
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image src={Logo} alt="Lyratech" width={32} height={32} priority />
          {!collapsed && (
            <span className="font-zendots text-sm tracking-wide text-white">Lyratech</span>
          )}
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleNavItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 ${
                collapsed ? "justify-center" : ""
              } ${
                active
                  ? "bg-lyratech-purple text-white shadow-md"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={20} className="flex-shrink-0" />
              {!collapsed && <span className="font-montserrat text-sm font-medium">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {!isMobile && (
        <div className="relative border-t border-white/10 px-3 pb-4 pt-4">
          {userMenuOpen && user && (
            <>
              <button
                type="button"
                aria-label="Cerrar menu"
                onClick={() => setUserMenuOpen(false)}
                className="fixed inset-0 z-10 cursor-default"
              />
              <div className="absolute bottom-full left-3 right-3 z-20 mb-2 rounded-xl border border-white/10 bg-[#1e2130] p-4 shadow-2xl animate-fade-in">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-lyratech-purple text-sm font-bold text-white">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{user.full_name}</p>
                    <p className="truncate text-xs text-white/50">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-montserrat text-white/70 transition-all duration-200 hover:bg-red/20 hover:text-red"
                >
                  <HiOutlineLogout size={16} />
                  Cerrar sesion
                </button>
              </div>
            </>
          )}

          <button
            onClick={() => setUserMenuOpen((open) => !open)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200 hover:bg-white/10 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-lyratech-purple text-xs font-bold text-white">
              {initials}
            </div>
            {!collapsed && user && (
              <div className="min-w-0 text-left">
                <p className="truncate text-xs font-semibold text-white">{user.full_name}</p>
                <p className="truncate text-xs text-white/50">{user.email}</p>
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
        <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-dark-blue px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src={Logo} alt="Lyratech" width={24} height={24} />
            <span className="font-zendots text-sm text-white">Lyratech</span>
          </Link>

          <div className="relative">
            <button
              onClick={() => {
                setMobileMoreOpen(false);
                setUserMenuOpen((open) => !open);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-lyratech-purple text-xs font-bold text-white"
            >
              {initials}
            </button>

            {userMenuOpen && user && (
              <>
                <button
                  type="button"
                  aria-label="Cerrar menu"
                  onClick={() => setUserMenuOpen(false)}
                  className="fixed inset-0 z-10 cursor-default"
                />
                <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-white/10 bg-[#1e2130] p-4 shadow-2xl animate-fade-in">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-lyratech-purple text-xs font-bold text-white">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-white">{user.full_name}</p>
                      <p className="truncate text-xs text-white/50">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-montserrat text-white/70 transition-all duration-200 hover:bg-red/20 hover:text-red"
                  >
                    <HiOutlineLogout size={16} />
                    Cerrar sesion
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="mt-14 flex-1 pb-24">{children}</main>

        <div className="pointer-events-none fixed inset-0 z-[60]">
          {mobileMoreOpen && (
            <button
              type="button"
              aria-label="Cerrar menu adicional"
              onClick={() => setMobileMoreOpen(false)}
              className="pointer-events-auto absolute inset-0 bg-black/30"
            />
          )}

          <motion.div
            initial={false}
            animate={mobileMoreOpen ? { y: 0 } : { y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="pointer-events-auto absolute bottom-0 left-0 right-0 rounded-t-[28px] bg-white px-5 pb-8 pt-4 shadow-[0_-18px_50px_rgba(15,23,42,0.2)]"
          >
            <div className="mx-auto mb-5 h-1.5 w-14 rounded-full bg-slate-200" />
            <div className="grid grid-cols-2 gap-3">
              {mobileMoreNavItems.map(({ label, href, icon: Icon }) => {
                const active = pathname === href;

                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-200 ${
                      active
                        ? "border-lyratech-purple bg-lyratech-purple/10 text-lyratech-purple"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        active ? "bg-lyratech-purple text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Icon size={20} />
                    </span>
                    <span className="font-montserrat text-sm font-semibold">{label}</span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        </div>

        <nav className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-dark-blue px-2.5 py-2 shadow-2xl">
          {mobilePrimaryNavItems.map(({ mobileLabel, href, icon: Icon }) => {
            const active = pathname === href;

            return (
              <Link
                key={href}
                href={href}
                className="relative flex w-20 flex-col items-center justify-center rounded-full py-2.5"
              >
                {active && (
                  <motion.div
                    layoutId="mobile-nav-active-pill"
                    className="absolute inset-0 rounded-full bg-lyratech-purple"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span
                  className={`relative z-10 flex flex-col items-center gap-1 transition-colors duration-200 ${
                    active ? "text-white" : "text-white/60"
                  }`}
                >
                  <Icon size={19} />
                  <span className="font-montserrat whitespace-nowrap text-[9px] font-medium">
                    {mobileLabel}
                  </span>
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setUserMenuOpen(false);
              setMobileMoreOpen((open) => !open);
            }}
            className="relative flex w-20 flex-col items-center justify-center rounded-full py-2.5"
          >
            {(mobileMoreOpen || mobileMoreActive) && (
              <motion.div
                layoutId="mobile-nav-active-pill"
                className="absolute inset-0 rounded-full bg-lyratech-purple"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span
              className={`relative z-10 flex flex-col items-center gap-1 transition-colors duration-200 ${
                mobileMoreOpen || mobileMoreActive ? "text-white" : "text-white/60"
              }`}
            >
              <HiDotsHorizontal size={19} />
              <span className="font-montserrat whitespace-nowrap text-[9px] font-medium">
                More
              </span>
            </span>
          </button>
        </nav>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-beige flex">
      <aside
        className={`fixed left-0 top-0 z-30 h-full border-r border-white/10 bg-dark-blue transition-all duration-300 ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        {sidebarContent}

        <button
          onClick={() => setCollapsed((current) => !current)}
          className="absolute top-1/2 -right-3.5 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-dark-blue text-white/60 shadow-md transition-all duration-200 hover:border-lyratech-purple hover:text-white"
        >
          {collapsed ? <HiChevronRight size={14} /> : <HiChevronLeft size={14} />}
        </button>
      </aside>

      <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-16" : "ml-60"}`}>
        {children}
      </main>
    </div>
  );
}
