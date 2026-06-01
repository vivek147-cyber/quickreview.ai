"use client";

import { useEffect, useState } from "react";
import { BarChart3, Edit2, Star, TrendingUp } from "lucide-react";
import { getAccessToken } from "@/lib/api";
import { toast } from "sonner";

type Analytics = {
  total: number; avgRating: number; editRate: number;
  daily: { date: string; count: number; avg_rating: number }[];
  ratingDist: { star: number; count: number }[];
  topLabels: { label: string; count: number }[];
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch("/api/admin/analytics", { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error((await res.json()).error);
        setData(await res.json());
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const maxDaily = data ? Math.max(...data.daily.map(d => d.count), 1) : 1;
  const maxLabel = data ? Math.max(...data.topLabels.map(l => l.count), 1) : 1;
  const maxRating = data ? Math.max(...data.ratingDist.map(d => d.count), 1) : 1;

  const summaryCards = data ? [
    { label: "Total Reviews", value: data.total, sub: "Last 30 days", icon: BarChart3, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Avg Rating", value: `${data.avgRating}★`, sub: "Across all reviews", icon: Star, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Edit Rate", value: `${data.editRate}%`, sub: "Customers who edited AI review", icon: Edit2, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Daily Avg", value: data.daily.length ? (data.total / data.daily.length).toFixed(1) : "0", sub: "Reviews per day", icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
  ] : [];

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Last 30 days — review performance for your restaurant.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3 mb-3" />
                <div className="h-8 bg-gray-100 rounded animate-pulse w-1/2" />
              </div>
            ))
          : summaryCards.map(c => (
              <div key={c.label} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-gray-500">{c.label}</p>
                  <div className={`w-7 h-7 rounded-lg ${c.bg} flex items-center justify-center`}>
                    <c.icon size={15} className={c.color} />
                  </div>
                </div>
                <p className="text-3xl font-black text-gray-900 tabular-nums">{c.value}</p>
                <p className="text-xs text-gray-400 mt-1">{c.sub}</p>
              </div>
            ))}
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Daily chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <p className="text-sm font-bold text-gray-900 mb-5">Daily Reviews</p>
          {!loading && data?.daily.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No reviews yet this period.</p>
          ) : (
            <div className="flex items-end gap-0.5 h-28">
              {(loading ? Array.from({ length: 30 }) : data?.daily ?? []).map((item, i) => {
                if (loading) return (
                  <div key={i} className="flex-1 bg-orange-100 rounded-t animate-pulse" style={{ height: `${20 + Math.random() * 70}%` }} />
                );
                const d = item as { date: string; count: number };
                return (
                  <div key={d.date} className="flex-1" title={`${d.date}: ${d.count}`}>
                    <div className="w-full bg-orange-400 hover:bg-orange-500 rounded-t transition-colors cursor-default"
                      style={{ height: `${Math.max(4, (d.count / maxDaily) * 100)}%` }} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rating dist */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <p className="text-sm font-bold text-gray-900 mb-5">Rating Breakdown</p>
          {loading ? (
            <div className="space-y-3">
              {[5,4,3,2,1].map(s => (
                <div key={s} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-gray-400 w-6">{s}★</span>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {[5,4,3,2,1].map(star => {
                const d = data?.ratingDist.find(r => r.star === star);
                const count = d?.count ?? 0;
                const pct = Math.round((count / maxRating) * 100);
                const color = star >= 4 ? "bg-green-400" : star === 3 ? "bg-amber-400" : "bg-red-400";
                return (
                  <div key={star} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-500 w-6 shrink-0">{star}★</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                      <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right tabular-nums">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top labels */}
      {!loading && data && data.topLabels.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <p className="text-sm font-bold text-gray-900 mb-5">Most Selected Labels</p>
          <div className="space-y-3">
            {data.topLabels.map(({ label, count }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-sm text-gray-700 w-36 shrink-0 truncate font-medium">{label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div className="h-full bg-orange-400 rounded-full" style={{ width: `${(count / maxLabel) * 100}%` }} />
                </div>
                <span className="text-xs text-gray-500 w-8 text-right tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
