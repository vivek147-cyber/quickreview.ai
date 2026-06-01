import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { jsonError, requireActor } from "@/lib/server-auth";

export async function GET(req: Request) {
  const { actor, error } = await requireActor(req, ["superadmin"]);
  if (error || !actor) return error;

  const key = new URL(req.url).searchParams.get("key");
  if (!key) return jsonError("Missing config key");

  const { data, error: configError } = await createServiceClient()
    .from("system_config")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (configError) return jsonError(configError.message, 500);
  return NextResponse.json({ value: data?.value || null });
}

export async function PUT(req: Request) {
  const { actor, error } = await requireActor(req, ["superadmin"]);
  if (error || !actor) return error;

  const body = await req.json().catch(() => null);
  if (!body?.key) return jsonError("Missing config key");

  const { data, error: configError } = await createServiceClient()
    .from("system_config")
    .upsert({ key: body.key, value: body.value || {}, updated_at: new Date().toISOString() }, { onConflict: "key" })
    .select("value")
    .single();

  if (configError || !data) return jsonError(configError?.message || "Unable to save config", 500);
  return NextResponse.json({ value: data.value });
}
