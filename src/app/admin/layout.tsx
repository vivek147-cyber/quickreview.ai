"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, QrCode, Tag, Settings, LogOut,
  BarChart3, Menu, MessageSquare, ExternalLink,
} from "lucide-react";
import { getAdminContext } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { AdminContext } from "@/lib/api";

const NAV_ITEMS: { label: string; href: string; icon: React.ElementType; soon?: boolean }[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Reviews", href: "/admin/reviews", icon: MessageSquare },
  { label: "QR Codes", href: "/admin/qr-codes", icon: QrCode },
  { label: "Labels", href: "/admin/labels", icon: Tag },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [context, setContext] = useState<AdminContext | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    getAdminContext()
      .then((data) => {
        if (!["admin", "coadmin"].includes(data.profile.role)) {
          router.replace("/superadmin/restaurants");
          return;
        }
        setContext(data);
      })
      .catch(() => router.replace(`/login?next=${encodeURIComponent(pathname)}`))
      .finally(() => setChecking(false));
  }, [pathname, router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-xs text-zinc-400 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  const currentLabel = NAV_ITEMS.find((item) => pathname === item.href)?.label ?? "Dashboard";
  const initials = context?.restaurant?.name?.slice(0, 2).toUpperCase() ?? "QR";
  const brandColor = context?.restaurant?.brand_color ?? "#FF6B35";

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${collapsed ? "w-16" : "w-56"} shrink-0 flex flex-col bg-white border-r border-zinc-100 transition-all duration-200`}>
        {/* Header */}
        <div className={`flex items-center h-14 border-b border-zinc-100 px-4 gap-3 ${collapsed ? "justify-center" : ""}`}>
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
            style={{ backgroundColor: brandColor }}
          >
            {initials[0]}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-zinc-900 truncate">{context?.restaurant?.name ?? "Restaurant"}</p>
              <p className="text-[10px] text-zinc-400 capitalize">{context?.restaurant?.plan ?? "free"} plan</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.soon ? "#" : item.href}>
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                  isActive
                    ? "bg-primary/8 text-primary"
                    : item.soon
                    ? "text-zinc-300 cursor-not-allowed"
                    : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
                } ${collapsed ? "justify-center" : ""}`}>
                  <item.icon size={17} className={isActive ? "text-primary" : ""} />
                  {!collapsed && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {item.soon && (
                        <span className="text-[9px] font-bold bg-zinc-100 text-zinc-400 px-1.5 py-0.5 rounded-full">SOON</span>
                      )}
                      {isActive && <div className="w-1 h-4 rounded-full bg-primary" />}
                    </>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className={`px-2 py-3 border-t border-zinc-100 space-y-0.5 ${collapsed ? "flex flex-col items-center" : ""}`}>
          {context?.restaurant && !collapsed && (
            <Link href={`/r/${context.restaurant.slug}`} target="_blank">
              <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 transition-all">
                <ExternalLink size={15} />
                <span>Preview QR Page</span>
              </div>
            </Link>
          )}
          <button
            onClick={signOut}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all w-full ${collapsed ? "justify-center" : ""}`}
          >
            <LogOut size={16} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-white border-b border-zinc-100 flex items-center px-6 gap-4 shrink-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all"
          >
            <Menu size={17} />
          </button>
          <div className="h-4 w-px bg-zinc-200" />
          <p className="text-sm font-semibold text-zinc-900">{currentLabel}</p>
        </header>

        <div className="flex-1 overflow-auto bg-zinc-50 p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
