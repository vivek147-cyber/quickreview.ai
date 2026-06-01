"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ToggleLeft, ToggleRight } from "lucide-react";
import { getAccessToken } from "@/lib/api";
import { toast } from "sonner";

type AccountRow = {
  id: string; email: string; role: string; full_name: string | null;
  is_active: boolean; created_at: string; last_login_at: string | null;
  restaurant: { id: string; name: string; slug: string; plan: string } | null;
};

async function fetchAccounts(): Promise<AccountRow[]> {
  const token = await getAccessToken();
  const res = await fetch("/api/superadmin/accounts", { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error((await res.json()).error);
  return (await res.json()).users;
}

async function patchActive(id: string, is_active: boolean) {
  const token = await getAccessToken();
  const res = await fetch("/api/superadmin/accounts", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ id, is_active }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
}

export default function AccountsPage() {
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "admin" | "coadmin">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await fetchAccounts()); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (row: AccountRow) => {
    try {
      await patchActive(row.id, !row.is_active);
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, is_active: !r.is_active } : r));
      toast.success(row.full_name || row.email);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  const filtered = filter === "all" ? rows : rows.filter(r => r.role === filter);

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-gray-900">Admin Accounts</h1>
        <p className="text-sm text-gray-500 mt-1">All restaurant admin accounts. Toggle to activate or deactivate access.</p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: rows.length },
          { label: "Admins", value: rows.filter(r => r.role === "admin").length },
          { label: "Active", value: rows.filter(r => r.is_active).length },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{c.label}</p>
            <p className="text-3xl font-black text-gray-900 mt-1">{loading ? "..." : c.value}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {(["all", "admin", "coadmin"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize border transition-all ${
              filter === f ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200"
            }`}>
            {f === "all" ? `All (${rows.length})` : `${f} (${rows.filter(r => r.role === f).length})`}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-orange-500 w-6 h-6" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                <th className="px-6 py-3 text-left">Account</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Restaurant</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-left">Last Login</th>
                <th className="px-6 py-3 text-right">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">No accounts found.</td></tr>
              ) : filtered.map(row => (
                <tr key={row.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-3.5">
                    <p className="font-semibold text-gray-900">{row.full_name || "No name"}</p>
                    <p className="text-xs text-gray-400">{row.email}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="capitalize text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">{row.role}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    {row.restaurant ? (
                      <div>
                        <p className="text-sm font-medium text-gray-900">{row.restaurant.name}</p>
                        <p className="text-xs text-gray-400">/{row.restaurant.slug}</p>
                      </div>
                    ) : <span className="text-gray-300 text-xs">No restaurant</span>}
                  </td>
                  <td className="px-4 py-3.5 capitalize text-xs text-gray-500">{row.restaurant?.plan ?? "free"}</td>
                  <td className="px-4 py-3.5 text-xs text-gray-400">
                    {row.last_login_at ? new Date(row.last_login_at).toLocaleDateString("en-IN") : "Never"}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <button onClick={() => toggle(row)}>
                      {row.is_active ? <ToggleRight size={24} className="text-green-500" /> : <ToggleLeft size={24} className="text-gray-300" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
