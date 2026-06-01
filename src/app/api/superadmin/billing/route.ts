import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { jsonError, requireActor } from "@/lib/server-auth";

export async function GET(req: Request) {
  const { actor, error } = await requireActor(req, ["superadmin"]);
  if (error || !actor) return error;

  const service = createServiceClient();

  const { data: restaurants, error: err } = await service
    .from("restaurants")
    .select("id, name, slug, plan, status, monthly_fee, billing_status, last_payment_date, next_billing_date, billing_notes, created_at")
    .neq("status", "deleted")
    .order("next_billing_date", { ascending: true, nullsFirst: false });

  if (err) return jsonError(err.message, 500);

  const summary = {
    total: restaurants?.length ?? 0,
    active: restaurants?.filter(r => r.billing_status === "active").length ?? 0,
    due: restaurants?.filter(r => r.billing_status === "due").length ?? 0,
    overdue: restaurants?.filter(r => r.billing_status === "overdue").length ?? 0,
    trial: restaurants?.filter(r => r.billing_status === "trial").length ?? 0,
    monthly_revenue_inr: restaurants
      ?.filter(r => r.billing_status === "active")
      .reduce((sum, r) => sum + (r.monthly_fee ?? 0), 0) ?? 0,
  };

  return NextResponse.json({ restaurants: restaurants ?? [], summary });
}

export async function PATCH(req: Request) {
  const { actor, error } = await requireActor(req, ["superadmin"]);
  if (error || !actor) return error;

  const body = await req.json().catch(() => null);
  const { id, billing_status, monthly_fee, last_payment_date, next_billing_date, billing_notes } = body ?? {};

  if (!id) return jsonError("Restaurant ID required", 400);

  const service = createServiceClient();

  type BillingUpdate = {
    billing_status?: string;
    monthly_fee?: number;
    last_payment_date?: string | null;
    next_billing_date?: string | null;
    billing_notes?: string | null;
  };
  const update: BillingUpdate = {};
  if (billing_status !== undefined) update.billing_status = billing_status;
  if (monthly_fee !== undefined) update.monthly_fee = Number(monthly_fee);
  if (last_payment_date !== undefined) update.last_payment_date = last_payment_date || null;
  if (next_billing_date !== undefined) update.next_billing_date = next_billing_date || null;
  if (billing_notes !== undefined) update.billing_notes = billing_notes || null;

  const { data, error: patchErr } = await service
    .from("restaurants")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(update as any)
    .eq("id", id)
    .select("id, billing_status, monthly_fee, last_payment_date, next_billing_date, billing_notes")
    .single();

  if (patchErr) return jsonError(patchErr.message, 500);
  return NextResponse.json({ ok: true, restaurant: data });
}
