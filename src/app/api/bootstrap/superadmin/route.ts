import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET() {
  return NextResponse.json(
    { error: "Use POST with x-bootstrap-secret header to create the first super admin." },
    { status: 405 }
  );
}

export async function POST(req: Request) {
  const bootstrapSecret = process.env.BOOTSTRAP_SECRET;
  const providedSecret = req.headers.get("x-bootstrap-secret");

  if (!bootstrapSecret || providedSecret !== bootstrapSecret) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const fullName = String(body?.fullName || "QuikReview Super Admin").trim();

  if (!email || password.length < 8) {
    return NextResponse.json({ error: "Email and an 8+ character password are required" }, { status: 400 });
  }

  const service = createServiceClient();

  // Try to create the Auth user — if already exists, look up their ID instead
  let userId: string;

  const { data: createdUser, error: createError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "superadmin" },
  });

  if (createError) {
    if (!createError.message.toLowerCase().includes("already")) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }
    // User exists in Auth — get their ID
    const { data: userList, error: listError } = await service.auth.admin.listUsers();
    if (listError) return NextResponse.json({ error: listError.message }, { status: 500 });
    const existing = userList.users.find((u) => u.email === email);
    if (!existing) return NextResponse.json({ error: "User exists but could not be located" }, { status: 500 });
    userId = existing.id;
  } else {
    if (!createdUser.user) return NextResponse.json({ error: "User creation returned no data" }, { status: 500 });
    userId = createdUser.user.id;
  }

  // Upsert the profile row (safe to run multiple times)
  const { data: profile, error: profileError } = await service
    .from("users")
    .upsert(
      {
        id: userId,
        email,
        role: "superadmin",
        full_name: fullName,
        restaurant_id: null,
        is_active: true,
      },
      { onConflict: "id" }
    )
    .select("*")
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: profileError?.message || "Unable to create profile" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, profile });
}
