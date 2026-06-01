import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { jsonError, requireActor } from "@/lib/server-auth";

export async function GET(req: Request) {
  const { actor, error } = await requireActor(req, ["superadmin"]);
  if (error || !actor) return error;

  const service = createServiceClient();
  const { data: users, error: usersError } = await service
    .from("users")
    .select("id, email, role, full_name, is_active, created_at, last_login_at, restaurant_id")
    .neq("role", "superadmin")
    .order("created_at", { ascending: false });

  if (usersError) return jsonError(usersError.message, 500);

  const restaurantIds = [...new Set((users || []).map(u => u.restaurant_id).filter(Boolean))] as string[];
  const { data: restaurants } = restaurantIds.length
    ? await service.from("restaurants").select("id, name, slug, status, plan").in("id", restaurantIds)
    : { data: [] };

  const restaurantMap = new Map((restaurants || []).map(r => [r.id, r]));

  const enriched = (users || []).map(u => ({
    ...u,
    restaurant: u.restaurant_id ? restaurantMap.get(u.restaurant_id) ?? null : null,
  }));

  return NextResponse.json({ users: enriched });
}

export async function PATCH(req: Request) {
  const { actor, error } = await requireActor(req, ["superadmin"]);
  if (error || !actor) return error;

  const body = await req.json().catch(() => null);
  const { id, is_active } = body ?? {};
  if (!id) return jsonError("User ID required", 400);

  const service = createServiceClient();
  const { error: patchError } = await service
    .from("users")
    .update({ is_active: Boolean(is_active) })
    .eq("id", id)
    .neq("role", "superadmin");

  if (patchError) return jsonError(patchError.message, 500);
  return NextResponse.json({ ok: true });
}
