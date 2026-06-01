"use client";

import { useEffect, useState } from "react";
import { BarChart3, Star, Store, Users } from "lucide-react";
import { getAccessToken } from "@/lib/api";
import { toast } from "sonner";

type StatsData = {
  restaurants: { total: number; active: number };
  users: { total: number };
  reviews: {
    total: number; last30: number; last7: number; avgRating: number;
    ratingDist: { star: number; count: number }[];
    daily: { date: string; count: number }[];
  };
};

export default function GlobalStatsPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch("/api/superadmin/stats", { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error((await res.json()).error);
        setData(await res.json());
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load stats");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const maxDaily = data ? Math.max(...data.reviews.daily.map(d => d.count), 1) : 1;
  const maxRating = data ? Math.max(...data.reviews.ratingDist.map(d => d.count), 1) : 1;

  const cards = data ? [
    { label: "Total Restaurants", value: data.restaurants.total, sub: `${data.restaurants.active} active`, icon: Store, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Admin Accounts", value: data.users.total, sub: "across all restaurants", icon: Users, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Total Reviews", value: data.reviews.total, sub: `${data.reviews.last30} this month`, icon: BarChart3, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Avg Rating", value: `${data.reviews.avgRating}*`, sub: `${data.reviews.last7} this week`, icon: Star, color: "text-amber-600", bg: "bg-amber-50" },
  ] : [];

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-gray-900">Global Stats</h1>
        <p className="text-sm text-gray-500 mt-1">Platform-wide performance across all restaurants.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3 mb-3" />
            <div className="h-8 bg-gray-100 rounded animate-pulse w-1/2" />
          </div>
        )) : cards.map(c => (
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
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <p className="text-sm font-bold text-gray-900 mb-5">Daily Reviews (Last 30 Days)</p>
          {!loading && data && data.reviews.daily.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No reviews yet.</p>
          ) : (
            <div className="flex items-end gap-0.5 h-32">
              {(loading ? Array.from({ length: 30 }) : (data?.reviews.daily ?? [])).map((item, i) => {
                if (loading) return <div key={i} className="flex-1 bg-orange-100 rounded-t animate-pulse" style={{ height: "50%" }} />;
                const d = item as { date: string; count: number };
                return (
                  <div key={d.date} className="flex-1" title={`${d.date}: ${d.count}`}>
                    <div className="w-full bg-orange-400 hover:bg-orange-500 rounded-t cursor-default"
                      style={{ height: `${Math.max(4, (d.count / maxDaily) * 100)}%` }} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <p className="text-sm font-bold text-gray-900 mb-5">Rating Distribution</p>
          <div className="space-y-3">
            {[5,4,3,2,1].map(star => {
              const d = data?.reviews.ratingDist.find(r => r.star === star);
              const count = loading ? 0 : (d?.count ?? 0);
              const color = star >= 4 ? "bg-green-400" : star === 3 ? "bg-amber-400" : "bg-red-400";
              return (
                <div key={star} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-gray-500 w-6 shrink-0">{star}*</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    {loading
                      ? <div className="h-full bg-gray-200 animate-pulse rounded-full w-1/2" />
                      : <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.round((count / maxRating) * 100)}%` }} />}
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right tabular-nums">{loading ? "..." : count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
