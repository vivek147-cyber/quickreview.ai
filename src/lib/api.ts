import { supabase } from "./supabase";
import type { Label, QRCodeRow, Restaurant, ReviewEvent, UserProfile } from "./supabase";

export type AdminContext = {
  profile: UserProfile;
  restaurant: Restaurant | null;
};

export type DashboardStats = {
  totalReviews: number;
  reviewsThisMonth: number;
  averageRating: number;
  reviewVelocity: number;
  scansToday: number;
  completionRate: number;
};

export type QRWithStats = QRCodeRow & {
  scan_count: number;
  review_count: number;
  completion_rate: number;
  average_rating: number;
};

export function getAccessToken() {
  return supabase.auth.getSession().then(({ data }) => data.session?.access_token || null);
}

async function apiFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (typeof window !== "undefined" && window.localStorage.getItem("quikreview_demo_superadmin") === "true") {
    headers.set("x-demo-role", "superadmin");
  }

  const response = await fetch(url, { ...init, headers });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || "Request failed");
  }

  return payload as T;
}

export async function getAdminContext() {
  return apiFetch<AdminContext>("/api/admin/context");
}

export async function getAdminDashboard() {
  return apiFetch<{
    restaurant: Restaurant;
    stats: DashboardStats;
    recentReviews: ReviewEvent[];
    labelCounts: { label: string; count: number }[];
  }>("/api/admin/dashboard");
}

export async function listAdminQRCodes() {
  return apiFetch<{ qrs: QRWithStats[] }>("/api/admin/qr-codes");
}

export async function createAdminQRCode(input: {
  name: string;
  table_number?: string | null;
  custom_message?: string | null;
  fg_color?: string | null;
  bg_color?: string | null;
}) {
  return apiFetch<{ qr: QRCodeRow }>("/api/admin/qr-codes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function listAdminLabels() {
  return apiFetch<{ labels: Label[] }>("/api/admin/labels");
}

export async function createAdminLabel(input: {
  text: string;
  emoji?: string | null;
  category?: string;
  sentiment?: string;
}) {
  return apiFetch<{ label: Label }>("/api/admin/labels", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateAdminLabel(id: string, input: Partial<Label>) {
  return apiFetch<{ label: Label }>(`/api/admin/labels/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteAdminLabel(id: string) {
  return apiFetch<{ ok: true }>(`/api/admin/labels/${id}`, {
    method: "DELETE",
  });
}

export async function getSuperRestaurants() {
  return apiFetch<{
    restaurants: Array<
      Restaurant & {
        owner_name: string | null;
        owner_email: string | null;
        total_reviews: number;
        average_rating: number;
        last_active: string | null;
      }
    >;
  }>("/api/superadmin/restaurants");
}

export async function onboardRestaurant(input: unknown) {
  return apiFetch<{ restaurant: Restaurant; owner: UserProfile | null; temporaryPassword?: string }>(
    "/api/superadmin/restaurants",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
}

export async function updateSuperRestaurant(id: string, input: unknown) {
  return apiFetch<{ restaurant: Restaurant }>(`/api/superadmin/restaurants/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function getSystemConfig(key: string) {
  return apiFetch<{ value: unknown | null }>(`/api/superadmin/config?key=${encodeURIComponent(key)}`).then(
    (payload) => payload.value
  );
}

export async function setSystemConfig(key: string, value: unknown) {
  return apiFetch<{ value: unknown }>(`/api/superadmin/config`, {
    method: "PUT",
    body: JSON.stringify({ key, value }),
  });
}

export async function getPublicReviewPage(slug: string, qrId?: string | null) {
  const params = new URLSearchParams({ slug });
  if (qrId) params.set("qr", qrId);
  return fetch(`/api/public/review-page?${params.toString()}`).then(async (response) => {
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error || "Unable to load review page");
    return payload as {
      restaurant: Restaurant;
      labels: Label[];
      qr: QRCodeRow | null;
      maintenanceMessage?: string;
    };
  });
}

export async function logQRScan(input: {
  restaurantId: string;
  qrCodeId?: string | null;
  sessionId: string;
}) {
  const response = await fetch("/api/public/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error || "Unable to log scan");
  return payload as { scanId: string | null };
}

export async function submitPublicReview(input: unknown) {
  const response = await fetch("/api/public/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error || "Unable to submit review");
  return payload as { reviewId: string };
}

export async function generateReviews(input: {
  restaurantName: string;
  restaurantCategory?: string | null;
  rating: number;
  selectedLabels: string[];
  restaurantId?: string;
}) {
  const response = await fetch("/api/generate-reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error || "Unable to generate reviews");
  return payload as { reviews: string[] };
}

export async function getAIUsage(params: { from: string; to: string }) {
  return apiFetch<{
    summary: {
      total_calls: number;
      total_tokens: number;
      prompt_tokens: number;
      completion_tokens: number;
      estimated_cost_usd: number;
    };
    by_day: { date: string; calls: number; total_tokens: number; prompt_tokens: number; completion_tokens: number; estimated_cost_usd: number }[];
    by_restaurant: {
      restaurant_id: string;
      name: string;
      calls: number;
      total_tokens: number;
      prompt_tokens: number;
      completion_tokens: number;
      estimated_cost_usd: number;
    }[];
  }>(`/api/superadmin/usage?from=${params.from}&to=${params.to}`);
}

/** @deprecated use getAIUsage */
export const getGeminiUsage = getAIUsage;

export async function getBillingOverview() {
  return apiFetch<{
    restaurants: Array<{
      id: string; name: string; slug: string; plan: string; status: string;
      monthly_fee: number; billing_status: string;
      last_payment_date: string | null; next_billing_date: string | null; billing_notes: string | null;
      created_at: string;
    }>;
    summary: {
      total: number; active: number; due: number; overdue: number; trial: number;
      monthly_revenue_inr: number;
    };
  }>("/api/superadmin/billing");
}

export async function updateBilling(id: string, data: {
  billing_status?: string;
  monthly_fee?: number;
  last_payment_date?: string | null;
  next_billing_date?: string | null;
  billing_notes?: string | null;
}) {
  return apiFetch<{ ok: boolean }>("/api/superadmin/billing", {
    method: "PATCH",
    body: JSON.stringify({ id, ...data }),
  });
}

export async function listAdminReviews(params: {
  page?: number;
  rating?: number | null;
  from?: string;
  to?: string;
}) {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.rating) query.set("rating", String(params.rating));
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  return apiFetch<{
    reviews: import("./supabase").ReviewEvent[];
    total: number;
    page: number;
    pages: number;
  }>(`/api/admin/reviews?${query.toString()}`);
}
