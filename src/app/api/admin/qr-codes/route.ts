import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { assertRestaurant, jsonError, requireActor } from "@/lib/server-auth";
import type { QRCodeRow, QRScan, ReviewEvent } from "@/lib/supabase";

export async function GET(req: Request) {
  const { actor, error } = await requireActor(req, ["admin", "coadmin"]);
  if (error || !actor) return error;

  const restaurantResult = assertRestaurant(actor);
  if (restaurantResult.error || !restaurantResult.restaurant) return restaurantResult.error;

  const service = createServiceClient();
  const restaurantId = restaurantResult.restaurant.id;

  const [{ data: qrs }, { data: scans }, { data: reviews }] = await Promise.all([
    service.from("qr_codes").select("*").eq("restaurant_id", restaurantId).order("created_at", { ascending: false }),
    service.from("qr_scans").select("*").eq("restaurant_id", restaurantId),
    service.from("review_events").select("*").eq("restaurant_id", restaurantId),
  ]);

  const qrRows = (qrs || []) as QRCodeRow[];
  const scanRows = (scans || []) as QRScan[];
  const reviewRows = (reviews || []) as ReviewEvent[];

  const qrsWithStats = qrRows.map((qr) => {
    const qrScans = scanRows.filter((scan) => scan.qr_code_id === qr.id);
    const qrReviews = reviewRows.filter((review) => review.qr_code_id === qr.id);
    const averageRating = qrReviews.length
      ? Number((qrReviews.reduce((sum, review) => sum + review.rating, 0) / qrReviews.length).toFixed(1))
      : 0;

    return {
      ...qr,
      scan_count: qrScans.length,
      review_count: qrReviews.length,
      completion_rate: qrScans.length ? Number(((qrReviews.length / qrScans.length) * 100).toFixed(1)) : 0,
      average_rating: averageRating,
    };
  });

  return NextResponse.json({ qrs: qrsWithStats });
}

export async function POST(req: Request) {
  const { actor, error } = await requireActor(req, ["admin", "coadmin"]);
  if (error || !actor) return error;

  const restaurantResult = assertRestaurant(actor);
  if (restaurantResult.error || !restaurantResult.restaurant) return restaurantResult.error;

  const body = await req.json().catch(() => null);
  const name = String(body?.name || "").trim();
  if (!name) return jsonError("QR name is required");

  const service = createServiceClient();
  const { data, error: insertError } = await service
    .from("qr_codes")
    .insert({
      restaurant_id: restaurantResult.restaurant.id,
      name,
      table_number: body?.table_number || null,
      custom_message: body?.custom_message || null,
      fg_color: body?.fg_color || restaurantResult.restaurant.brand_color,
      bg_color: body?.bg_color || "#FFFFFF",
      frame_text: "Scan to Rate Us!",
    })
    .select("*")
    .single();

  if (insertError || !data) return jsonError(insertError?.message || "Unable to create QR", 500);

  return NextResponse.json({ qr: data });
}
