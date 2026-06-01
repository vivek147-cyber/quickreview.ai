"use client";

import { useEffect, useState, useCallback } from "react";
import { Check, IndianRupee, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getBillingOverview, updateBilling } from "@/lib/api";
import { toast } from "sonner";

type BillingRow = {
  id: string; name: string; slug: string; plan: string; status: string;
  monthly_fee: number; billing_status: string;
  last_payment_date: string | null; next_billing_date: string | null;
  billing_notes: string | null; created_at: string;
};

type Summary = {
  total: number; active: number; due: number; overdue: number; trial: number;
  monthly_revenue_inr: number;
};

const STATUS_STYLE: Record<string, string> = {
  active:    "bg-green-50 text-green-700 border-green-200",
  trial:     "bg-blue-50 text-blue-600 border-blue-200",
  due:       "bg-amber-50 text-amber-700 border-amber-200",
  overdue:   "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
};

const BILLING_STATUSES = ["trial", "active", "due", "overdue", "cancelled"] as const;

function EditModal({ row, onClose, onSaved }: { row: BillingRow; onClose: () => void; onSaved: (updated: Partial<BillingRow>) => void }) {
  const [form, setForm] = useState({
    billing_status: row.billing_status,
    monthly_fee: String(row.monthly_fee ?? 0),
    last_payment_date: row.last_payment_date ?? "",
    next_billing_date: row.next_billing_date ?? "",
    billing_notes: row.billing_notes ?? "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateBilling(row.id, {
        billing_status: form.billing_status,
        monthly_fee: Number(form.monthly_fee),
        last_payment_date: form.last_payment_date || null,
        next_billing_date: form.next_billing_date || null,
        billing_notes: form.billing_notes || null,
      });
      toast.success("Billing updated");
      onSaved({
        billing_status: form.billing_status,
        monthly_fee: Number(form.monthly_fee),
        last_payment_date: form.last_payment_date || null,
        next_billing_date: form.next_billing_date || null,
        billing_notes: form.billing_notes || null,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="font-black text-gray-900">{row.name}</p>
            <p className="text-xs text-gray-400">/{row.slug}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Status</label>
            <div className="flex flex-wrap gap-2">
              {BILLING_STATUSES.map(s => (
                <button key={s} onClick={() => setForm(f => ({ ...f, billing_status: s }))}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border capitalize transition-all ${
                    form.billing_status === s ? STATUS_STYLE[s] : "bg-gray-50 text-gray-500 border-gray-200"
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Monthly Fee (₹)</label>
            <div className="relative">
              <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input type="number" value={form.monthly_fee} onChange={e => setForm(f => ({ ...f, monthly_fee: e.target.value }))}
                className="pl-8 h-9" placeholder="0" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Last Payment</label>
              <Input type="date" value={form.last_payment_date} onChange={e => setForm(f => ({ ...f, last_payment_date: e.target.value }))} className="h-9" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Next Due</label>
              <Input type="date" value={form.next_billing_date} onChange={e => setForm(f => ({ ...f, next_billing_date: e.target.value }))} className="h-9" />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Notes</label>
            <Input value={form.billing_notes} onChange={e => setForm(f => ({ ...f, billing_notes: e.target.value }))}
              className="h-9" placeholder="Payment ref, bank transfer ID, etc." />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={save} disabled={saving} className="flex-1 bg-orange-500 hover:bg-orange-600 gap-2">
            <Check size={15} />
            {saving ? "Saving…" : "Save Changes"}
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  const [rows, setRows] = useState<BillingRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<BillingRow | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getBillingOverview();
      setRows(d.restaurants as BillingRow[]);
      setSummary(d.summary);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load billing");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaved = (id: string, updated: Partial<BillingRow>) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...updated } : r));
    setEditTarget(null);
    // Recompute summary
    load();
  };

  const filtered = filter === "all" ? rows : rows.filter(r => r.billing_status === filter);

  const isOverdue = (r: BillingRow) =>
    r.next_billing_date && new Date(r.next_billing_date) < new Date() && r.billing_status !== "cancelled";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-gray-900">Billing & Subscriptions</h1>
        <p className="text-sm text-gray-500 mt-1">Manual subscription tracking. Mark payments as received and set next due dates.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "Monthly Revenue", value: summary ? `₹${(summary.monthly_revenue_inr).toLocaleString("en-IN")}` : "—", highlight: true },
          { label: "Total", value: summary?.total ?? "—" },
          { label: "Active", value: summary?.active ?? "—", color: "text-green-600" },
          { label: "Trial", value: summary?.trial ?? "—", color: "text-blue-600" },
          { label: "Due", value: summary?.due ?? "—", color: "text-amber-600" },
          { label: "Overdue", value: summary?.overdue ?? "—", color: "text-red-600" },
        ].map((c, i) => (
          <div key={i} className={`rounded-2xl border p-4 ${c.highlight ? "bg-orange-500 border-orange-500 col-span-2 md:col-span-1" : "bg-white border-gray-100"}`}>
            <p className={`text-[11px] font-semibold uppercase tracking-wide mb-1 ${c.highlight ? "text-orange-100" : "text-gray-400"}`}>{c.label}</p>
            <p className={`text-2xl font-black tabular-nums ${c.highlight ? "text-white" : (c.color ?? "text-gray-900")}`}>{loading ? "…" : c.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {["all", "active", "trial", "due", "overdue", "cancelled"].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize border transition-all ${
              filter === s ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
            }`}>
            {s === "all" ? `All (${rows.length})` : `${s} (${rows.filter(r => r.billing_status === s).length})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                <th className="px-6 py-3 text-left">Restaurant</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Monthly Fee</th>
                <th className="px-4 py-3 text-left">Last Payment</th>
                <th className="px-4 py-3 text-left">Next Due</th>
                <th className="px-6 py-3 text-left">Notes</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-3 bg-gray-100 rounded animate-pulse" style={{ width: `${40 + Math.random() * 50}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-400">No restaurants in this category.</td></tr>
              ) : (
                filtered.map(r => {
                  const overdue = isOverdue(r);
                  return (
                    <tr key={r.id} className={`hover:bg-gray-50/50 ${overdue && r.billing_status === "active" ? "bg-red-50/30" : ""}`}>
                      <td className="px-6 py-3.5">
                        <p className="font-semibold text-gray-900">{r.name}</p>
                        <p className="text-[11px] text-gray-400">/{r.slug}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="capitalize text-xs font-medium text-gray-600">{r.plan}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${STATUS_STYLE[r.billing_status] ?? STATUS_STYLE.trial}`}>
                          {r.billing_status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-gray-900">
                        {r.monthly_fee > 0 ? `₹${r.monthly_fee.toLocaleString("en-IN")}` : <span className="text-gray-400 font-normal">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 text-xs">
                        {r.last_payment_date ? new Date(r.last_payment_date).toLocaleDateString("en-IN") : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        {r.next_billing_date ? (
                          <span className={overdue ? "text-red-600 font-semibold" : "text-gray-500"}>
                            {new Date(r.next_billing_date).toLocaleDateString("en-IN")}
                            {overdue && <span className="ml-1">⚠</span>}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-gray-400 max-w-[160px] truncate">
                        {r.billing_notes || "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <button onClick={() => setEditTarget(r)}
                          className="p-1.5 rounded-lg hover:bg-orange-50 text-gray-400 hover:text-orange-500 transition-colors">
                          <Pencil size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editTarget && (
        <EditModal
          row={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={(updated) => handleSaved(editTarget.id, updated)}
        />
      )}
    </div>
  );
}
