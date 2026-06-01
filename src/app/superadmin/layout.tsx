"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, CreditCard, LogOut, Settings, ShieldCheck, Store, Users, Zap } from "lucide-react";
import { getAdminContext } from "@/lib/api";
import { supabase } from "@/lib/supabase";

const NAV_ITEMS = [
  { label: "Restaurants", href: "/superadmin/restaurants", icon: Store },
  { label: "Accounts", href: "/superadmin/accounts", icon: Users },
  { label: "Billing", href: "/superadmin/billing", icon: CreditCard },
  { label: "AI Usage", href: "/superadmin/usage", icon: Zap },
  { label: "Global Stats", href: "/superadmin/stats", icon: BarChart3 },
  { label: "Config", href: "/superadmin/config", icon: Settings },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    getAdminContext()
      .then((data) => {
        if (data.profile.role !== "superadmin") router.replace("/admin/dashboard");
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
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-xs text-white/30 font-medium">Verifying access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-100 dark:bg-zinc-950 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 flex flex-col bg-zinc-950 border-r border-white/5">
        {/* Logo */}
        <div className="px-5 py-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 gradient-brand rounded-lg flex items-center justify-center shadow-md shadow-primary/30">
              <ShieldCheck size={16} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">QuikReview</p>
              <p className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5">Super Admin</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-primary text-white shadow-sm shadow-primary/30"
                    : "text-white/40 hover:text-white hover:bg-white/5"
                }`}>
                  <item.icon size={16} />
                  <span>{item.label}</span>
                  {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-white/5">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/30 hover:text-red-400 hover:bg-red-500/8 transition-all"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-zinc-200 flex items-center justify-between px-8 shrink-0">
          <div>
            <p className="text-sm font-semibold text-zinc-900">
              {NAV_ITEMS.find((item) => pathname.startsWith(item.href))?.label ?? "Overview"}
            </p>
            <p className="text-[11px] text-zinc-400">Super Admin Panel</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            <span className="text-xs text-zinc-400 font-medium">System Online</span>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-zinc-50 p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
