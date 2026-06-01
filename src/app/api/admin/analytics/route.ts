import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { assertRestaurant, requireActor } from "@/lib/server-auth";

export async function GET(req: Request) {
  const { actor, error } = await requireActor(req, ["admin", "coadmin"]);
  if (error || !actor) return error;

  const restaurantResult = assertRestaurant(actor);
  if (restaurantResult.error || !restaurantResult.restaurant) return restaurantResult.error;

  const service = createServiceClient();
  const restaurantId = restaurantResult.restaurant.id;
  const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: reviews } = await service
    .from("review_events")
    .select("rating, selected_labels, created_at, was_edited")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", last30)
    .order("created_at", { ascending: true });

  const all = reviews || [];

  // Daily counts
  const dayMap = new Map<string, { count: number; total_rating: number }>();
  for (const r of all) {
    const day = r.created_at.slice(0, 10);
    const prev = dayMap.get(day) ?? { count: 0, total_rating: 0 };
    dayMap.set(day, { count: prev.count + 1, total_rating: prev.total_rating + r.rating });
  }
  const daily = Array.from(dayMap.entries())
    .map(([date, d]) => ({ date, count: d.count, avg_rating: Number((d.total_rating / d.count).toFixed(1)) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Rating distribution
  const ratingDist = [1,2,3,4,5].map(star => ({ star, count: all.filter(r => r.rating === star).length }));

  // Label frequency
  const labelMap = new Map<string, number>();
  for (const r of all) for (const l of r.selected_labels ?? []) labelMap.set(l, (labelMap.get(l) ?? 0) + 1);
  const topLabels = Array.from(labelMap.entries()).map(([label, count]) => ({ label, count })).sort((a,b) => b.count - a.count).slice(0, 10);

  return NextResponse.json({
    total: all.length,
    avgRating: all.length ? Number((all.reduce((s,r) => s + r.rating, 0) / all.length).toFixed(1)) : 0,
    editRate: all.length ? Number(((all.filter(r => r.was_edited).length / all.length) * 100).toFixed(1)) : 0,
    daily,
    ratingDist,
    topLabels,
  });
}
