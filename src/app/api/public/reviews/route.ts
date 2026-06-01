import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { wordCount } from "@/lib/server-auth";
import { DEMO_RESTAURANT_ID } from "@/lib/constants";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const restaurantId = String(body?.restaurantId || "");
  const rating = Number(body?.rating);
  const finalReview = String(body?.finalReview || "").trim();
  const selectedLabels = Array.isArray(body?.selectedLabels)
    ? body.selectedLabels.map(String).slice(0, 20)
    : [];

  if (!restaurantId || !rating || !finalReview) {
    return NextResponse.json({ error: "Missing review details" }, { status: 400 });
  }

  if (rating < 1 || rating > 5 || finalReview.length > 1500) {
    return NextResponse.json({ error: "Invalid review payload" }, { status: 400 });
  }

  // Demo restaurant — skip DB entirely
  if (restaurantId === DEMO_RESTAURANT_ID) {
    return NextResponse.json({ reviewId: "demo-review-id" });
  }

  const service = createServiceClient();

  // Spam: one review per scan session
  const scanId = body?.scanId as string | null;
  if (scanId && scanId !== "demo-scan-id") {
    const { count } = await service
      .from("review_events")
      .select("id", { count: "exact", head: true })
      .eq("scan_id", scanId);
    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: "already submitted" }, { status: 429 });
    }
  }

  // Phone dedup: same phone + same restaurant → max 1 review per 24 hours
  // After 24 hours they can review again (not a permanent block)
  const customerPhone = String(body?.customerPhone || "").replace(/\D/g, "").slice(0, 15);
  if (customerPhone.length >= 10) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: phoneCount } = await service
      .from("review_events")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId)
      .eq("customer_phone", customerPhone)
      .gte("created_at", oneDayAgo);
    if ((phoneCount ?? 0) > 0) {
      return NextResponse.json({ error: "already submitted" }, { status: 429 });
    }
  }

  // Spam: max 60 reviews per restaurant per hour (handles large events)
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await service
    .from("review_events")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .gte("created_at", hourAgo);
  if ((recentCount ?? 0) >= 60) {
    return NextResponse.json({ error: "Too many reviews submitted recently. Please try again later." }, { status: 429 });
  }

  const { data: restaurant } = await service
    .from("restaurants")
    .select("id,status")
    .eq("id", restaurantId)
    .single();

  if (!restaurant || restaurant.status !== "active") {
    return NextResponse.json({ error: "Review page unavailable" }, { status: 403 });
  }

  let { data, error } = await service
    .from("review_events")
    .insert({
      restaurant_id: restaurantId,
      qr_code_id: body?.qrCodeId || null,
      scan_id: body?.scanId || null,
      rating,
      selected_labels: selectedLabels,
      ai_option_shown: body?.aiOptionShown || null,
      was_edited: Boolean(body?.wasEdited),
      final_review: finalReview,
      char_count: finalReview.length,
      word_count: wordCount(finalReview),
      regenerated: Boolean(body?.regenerated),
      time_to_submit: Number.isFinite(Number(body?.timeToSubmit)) ? Number(body.timeToSubmit) : null,
      customer_email: String(body?.customerEmail || "").trim().toLowerCase() || null,
      customer_phone: String(body?.customerPhone || "").replace(/\D/g, "").slice(0, 15) || null,
    })
    .select("id")
    .single();

  if (error?.message?.includes("schema cache")) {
    const legacyResult = await service
      .from("review_events")
      .insert({
        restaurant_id: restaurantId,
        qr_code_id: body?.qrCodeId || null,
        rating,
        selected_labels: selectedLabels,
        ai_review_text: finalReview,
        was_edited: Boolean(body?.wasEdited),
        status: "completed",
      } as never)
      .select("id")
      .single();

    data = legacyResult.data as typeof data;
    error = legacyResult.error;
  }

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Unable to submit review" }, { status: 500 });
  }

  return NextResponse.json({ reviewId: data.id });
}
