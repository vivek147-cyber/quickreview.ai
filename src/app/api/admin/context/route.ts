import { NextResponse } from "next/server";
import { requireActor } from "@/lib/server-auth";
import { createServiceClient } from "@/lib/supabase";

export async function GET(req: Request) {
  const { actor, error } = await requireActor(req, ["admin", "coadmin", "superadmin"]);
  if (error || !actor) return error;

  // Update last_login_at in the background — don't block the response
  createServiceClient()
    .from("users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", actor.userId)
    .then(({ error: updateError }) => {
      if (updateError) console.error("last_login_at update error:", updateError.message);
    });

  return NextResponse.json({
    profile: actor.profile,
    restaurant: actor.restaurant,
  });
}
