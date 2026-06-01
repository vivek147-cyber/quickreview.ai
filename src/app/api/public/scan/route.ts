import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { DEMO_RESTAURANT_ID } from "@/lib/constants";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const restaurantId = String(body?.restaurantId || "");
  const qrCodeId = body?.qrCodeId ? String(body.qrCodeId) : null;
  const sessionId = String(body?.sessionId || "");

  if (!restaurantId || !sessionId) {
    return NextResponse.json({ error: "Missing scan details" }, { status: 400 });
  }

  // Demo restaurant — skip DB entirely
  if (restaurantId === DEMO_RESTAURANT_ID) {
    return NextResponse.json({ scanId: "demo-scan-id" });
  }

  const service = createServiceClient();
  const { data: restaurant } = await service
    .from("restaurants")
    .select("id,status")
    .eq("id", restaurantId)
    .single();

  if (!restaurant || restaurant.status !== "active") {
    return NextResponse.json({ error: "Review page unavailable" }, { status: 403 });
  }

  const { data, error } = await service
    .from("qr_scans")
    .insert({
      restaurant_id: restaurantId,
      qr_code_id: qrCodeId,
      session_id: sessionId,
    })
    .select("id")
    .single();

  if (error?.message?.includes("qr_scans")) {
    if (qrCodeId) {
      const { data: qr } = await service
        .from("qr_codes")
        .select("scan_count" as never)
        .eq("id", qrCodeId)
        .maybeSingle();

      const legacyQr = qr as { scan_count?: number } | null;
      if (legacyQr && typeof legacyQr.scan_count === "number") {
        await service
          .from("qr_codes")
          .update({ scan_count: legacyQr.scan_count + 1 } as never)
          .eq("id", qrCodeId);
      }
    }

    return NextResponse.json({ scanId: null });
  }

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Unable to log scan" }, { status: 500 });
  }

  return NextResponse.json({ scanId: data.id });
}
