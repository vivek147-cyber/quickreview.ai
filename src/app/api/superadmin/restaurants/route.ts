import { NextResponse } from "next/server";
import { createServiceClient, supabase } from "@/lib/supabase";
import { jsonError, requireActor, slugify } from "@/lib/server-auth";
import type { Restaurant, RestaurantCategory, RestaurantPlan, ReviewEvent, UserProfile } from "@/lib/supabase";
import { DEFAULT_LABELS } from "@/lib/constants";

const plans = new Set(["free", "starter", "pro", "enterprise"]);
const categories = new Set(["qsr", "casual_dining", "fine_dining", "cafe", "cloud_kitchen", "hotel"]);

export async function GET(req: Request) {
  const { actor, error } = await requireActor(req, ["superadmin"]);
  if (error || !actor) return error;

  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceClient() : supabase;
  const [{ data: restaurants }, { data: users }, { data: reviews }] = await Promise.all([
    service.from("restaurants").select("*").neq("status", "deleted").order("created_at", { ascending: false }),
    service.from("users").select("*").in("role", ["admin", "coadmin"]),
    service.from("review_events").select("*").order("created_at", { ascending: false }),
  ]);

  const restaurantRows = (restaurants || []) as Restaurant[];
  const userRows = (users || []) as UserProfile[];
  const reviewRows = (reviews || []) as ReviewEvent[];

  const rows = restaurantRows.map((restaurant) => {
    const owner = userRows.find((user) => user.restaurant_id === restaurant.id && user.role === "admin");
    const restaurantReviews = reviewRows.filter((review) => review.restaurant_id === restaurant.id);
    const averageRating = restaurantReviews.length
      ? Number((restaurantReviews.reduce((sum, review) => sum + review.rating, 0) / restaurantReviews.length).toFixed(1))
      : 0;

    return {
      ...restaurant,
      owner_name: owner?.full_name || null,
      owner_email: owner?.email || null,
      total_reviews: restaurantReviews.length,
      average_rating: averageRating,
      last_active: restaurantReviews[0]?.created_at || null,
    };
  });

  return NextResponse.json({ restaurants: rows });
}

export async function POST(req: Request) {
  const { actor, error } = await requireActor(req, ["superadmin"]);
  if (error || !actor) return error;

  const body = await req.json().catch(() => null);
  const name = String(body?.name || "").trim();
  const ownerEmail = String(body?.ownerEmail || "").trim().toLowerCase();
  const ownerName = String(body?.ownerName || "").trim();
  const slug = slugify(body?.slug || name);

  if (!name || !ownerEmail || !ownerName || !slug) {
    return jsonError("Restaurant name, slug, owner name, and owner email are required");
  }

  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceClient() : supabase;
  const temporaryPassword =
    body?.temporaryPassword ||
    `Qr-${Math.random().toString(36).slice(2, 8)}-${Math.random().toString(36).slice(2, 6)}!`;

  const restaurantPayload = {
    name,
    slug,
    city: body?.city || null,
    category: categories.has(body?.category) ? (body.category as RestaurantCategory) : "casual_dining",
    location_count: body?.locationCount || "1",
    logo_url: body?.logoUrl || null,
    brand_color: body?.brandColor || "#FF6B35",
    brand_color_2: body?.brandColor2 || "#FFFFFF",
    qr_headline: body?.qrHeadline || `How was your ${name} experience?`,
    qr_tagline: body?.qrTagline || null,
    google_place_id: body?.googlePlaceId || null,
    plan: plans.has(body?.plan) ? (body.plan as RestaurantPlan) : "free",
    trial_ends_at: body?.trialEndsAt || null,
    created_by: actor.userId === "00000000-0000-0000-0000-000000000001" ? null : actor.userId,
  };

  let { data: restaurant, error: restaurantError } = await service
    .from("restaurants")
    .insert(restaurantPayload)
    .select("*")
    .single();

  if (restaurantError?.message?.includes("schema cache")) {
    const legacyPayload = {
      name,
      slug,
      brand_color: body?.brandColor || "#FF6B35",
      google_place_id: body?.googlePlaceId || null,
      owner_id: ownerEmail,
      plan: String(body?.plan || "Free").replace(/^./, (char) => char.toUpperCase()),
      status: "active",
    };

    const legacyResult = await service
      .from("restaurants")
      .insert(legacyPayload as never)
      .select("*")
      .single();

    restaurant = legacyResult.data as typeof restaurant;
    restaurantError = legacyResult.error;
  }

  if (restaurantError || !restaurant) {
    return jsonError(restaurantError?.message || "Unable to create restaurant", 500);
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      restaurant,
      owner: null,
      temporaryPassword,
      warning:
        "Demo mode: restaurant was created, but no real Supabase Auth owner user was created because SUPABASE_SERVICE_ROLE_KEY is missing.",
    });
  }

  const serviceAdmin = createServiceClient();
  const { data: createdUser, error: authError } = await serviceAdmin.auth.admin.createUser({
    email: ownerEmail,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      full_name: ownerName,
      role: "admin",
      restaurant_id: restaurant.id,
    },
  });

  if (authError || !createdUser.user) {
    await serviceAdmin.from("restaurants").delete().eq("id", restaurant.id);
    return jsonError(authError?.message || "Unable to create owner login", 500);
  }

  const { data: owner, error: ownerError } = await serviceAdmin
    .from("users")
    .insert({
      id: createdUser.user.id,
      email: ownerEmail,
      full_name: ownerName,
      role: "admin",
      restaurant_id: restaurant.id,
    })
    .select("*")
    .single();

  if (ownerError) {
    return jsonError(ownerError.message, 500);
  }

  // 1. Create Default QR Code
  await serviceAdmin.from("qr_codes").insert({
    restaurant_id: restaurant.id,
    name: "Main Entrance",
    table_number: null,
    frame_text: "Scan to Review",
    fg_color: restaurant.brand_color,
    bg_color: "#FFFFFF",
  });

  // 2. Create Default Labels
  const labelsToInsert = DEFAULT_LABELS.map((label, index) => ({
    restaurant_id: restaurant.id,
    text: label.text,
    emoji: label.emoji,
    category: label.category,
    sentiment: label.sentiment,
    sort_order: index,
  }));
  await serviceAdmin.from("labels").insert(labelsToInsert);

  await serviceAdmin.from("admin_activity_log").insert({
    actor_id: actor.userId,
    action: "onboard_restaurant",
    target_type: "restaurant",
    target_id: restaurant.id,
    metadata: { ownerEmail, plan: restaurant.plan },
    ip_address: req.headers.get("x-forwarded-for"),
  });

  return NextResponse.json({ restaurant, owner, temporaryPassword });
}
