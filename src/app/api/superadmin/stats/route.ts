import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { jsonError, requireActor } from "@/lib/server-auth";

export async function GET(req: Request) {
  const { actor, error } = await requireActor(req, ["superadmin"]);
  if (error || !actor) return error;

  const service = createServiceClient();
  const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const last7  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalRestaurants },
    { count: activeRestaurants },
    { data: reviews },
    { count: totalUsers },
  ] = await Promise.all([
    service.from("restaurants").select("id", { count: "exact", head: true }).neq("status", "deleted"),
    service.from("restaurants").select("id", { count: "exact", head: true }).eq("status", "active"),
    service.from("review_events").select("rating, created_at").order("created_at", { ascending: false }),
    service.from("users").select("id", { count: "exact", head: true }).neq("role", "superadmin"),
  ]);

  const allReviews = reviews || [];
  const totalReviews = allReviews.length;
  const reviewsLast30 = allReviews.filter(r => r.created_at >= last30).length;
  const reviewsLast7  = allReviews.filter(r => r.created_at >= last7).length;
  const avgRating = totalReviews
    ? Number((allReviews.reduce((s, r) => s + r.rating, 0) / totalReviews).toFixed(2))
    : 0;

  const ratingDist = [1,2,3,4,5].map(star => ({
    star,
    count: allReviews.filter(r => r.rating === star).length,
  }));

  // Daily review counts for last 30 days
  const dayMap = new Map<string, number>();
  for (const r of allReviews) {
    if (r.created_at < last30) continue;
    const day = r.created_at.slice(0, 10);
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
  }
  const daily = Array.from(dayMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    restaurants: { total: totalRestaurants ?? 0, active: activeRestaurants ?? 0 },
    users: { total: totalUsers ?? 0 },
    reviews: { total: totalReviews, last30: reviewsLast30, last7: reviewsLast7, avgRating, ratingDist, daily },
  });
}
