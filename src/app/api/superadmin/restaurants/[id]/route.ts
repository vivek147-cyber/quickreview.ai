import { NextResponse } from "next/server";
import { createServiceClient, supabase } from "@/lib/supabase";
import { jsonError, requireActor, slugify } from "@/lib/server-auth";

export async function PATCH(req: Request, ctx: RouteContext<"/api/superadmin/restaurants/[id]">) {
  const { actor, error } = await requireActor(req, ["superadmin"]);
  if (error || !actor) return error;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const patch = {
    name: typeof body?.name === "string" ? body.name.trim() : undefined,
    slug: typeof body?.slug === "string" ? slugify(body.slug) : undefined,
    city: typeof body?.city === "string" ? body.city : undefined,
    brand_color: typeof body?.brandColor === "string" ? body.brandColor : undefined,
    brand_color_2: typeof body?.brandColor2 === "string" ? body.brandColor2 : undefined,
    google_place_id: typeof body?.googlePlaceId === "string" ? body.googlePlaceId : undefined,
    plan: body?.plan,
    status: body?.status,
  };

  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceClient() : supabase;
  let { data, error: updateError } = await service
    .from("restaurants")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (updateError?.message?.includes("schema cache")) {
    const legacyPatch = {
      name: patch.name,
      slug: patch.slug,
      brand_color: patch.brand_color,
      google_place_id: patch.google_place_id,
      plan: patch.plan,
      status: patch.status,
    };

    const legacyResult = await service
      .from("restaurants")
      .update(legacyPatch as never)
      .eq("id", id)
      .select("*")
      .single();

    data = legacyResult.data as typeof data;
    updateError = legacyResult.error;
  }

  if (updateError || !data) return jsonError(updateError?.message || "Unable to update restaurant", 500);

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await createServiceClient().from("admin_activity_log").insert({
      actor_id: actor.userId,
      action: body?.status ? `set_restaurant_${body.status}` : "update_restaurant",
      target_type: "restaurant",
      target_id: id,
      metadata: body || {},
      ip_address: req.headers.get("x-forwarded-for"),
    });
  }

  return NextResponse.json({ restaurant: data });
}
