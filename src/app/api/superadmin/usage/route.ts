import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { jsonError, requireActor } from "@/lib/server-auth";

// Groq llama3-8b-8192 pricing (USD per 1M tokens, paid tier)
// Free tier = $0, but we track for when limits are hit
const PRICE_INPUT_PER_M = 0.05;
const PRICE_OUTPUT_PER_M = 0.08;

function estimateCost(promptTokens: number, completionTokens: number): number {
  return (promptTokens * PRICE_INPUT_PER_M + completionTokens * PRICE_OUTPUT_PER_M) / 1_000_000;
}

export async function GET(req: Request) {
  const { actor, error } = await requireActor(req, ["superadmin"]);
  if (error || !actor) return error;

  const url = new URL(req.url);
  const from = url.searchParams.get("from") ||
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const to = url.searchParams.get("to") || new Date().toISOString().split("T")[0];

  const service = createServiceClient();

  const { data: logs, error: logsError } = await service
    .from("gemini_usage_log")
    .select("restaurant_id, prompt_tokens, completion_tokens, total_tokens, created_at")
    .gte("created_at", `${from}T00:00:00.000Z`)
    .lte("created_at", `${to}T23:59:59.999Z`)
    .order("created_at", { ascending: true });

  if (logsError) return jsonError(logsError.message, 500);

  const restaurantIds = [...new Set((logs || []).map(l => l.restaurant_id).filter(Boolean))] as string[];
  const { data: restaurants } = restaurantIds.length
    ? await service.from("restaurants").select("id, name").in("id", restaurantIds)
    : { data: [] };

  const restaurantNames = new Map((restaurants || []).map(r => [r.id, r.name]));

  const summary = { total_calls: logs?.length ?? 0, total_tokens: 0, prompt_tokens: 0, completion_tokens: 0, estimated_cost_usd: 0 };
  const byDayMap = new Map<string, { calls: number; total_tokens: number; prompt_tokens: number; completion_tokens: number }>();
  const byRestaurantMap = new Map<string, { name: string; calls: number; total_tokens: number; prompt_tokens: number; completion_tokens: number }>();

  for (const log of logs || []) {
    summary.total_tokens += log.total_tokens;
    summary.prompt_tokens += log.prompt_tokens;
    summary.completion_tokens += log.completion_tokens;

    const day = log.created_at.split("T")[0];
    const prevDay = byDayMap.get(day) ?? { calls: 0, total_tokens: 0, prompt_tokens: 0, completion_tokens: 0 };
    byDayMap.set(day, { calls: prevDay.calls + 1, total_tokens: prevDay.total_tokens + log.total_tokens, prompt_tokens: prevDay.prompt_tokens + log.prompt_tokens, completion_tokens: prevDay.completion_tokens + log.completion_tokens });

    if (log.restaurant_id) {
      const prevR = byRestaurantMap.get(log.restaurant_id) ?? { name: restaurantNames.get(log.restaurant_id) ?? "Unknown", calls: 0, total_tokens: 0, prompt_tokens: 0, completion_tokens: 0 };
      byRestaurantMap.set(log.restaurant_id, { ...prevR, calls: prevR.calls + 1, total_tokens: prevR.total_tokens + log.total_tokens, prompt_tokens: prevR.prompt_tokens + log.prompt_tokens, completion_tokens: prevR.completion_tokens + log.completion_tokens });
    }
  }

  summary.estimated_cost_usd = estimateCost(summary.prompt_tokens, summary.completion_tokens);

  const by_day = Array.from(byDayMap.entries())
    .map(([date, data]) => ({ date, ...data, estimated_cost_usd: estimateCost(data.prompt_tokens, data.completion_tokens) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const by_restaurant = Array.from(byRestaurantMap.entries())
    .map(([restaurant_id, data]) => ({ restaurant_id, ...data, estimated_cost_usd: estimateCost(data.prompt_tokens, data.completion_tokens) }))
    .sort((a, b) => b.total_tokens - a.total_tokens);

  return NextResponse.json({ summary, by_day, by_restaurant });
}
