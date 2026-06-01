"use client";

import { useEffect, useState, useCallback } from "react";
import { BarChart3, Coins, Hash, Zap, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getAIUsage } from "@/lib/api";
import { toast } from "sonner";

type UsageData = Awaited<ReturnType<typeof getAIUsage>>;

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function toDateInput(d: Date) {
  return d.toISOString().split("T")[0];
}

export default function AIUsagePage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(() => toDateInput(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
  const [to, setTo] = useState(() => toDateInput(new Date()));

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getAIUsage({ from, to }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load usage data");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { fetch(); }, [fetch]);

  const maxTokens = data ? Math.max(...data.by_day.map(d => d.total_tokens), 1) : 1;

  const cards = data ? [
    { label: "API Calls", value: fmt(data.summary.total_calls), icon: Hash, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Total Tokens", value: fmt(data.summary.total_tokens), icon: Zap, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Input Tokens", value: fmt(data.summary.prompt_tokens), icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
    { label: "Output Tokens", value: fmt(data.summary.completion_tokens), icon: BarChart3, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Est. Cost (USD)", value: data.summary.estimated_cost_usd < 0.001 ? "$0.00" : `$${data.summary.estimated_cost_usd.toFixed(4)}`, icon: Coins, color: "text-rose-600", bg: "bg-rose-50" },
  ] : [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">AI Usage Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Model: <span className="font-medium text-gray-700">Groq llama3-8b-8192</span> · Free tier active
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">From</p>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-36 h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">To</p>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-36 h-9 text-sm" />
          </div>
          <Button onClick={fetch} disabled={loading} size="sm" className="bg-orange-500 hover:bg-orange-600">
            {loading ? "Loading…" : "Apply"}
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3 mb-3" />
                <div className="h-7 bg-gray-100 rounded animate-pulse w-1/2" />
              </div>
            ))
          : cards.map(c => (
              <div key={c.label} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-gray-500">{c.label}</p>
                  <div className={`w-7 h-7 rounded-lg ${c.bg} flex items-center justify-center`}>
                    <c.icon className={`w-3.5 h-3.5 ${c.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-black text-gray-900 tabular-nums">{c.value}</p>
              </div>
            ))}
      </div>

      {/* Bar chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <p className="text-sm font-bold text-gray-900 mb-5">Daily Token Usage</p>
        {!loading && data?.by_day.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center">No usage data in this date range.</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex items-end gap-1 h-36 min-w-0 pb-1">
              {(loading ? Array.from({ length: 20 }) : data?.by_day ?? []).map((item, i) => {
                if (loading) return (
                  <div key={i} className="flex-1 bg-orange-100 rounded-t animate-pulse" style={{ height: `${30 + Math.random() * 60}%` }} />
                );
                const d = item as UsageData["by_day"][number];
                const h = Math.max(4, (d.total_tokens / maxTokens) * 100);
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      title={`${d.date}: ${fmt(d.total_tokens)} tokens · ${d.calls} calls`}
                      className="w-full bg-orange-400 hover:bg-orange-500 rounded-t cursor-default transition-colors"
                      style={{ height: `${h}%` }}
                    />
                    <span className="text-[8px] text-gray-400 rotate-45 origin-left whitespace-nowrap hidden sm:block">
                      {d.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Per-restaurant table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <p className="text-sm font-bold text-gray-900">Usage by Restaurant</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                <th className="px-6 py-3 text-left">Restaurant</th>
                <th className="px-4 py-3 text-right">Calls</th>
                <th className="px-4 py-3 text-right">Input</th>
                <th className="px-4 py-3 text-right">Output</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-6 py-3 text-right">Est. Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">Loading…</td></tr>
              ) : (data?.by_restaurant ?? []).length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">No data for this period.</td></tr>
              ) : (
                data?.by_restaurant.map(r => (
                  <tr key={r.restaurant_id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-3.5 font-medium text-gray-900">{r.name}</td>
                    <td className="px-4 py-3.5 text-right text-gray-600">{r.calls}</td>
                    <td className="px-4 py-3.5 text-right text-gray-500">{fmt(r.prompt_tokens)}</td>
                    <td className="px-4 py-3.5 text-right text-gray-500">{fmt(r.completion_tokens)}</td>
                    <td className="px-4 py-3.5 text-right font-semibold text-gray-900">{fmt(r.total_tokens)}</td>
                    <td className="px-6 py-3.5 text-right text-rose-500 font-medium">
                      {r.estimated_cost_usd < 0.001 ? "$0.00" : `$${r.estimated_cost_usd.toFixed(4)}`}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
