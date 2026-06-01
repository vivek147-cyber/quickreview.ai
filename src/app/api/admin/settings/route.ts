import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { jsonError, requireActor } from "@/lib/server-auth";

export async function PATCH(req: Request) {
  const { actor, error } = await requireActor(req, ["admin", "coadmin"]);
  if (error || !actor) return error;

  const body = await req.json().catch(() => null);
  const { google_place_id } = body ?? {};

  const service = createServiceClient();
  const { error: updateError } = await service
    .from("restaurants")
    .update({ google_place_id: google_place_id?.trim() || null, updated_at: new Date().toISOString() })
    .eq("id", actor.restaurant?.id ?? "");

  if (updateError) return jsonError(updateError.message, 500);
  return NextResponse.json({ ok: true });
}
