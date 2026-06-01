import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { assertRestaurant, requireActor } from "@/lib/server-auth";
import type { QRScan, ReviewEvent } from "@/lib/supabase";

const dayMs = 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const { actor, error } = await requireActor(req, ["admin", "coadmin"]);
  if (error || !actor) return error;

  const restaurantResult = assertRestaurant(actor);
  if (restaurantResult.error || !restaurantResult.restaurant) return restaurantResult.error;

  const service = createServiceClient();
  const restaurantId = restaurantResult.restaurant.id;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const last7Start = new Date(now.getTime() - 7 * dayMs).toISOString();
  const last30Start = new Date(now.getTime() - 30 * dayMs).toISOString();

  const [{ data: reviews }, { data: scans }, { data: recentReviews }] = await Promise.all([
    service.from("review_events").select("*").eq("restaurant_id", restaurantId),
    service.from("qr_scans").select("*").eq("restaurant_id", restaurantId),
    service
      .from("review_events")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const allReviews = (reviews || []) as ReviewEvent[];
  const allScans = (scans || []) as QRScan[];
  const totalReviews = allReviews.length;
  const reviewsThisMonth = allReviews.filter((review) => review.created_at >= monthStart).length;
  const averageRating = totalReviews
    ? Number((allReviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews).toFixed(1))
    : 0;
  const reviewVelocity = Number(
    (allReviews.filter((review) => review.created_at >= last7Start).length / 7).toFixed(1)
  );
  const scansToday = allScans.filter((scan) => scan.scanned_at >= todayStart).length;
  const scansLast30 = allScans.filter((scan) => scan.scanned_at >= last30Start).length;
  const reviewsLast30 = allReviews.filter((review) => review.created_at >= last30Start).length;
  const completionRate = scansLast30
    ? Number(((reviewsLast30 / scansLast30) * 100).toFixed(1))
    : 0;

  const labelMap = new Map<string, number>();
  for (const review of allReviews) {
    for (const label of review.selected_labels || []) {
      labelMap.set(label, (labelMap.get(label) || 0) + 1);
    }
  }

  const labelCounts = Array.from(labelMap.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return NextResponse.json({
    restaurant: restaurantResult.restaurant,
    stats: {
      totalReviews,
      reviewsThisMonth,
      averageRating,
      reviewVelocity,
      scansToday,
      completionRate,
    },
    recentReviews: recentReviews || [],
    labelCounts,
  });
}
