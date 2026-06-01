import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { assertRestaurant, jsonError, requireActor } from "@/lib/server-auth";
import type { LabelCategory, LabelSentiment } from "@/lib/supabase";

const categories = new Set(["food", "service", "ambiance", "value", "speed", "other"]);
const sentiments = new Set(["positive", "constructive"]);

export async function GET(req: Request) {
  const { actor, error } = await requireActor(req, ["admin", "coadmin"]);
  if (error || !actor) return error;

  const restaurantResult = assertRestaurant(actor);
  if (restaurantResult.error || !restaurantResult.restaurant) return restaurantResult.error;

  const service = createServiceClient();
  const { data, error: labelsError } = await service
    .from("labels")
    .select("*")
    .eq("restaurant_id", restaurantResult.restaurant.id)
    .order("sentiment", { ascending: false })
    .order("sort_order", { ascending: true });

  if (labelsError) return jsonError(labelsError.message, 500);
  return NextResponse.json({ labels: data || [] });
}

export async function POST(req: Request) {
  const { actor, error } = await requireActor(req, ["admin", "coadmin"]);
  if (error || !actor) return error;

  const restaurantResult = assertRestaurant(actor);
  if (restaurantResult.error || !restaurantResult.restaurant) return restaurantResult.error;

  const body = await req.json().catch(() => null);
  const text = String(body?.text || "").trim();
  if (!text) return jsonError("Label text is required");

  const category = categories.has(body?.category) ? body.category : "other";
  const sentiment = sentiments.has(body?.sentiment) ? body.sentiment : "positive";
  const service = createServiceClient();

  const { count } = await service
    .from("labels")
    .select("*", { count: "exact", head: true })
    .eq("restaurant_id", restaurantResult.restaurant.id);

  const { data, error: insertError } = await service
    .from("labels")
    .insert({
      restaurant_id: restaurantResult.restaurant.id,
      text,
      emoji: body?.emoji || null,
      category: category as LabelCategory,
      sentiment: sentiment as LabelSentiment,
      sort_order: count || 0,
    })
    .select("*")
    .single();

  if (insertError || !data) return jsonError(insertError?.message || "Unable to create label", 500);
  return NextResponse.json({ label: data });
}
