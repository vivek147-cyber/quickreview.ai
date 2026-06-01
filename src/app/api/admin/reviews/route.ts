import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { assertRestaurant, jsonError, requireActor } from "@/lib/server-auth";

const PAGE_SIZE = 20;

export async function GET(req: Request) {
  const { actor, error } = await requireActor(req, ["admin", "coadmin"]);
  if (error || !actor) return error;

  const { restaurant, error: restaurantError } = assertRestaurant(actor);
  if (restaurantError || !restaurant) return restaurantError;

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const rating = url.searchParams.get("rating");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const offset = (page - 1) * PAGE_SIZE;

  const service = createServiceClient();

  let query = service
    .from("review_events")
    .select("*", { count: "exact" })
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (rating) query = query.eq("rating", parseInt(rating));
  if (from) query = query.gte("created_at", `${from}T00:00:00.000Z`);
  if (to) query = query.lte("created_at", `${to}T23:59:59.999Z`);

  const { data, count, error: dbError } = await query;
  if (dbError) return jsonError(dbError.message, 500);

  return NextResponse.json({
    reviews: data ?? [],
    total: count ?? 0,
    page,
    pages: Math.ceil((count ?? 0) / PAGE_SIZE),
  });
}
