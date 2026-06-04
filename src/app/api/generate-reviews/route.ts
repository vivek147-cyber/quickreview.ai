import { NextResponse } from "next/server";
import { generateReviewOptions } from "@/lib/groq";
import { createServiceClient } from "@/lib/supabase";
import { DEMO_RESTAURANT_ID } from "@/lib/constants";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { restaurantName, restaurantCategory, rating, selectedLabels, restaurantId } = body;

    if (!restaurantName || !rating || !Array.isArray(selectedLabels)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const service = createServiceClient();

    // Fetch Groq API key set by superadmin in /superadmin/config (falls back to env var)
    const { data: configData } = await service
      .from("system_config")
      .select("value")
      .eq("key", "groq_settings")
      .maybeSingle();

    // Demo restaurant always uses fallback reviews — no AI call
    const isDemo = restaurantId === DEMO_RESTAURANT_ID;

    const apiKey = isDemo
      ? ""
      : (configData?.value as { api_key?: string } | null)?.api_key ||
        process.env.GROQ_API_KEY ||
        "";

    const { reviews, usage } = await generateReviewOptions(
      {
        restaurantName,
        restaurantCategory: restaurantCategory || "Restaurant",
        rating,
        selectedLabels,
      },
      apiKey
    );

    // Log token usage asynchronously — don't block the response
    if (usage && restaurantId) {
      service
        .from("gemini_usage_log")
        .insert({
          restaurant_id: restaurantId,
          prompt_tokens: usage.promptTokenCount,
          completion_tokens: usage.candidatesTokenCount,
          total_tokens: usage.totalTokenCount,
          model: "llama-3.1-8b-instant",
        })
        .then(({ error }) => {
          if (error) console.error("Usage log insert error:", error.message);
        });
    }

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error("Error in generate-reviews API:", error);
    return NextResponse.json({ error: "Failed to generate reviews" }, { status: 500 });
  }
}
