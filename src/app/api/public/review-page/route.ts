import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import type { Label, LabelCategory } from "@/lib/supabase";
import { DEMO_LABELS, DEMO_QR, DEMO_RESTAURANT, DEMO_RESTAURANT_SLUG } from "@/lib/constants";

type LegacyLabel = Label & {
  name?: string;
  is_active?: boolean;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  const qrId = url.searchParams.get("qr");

  if (!slug) {
    return NextResponse.json({ error: "Missing restaurant slug" }, { status: 400 });
  }

  // Demo restaurant — served entirely from code, no DB needed
  if (slug === DEMO_RESTAURANT_SLUG) {
    return NextResponse.json({
      restaurant: DEMO_RESTAURANT,
      labels: DEMO_LABELS,
      qr: DEMO_QR,
    });
  }

  const service = createServiceClient();
  const { data: config } = await service
    .from("system_config")
    .select("value")
    .eq("key", "global_settings")
    .single();

  const settings = (config?.value || {}) as {
    maintenance_mode?: boolean;
    maintenance_message?: string;
  };

  if (settings.maintenance_mode) {
    return NextResponse.json(
      {
        error: settings.maintenance_message || "QuikReview is temporarily unavailable.",
        maintenanceMessage: settings.maintenance_message,
      },
      { status: 503 }
    );
  }

  const { data: restaurant, error: restaurantError } = await service
    .from("restaurants")
    .select("*")
    .eq("slug", slug)
    .single();

  if (restaurantError || !restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  if (restaurant.status !== "active") {
    return NextResponse.json({ error: "This review page is temporarily unavailable." }, { status: 403 });
  }

  const [{ data: initialLabels }, qrResult] = await Promise.all([
    service
      .from("labels")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .eq("is_visible", true)
      .order("sort_order", { ascending: true }),
    qrId
      ? service
          .from("qr_codes")
          .select("*")
          .eq("restaurant_id", restaurant.id)
          .eq("id", qrId)
          .eq("is_active", true)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  let labels: Label[] = (initialLabels || []) as Label[];

  if (!labels) {
    const legacyLabels = await service
      .from("labels")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .eq("is_active" as never, true)
      .order("sort_order", { ascending: true });

    labels = ((legacyLabels.data || []) as LegacyLabel[]).map((label) => ({
      ...label,
      text: label.text || label.name || "Feedback",
      emoji: label.emoji || null,
      is_visible: label.is_visible ?? label.is_active ?? true,
      sentiment: label.sentiment || "positive",
      category: String(label.category || "other").toLowerCase() as LabelCategory,
      updated_at: label.updated_at || label.created_at,
    }));
  }

  return NextResponse.json({
    restaurant: {
      ...restaurant,
      category: restaurant.category || "casual_dining",
      city: restaurant.city || null,
      location_count: restaurant.location_count || "1",
      brand_color_2: restaurant.brand_color_2 || "#FFFFFF",
      qr_headline: restaurant.qr_headline || "How was your experience?",
      qr_tagline: restaurant.qr_tagline || null,
      plan: String(restaurant.plan || "free").toLowerCase(),
      trial_ends_at: restaurant.trial_ends_at || null,
      created_by: restaurant.created_by || null,
      updated_at: restaurant.updated_at || restaurant.created_at,
    },
    labels: labels || [],
    qr: qrResult.data
      ? {
          ...qrResult.data,
          custom_message: qrResult.data.custom_message || null,
          has_logo: qrResult.data.has_logo ?? true,
          corner_style: qrResult.data.corner_style || "rounded",
          frame_style: qrResult.data.frame_style || "none",
          frame_text: qrResult.data.frame_text || null,
          is_active: qrResult.data.is_active ?? true,
          updated_at: qrResult.data.updated_at || qrResult.data.created_at,
        }
      : null,
  });
}
