import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { assertRestaurant, jsonError, requireActor } from "@/lib/server-auth";

export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/labels/[id]">) {
  const { actor, error } = await requireActor(req, ["admin", "coadmin"]);
  if (error || !actor) return error;

  const restaurantResult = assertRestaurant(actor);
  if (restaurantResult.error || !restaurantResult.restaurant) return restaurantResult.error;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const patch = {
    text: typeof body?.text === "string" ? body.text.trim() : undefined,
    emoji: typeof body?.emoji === "string" ? body.emoji : undefined,
    category: body?.category,
    sentiment: body?.sentiment,
    is_visible: typeof body?.is_visible === "boolean" ? body.is_visible : undefined,
    sort_order: typeof body?.sort_order === "number" ? body.sort_order : undefined,
    updated_at: new Date().toISOString(),
  };

  const service = createServiceClient();
  const { data, error: updateError } = await service
    .from("labels")
    .update(patch)
    .eq("id", id)
    .eq("restaurant_id", restaurantResult.restaurant.id)
    .select("*")
    .single();

  if (updateError || !data) return jsonError(updateError?.message || "Unable to update label", 500);
  return NextResponse.json({ label: data });
}

export async function DELETE(req: Request, ctx: RouteContext<"/api/admin/labels/[id]">) {
  const { actor, error } = await requireActor(req, ["admin", "coadmin"]);
  if (error || !actor) return error;

  const restaurantResult = assertRestaurant(actor);
  if (restaurantResult.error || !restaurantResult.restaurant) return restaurantResult.error;

  const { id } = await ctx.params;
  const service = createServiceClient();
  const { error: deleteError } = await service
    .from("labels")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurantResult.restaurant.id);

  if (deleteError) return jsonError(deleteError.message, 500);
  return NextResponse.json({ ok: true });
}
