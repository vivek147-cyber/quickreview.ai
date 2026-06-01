import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import type { AppRole, Restaurant, UserProfile } from "@/lib/supabase";

export type Actor = {
  userId: string;
  profile: UserProfile;
  restaurant: Restaurant | null;
};

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function getBearerToken(req: Request) {
  const header = req.headers.get("authorization") || "";
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" ? token : null;
}

export async function requireActor(req: Request, roles?: AppRole[]) {
  if (
    process.env.NODE_ENV !== "production" &&
    req.headers.get("x-demo-role") === "superadmin"
  ) {
    const profile: UserProfile = {
      id: "00000000-0000-0000-0000-000000000001",
      email: "superadmin@quikreview.ai",
      role: "superadmin",
      restaurant_id: null,
      full_name: "Demo Super Admin",
      is_active: true,
      created_at: new Date().toISOString(),
      last_login_at: null,
    };

    if (roles && !roles.includes("superadmin")) {
      return { error: jsonError("Forbidden", 403), actor: null };
    }

    return {
      error: null,
      actor: {
        userId: profile.id,
        profile,
        restaurant: null,
      } satisfies Actor,
    };
  }

  const token = getBearerToken(req);
  if (!token) {
    return { error: jsonError("Unauthorized", 401), actor: null };
  }

  const service = createServiceClient();
  const { data: authData, error: authError } = await service.auth.getUser(token);
  const user = authData.user;

  if (authError || !user) {
    return { error: jsonError("Unauthorized", 401), actor: null };
  }

  const { data: profile, error: profileError } = await service
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || !profile.is_active) {
    return { error: jsonError("Profile not found or inactive", 403), actor: null };
  }

  if (roles && !roles.includes(profile.role)) {
    return { error: jsonError("Forbidden", 403), actor: null };
  }

  let restaurant: Restaurant | null = null;
  if (profile.restaurant_id) {
    const { data } = await service
      .from("restaurants")
      .select("*")
      .eq("id", profile.restaurant_id)
      .single();
    restaurant = data || null;
  }

  return {
    error: null,
    actor: {
      userId: user.id,
      profile,
      restaurant,
    } satisfies Actor,
  };
}

export function assertRestaurant(actor: Actor) {
  if (!actor.restaurant || !actor.profile.restaurant_id) {
    return { error: jsonError("Restaurant account is not assigned", 403), restaurant: null };
  }

  return { error: null, restaurant: actor.restaurant };
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function wordCount(input: string) {
  return input.trim().split(/\s+/).filter(Boolean).length;
}
