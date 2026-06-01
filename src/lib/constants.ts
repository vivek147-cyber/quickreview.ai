import type { Label, LabelCategory, LabelSentiment, QRCodeRow, Restaurant } from "./supabase";

// ─── Demo restaurant (slug: "example") ───────────────────────────────────────
// Served entirely from code — no database row needed.
// Used by the landing page "Try Customer Flow" button.

export const DEMO_RESTAURANT_ID = "00000000-0000-0000-0000-000000000000";
export const DEMO_RESTAURANT_SLUG = "example";

export const DEMO_RESTAURANT: Restaurant = {
  id: DEMO_RESTAURANT_ID,
  slug: DEMO_RESTAURANT_SLUG,
  name: "Spice Garden",
  category: "casual_dining",
  city: "Bangalore",
  location_count: "1",
  logo_url: null,
  brand_color: "#E84B3A",
  brand_color_2: "#FFFFFF",
  qr_headline: "How was your Spice Garden experience?",
  qr_tagline: "Your feedback helps us serve you better.",
  google_place_id: null,
  plan: "pro",
  status: "active",
  trial_ends_at: null,
  created_by: null,
  created_at: "2025-01-01T00:00:00.000Z",
  updated_at: "2025-01-01T00:00:00.000Z",
  monthly_fee: 0,
  billing_status: "trial",
  last_payment_date: null,
  next_billing_date: null,
  billing_notes: null,
};

export const DEMO_LABELS: Label[] = [
  { id: "d1", restaurant_id: DEMO_RESTAURANT_ID, text: "Biriyani", emoji: "🍛", category: "food", sentiment: "positive", is_visible: true, sort_order: 0, created_at: "", updated_at: "" },
  { id: "d2", restaurant_id: DEMO_RESTAURANT_ID, text: "Great Ambiance", emoji: "✨", category: "ambiance", sentiment: "positive", is_visible: true, sort_order: 1, created_at: "", updated_at: "" },
  { id: "d3", restaurant_id: DEMO_RESTAURANT_ID, text: "Friendly Staff", emoji: "🤵", category: "service", sentiment: "positive", is_visible: true, sort_order: 2, created_at: "", updated_at: "" },
  { id: "d4", restaurant_id: DEMO_RESTAURANT_ID, text: "Good Portions", emoji: "🍽️", category: "food", sentiment: "positive", is_visible: true, sort_order: 3, created_at: "", updated_at: "" },
  { id: "d5", restaurant_id: DEMO_RESTAURANT_ID, text: "Fast Service", emoji: "⚡", category: "speed", sentiment: "positive", is_visible: true, sort_order: 4, created_at: "", updated_at: "" },
  { id: "d6", restaurant_id: DEMO_RESTAURANT_ID, text: "Great Value", emoji: "💰", category: "value", sentiment: "positive", is_visible: true, sort_order: 5, created_at: "", updated_at: "" },
  { id: "d7", restaurant_id: DEMO_RESTAURANT_ID, text: "Slow Service", emoji: "⏳", category: "speed", sentiment: "constructive", is_visible: true, sort_order: 0, created_at: "", updated_at: "" },
  { id: "d8", restaurant_id: DEMO_RESTAURANT_ID, text: "Cold Food", emoji: "🥶", category: "food", sentiment: "constructive", is_visible: true, sort_order: 1, created_at: "", updated_at: "" },
  { id: "d9", restaurant_id: DEMO_RESTAURANT_ID, text: "Long Wait", emoji: "🕐", category: "speed", sentiment: "constructive", is_visible: true, sort_order: 2, created_at: "", updated_at: "" },
  { id: "d10", restaurant_id: DEMO_RESTAURANT_ID, text: "Noisy", emoji: "🔊", category: "ambiance", sentiment: "constructive", is_visible: true, sort_order: 3, created_at: "", updated_at: "" },
];

export const DEMO_QR: QRCodeRow = {
  id: "00000000-0000-0000-0000-000000000001",
  restaurant_id: DEMO_RESTAURANT_ID,
  name: "Demo Table",
  table_number: "1",
  custom_message: null,
  fg_color: "#E84B3A",
  bg_color: "#FFFFFF",
  has_logo: false,
  corner_style: "rounded",
  frame_style: "none",
  frame_text: "Scan to Review",
  is_active: true,
  created_at: "2025-01-01T00:00:00.000Z",
  updated_at: "2025-01-01T00:00:00.000Z",
};

export const DEFAULT_LABELS: { text: string; emoji: string; category: LabelCategory; sentiment: LabelSentiment }[] = [
  { text: "Excellent Food", emoji: "😋", category: "food", sentiment: "positive" },
  { text: "Great Service", emoji: "🤵", category: "service", sentiment: "positive" },
  { text: "Nice Ambiance", emoji: "✨", category: "ambiance", sentiment: "positive" },
  { text: "Good Value", emoji: "💰", category: "value", sentiment: "positive" },
  { text: "Fast Delivery", emoji: "🚀", category: "speed", sentiment: "positive" },
  { text: "Slow Service", emoji: "⏳", category: "speed", sentiment: "constructive" },
  { text: "Cold Food", emoji: "🥶", category: "food", sentiment: "constructive" },
  { text: "Pricey", emoji: "💸", category: "value", sentiment: "constructive" },
];
