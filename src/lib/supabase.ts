import { createClient } from "@supabase/supabase-js";

// Fallback to a valid-format placeholder during build time so the Supabase SDK
// doesn't throw "supabaseUrl is required" when env vars aren't injected yet.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder_anon_key";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export function createServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return createClient<Database>(
    supabaseUrl,
    serviceRoleKey || supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export type AppRole = "superadmin" | "admin" | "coadmin";
export type RestaurantPlan = "free" | "starter" | "pro" | "enterprise";
export type RestaurantStatus = "active" | "suspended" | "deleted";
export type RestaurantCategory =
  | "qsr"
  | "casual_dining"
  | "fine_dining"
  | "cafe"
  | "cloud_kitchen"
  | "hotel";
export type LabelCategory =
  | "food"
  | "service"
  | "ambiance"
  | "value"
  | "speed"
  | "other";
export type LabelSentiment = "positive" | "constructive";

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          role: AppRole;
          restaurant_id: string | null;
          full_name: string | null;
          is_active: boolean;
          created_at: string;
          last_login_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          role: AppRole;
          restaurant_id?: string | null;
          full_name?: string | null;
          is_active?: boolean;
          created_at?: string;
          last_login_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [];
      };
      restaurants: {
        Row: {
          id: string;
          slug: string;
          name: string;
          category: RestaurantCategory | null;
          city: string | null;
          location_count: string | null;
          logo_url: string | null;
          brand_color: string;
          brand_color_2: string;
          qr_headline: string;
          qr_tagline: string | null;
          google_place_id: string | null;
          plan: RestaurantPlan;
          status: RestaurantStatus;
          trial_ends_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          monthly_fee: number;
          billing_status: "trial" | "active" | "due" | "overdue" | "cancelled";
          last_payment_date: string | null;
          next_billing_date: string | null;
          billing_notes: string | null;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          category?: RestaurantCategory | null;
          city?: string | null;
          location_count?: string | null;
          logo_url?: string | null;
          brand_color?: string;
          brand_color_2?: string;
          qr_headline?: string;
          qr_tagline?: string | null;
          google_place_id?: string | null;
          plan?: RestaurantPlan;
          status?: RestaurantStatus;
          trial_ends_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          monthly_fee?: number;
          billing_status?: "trial" | "active" | "due" | "overdue" | "cancelled";
          last_payment_date?: string | null;
          next_billing_date?: string | null;
          billing_notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["restaurants"]["Insert"]>;
        Relationships: [];
      };
      labels: {
        Row: {
          id: string;
          restaurant_id: string;
          text: string;
          emoji: string | null;
          category: LabelCategory;
          sentiment: LabelSentiment;
          is_visible: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          text: string;
          emoji?: string | null;
          category?: LabelCategory;
          sentiment?: LabelSentiment;
          is_visible?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["labels"]["Insert"]>;
        Relationships: [];
      };
      qr_codes: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          table_number: string | null;
          custom_message: string | null;
          fg_color: string | null;
          bg_color: string | null;
          has_logo: boolean;
          corner_style: string;
          frame_style: string;
          frame_text: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          table_number?: string | null;
          custom_message?: string | null;
          fg_color?: string | null;
          bg_color?: string | null;
          has_logo?: boolean;
          corner_style?: string;
          frame_style?: string;
          frame_text?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["qr_codes"]["Insert"]>;
        Relationships: [];
      };
      qr_scans: {
        Row: {
          id: string;
          qr_code_id: string | null;
          restaurant_id: string;
          scanned_at: string;
          session_id: string;
        };
        Insert: {
          id?: string;
          qr_code_id?: string | null;
          restaurant_id: string;
          scanned_at?: string;
          session_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["qr_scans"]["Insert"]>;
        Relationships: [];
      };
      review_events: {
        Row: {
          id: string;
          restaurant_id: string;
          qr_code_id: string | null;
          scan_id: string | null;
          rating: number;
          selected_labels: string[];
          ai_option_shown: number | null;
          was_edited: boolean;
          final_review: string;
          char_count: number | null;
          word_count: number | null;
          regenerated: boolean;
          time_to_submit: number | null;
          created_at: string;
          customer_email: string | null;
          customer_phone: string | null;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          qr_code_id?: string | null;
          scan_id?: string | null;
          rating: number;
          selected_labels?: string[];
          ai_option_shown?: number | null;
          was_edited?: boolean;
          final_review: string;
          char_count?: number | null;
          word_count?: number | null;
          regenerated?: boolean;
          time_to_submit?: number | null;
          created_at?: string;
          customer_email?: string | null;
          customer_phone?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["review_events"]["Insert"]>;
        Relationships: [];
      };
      admin_activity_log: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          target_type: string | null;
          target_id: string | null;
          metadata: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          target_type?: string | null;
          target_id?: string | null;
          metadata?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["admin_activity_log"]["Insert"]>;
        Relationships: [];
      };
      system_config: {
        Row: {
          id: string;
          key: string;
          value: Json;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: Json;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["system_config"]["Insert"]>;
        Relationships: [];
      };
      gemini_usage_log: {
        Row: {
          id: string;
          restaurant_id: string | null;
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
          model: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id?: string | null;
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
          model?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["gemini_usage_log"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      app_role: AppRole;
      restaurant_plan: RestaurantPlan;
      restaurant_status: RestaurantStatus;
      restaurant_category: RestaurantCategory;
      label_category: LabelCategory;
      label_sentiment: LabelSentiment;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type UserProfile = Database["public"]["Tables"]["users"]["Row"];
export type Restaurant = Database["public"]["Tables"]["restaurants"]["Row"];
export type Label = Database["public"]["Tables"]["labels"]["Row"];
export type QRCodeRow = Database["public"]["Tables"]["qr_codes"]["Row"];
export type QRScan = Database["public"]["Tables"]["qr_scans"]["Row"];
export type ReviewEvent = Database["public"]["Tables"]["review_events"]["Row"];
export type GeminiUsageLog = Database["public"]["Tables"]["gemini_usage_log"]["Row"];
