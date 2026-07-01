"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  HiOutlineUsers,
  HiOutlineChartBar,
  HiOutlineLogout,
  HiChevronLeft,
  HiChevronRight,
  HiMenuAlt2,
  HiX,
} from "react-icons/hi";
import Logo from "@/assets/images/Navbar/White_Logo.png";
import type { UserInfo } from "@/lib/api";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: HiOutlineChartBar },
  { label: "Leads", href: "/dashboard/leads", icon: HiOutlineUsers },
];

interface SidebarProps {
  user: UserInfo | null;
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
    ? user.full_name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "?";

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center px-4 py-5 border-b border-white/10 ${collapsed ? "justify-center" : "gap-3"}`}>
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image src={Logo} alt="Lyratech" width={32} height={32} priority />
          {!collapsed && (
            <span className="font-zendots text-white text-sm tracking-wide">
              Lyratech
            </span>
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
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                collapsed ? "justify-center" : ""
              } ${
                active
                  ? "bg-lyratech-purple text-white shadow-md"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
              title={collapsed ? label : undefined}
            >
              <Icon size={20} className="flex-shrink-0" />
              {!collapsed && (
                <span className="font-montserrat text-sm font-medium">
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-3 pb-4 border-t border-white/10 pt-4 space-y-3">
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5">
            <div className="w-8 h-8 rounded-full bg-lyratech-purple flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">
                {user.full_name}
              </p>
              <p className="text-white/50 text-xs truncate">{user.email}</p>
            </div>
          </div>
        )}
        {collapsed && user && (
          <div className="flex justify-center">
            <div
              className="w-8 h-8 rounded-full bg-lyratech-purple flex items-center justify-center text-white text-xs font-bold"
              title={user.full_name}
            >
              {initials}
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-white/70 hover:bg-red/20 hover:text-red transition-all duration-200 ${
            collapsed ? "justify-center" : ""
          }`}
          title={collapsed ? "Cerrar sesión" : undefined}
        >
          <HiOutlineLogout size={20} className="flex-shrink-0" />
          {!collapsed && (
            <span className="font-montserrat text-sm font-medium">
              Cerrar sesión
            </span>
          )}
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        {/* Mobile top bar */}
        <header className="fixed top-0 left-0 right-0 z-40 bg-dark-blue flex items-center justify-between px-4 h-14 border-b border-white/10">
          <button onClick={() => setMobileOpen(true)} className="text-white p-1">
            <HiMenuAlt2 size={24} />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src={Logo} alt="Lyratech" width={24} height={24} />
            <span className="font-zendots text-white text-sm">Lyratech</span>
          </Link>
          <div className="w-8 h-8 rounded-full bg-lyratech-purple flex items-center justify-center text-white text-xs font-bold">
            {initials}
          </div>
        </header>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative w-72 bg-dark-blue h-full shadow-2xl">
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 text-white/60 hover:text-white"
              >
                <HiX size={20} />
              </button>
              {sidebarContent}
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <aside
      className={`fixed top-0 left-0 h-full bg-dark-blue border-r border-white/10 z-30 transition-all duration-300 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {sidebarContent}

      {/* Toggle button — círculo en el borde derecho a mitad del sidebar */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute top-1/2 -translate-y-1/2 -right-3.5 w-7 h-7 rounded-full bg-dark-blue border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-lyratech-purple transition-all duration-200 shadow-md"
      >
        {collapsed ? <HiChevronRight size={14} /> : <HiChevronLeft size={14} />}
      </button>
    </aside>
  );
}
