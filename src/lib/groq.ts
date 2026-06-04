import Groq from "groq-sdk";

export type GenerateReviewArgs = {
  restaurantName: string;
  restaurantCategory?: string | null;
  rating: number;
  selectedLabels: string[];
};

export type GenerateUsage = {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
};

export type GenerateResult = {
  reviews: string[];
  usage: GenerateUsage | null;
};

function fallbackReviews(restaurantName: string, rating: number, selectedLabels: string[]): string[] {
  const l = selectedLabels.length ? selectedLabels[0] : "the experience";
  const l2 = selectedLabels.length > 1 ? selectedLabels[1] : null;
  const extra = l2 ? ` and ${l2}` : "";
  if (rating >= 4) {
    return [
      `Really good experience at ${restaurantName}. The ${l}${extra} was great. Staff were friendly and everything went smoothly. Would definitely come back.`,
      `Enjoyed my visit to ${restaurantName}. The ${l} stood out the most${extra ? ` along with ${l2}` : ""}. Simple, good quality, no complaints. Happy to recommend it.`,
      `${restaurantName} did not disappoint. ${l}${extra} were both worth it. The place has a nice feel and the service was quick. Will visit again soon.`,
      `Had a nice time at ${restaurantName}. The ${l} was exactly what I was looking for${extra ? ` and ${l2} was a bonus` : ""}. Good value overall and would go back.`,
    ];
  }
  return [
    `My visit to ${restaurantName} was okay but could be better. The ${l} did not meet expectations. Hoping things improve on my next visit.`,
    `${restaurantName} has potential but the ${l} needs work. Service was average this time. Maybe I caught them on a bad day.`,
    `Not the best experience at ${restaurantName}. The ${l} was a bit disappointing. Would give it another chance but expect better next time.`,
    `Mixed feelings about ${restaurantName}. The ${l} could definitely be improved. Not bad overall but there is room to do better.`,
  ];
}

export async function generateReviewOptions(
  { restaurantName, restaurantCategory, rating, selectedLabels }: GenerateReviewArgs,
  apiKey?: string
): Promise<GenerateResult> {
  const key = apiKey || process.env.GROQ_API_KEY || "";

  if (!key) {
    return { reviews: fallbackReviews(restaurantName, rating, selectedLabels), usage: null };
  }

  const groq = new Groq({ apiKey: key });

  const tone = rating >= 4 ? "positive and satisfied" : rating === 3 ? "okay but mixed" : "disappointed but respectful";

  const prompt = `Write exactly 4 different Google reviews for "${restaurantName}" (${restaurantCategory || "business"}).
Star rating: ${rating}/5. Customer highlights: ${selectedLabels.join(", ") || "overall experience"}.

Strict rules:
- Exactly 3 to 4 sentences per review — no more, no less
- Each review must be 50 to 70 words — not shorter, not longer
- Simple conversational English — written like a real customer on their phone, not formal
- Tone matches the rating: ${tone}
- Naturally mention the highlights without listing them
- All 4 reviews must feel different — vary how each one starts and flows
- No names, no emojis, no markdown, no bullet points

Return JSON only: {"reviews": ["review1", "review2", "review3", "review4"]}`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.85,
      max_tokens: 600,
    });

    const text = completion.choices[0]?.message?.content || "";
    const raw = completion.usage;

    const usage: GenerateUsage | null = raw
      ? {
          promptTokenCount: raw.prompt_tokens,
          candidatesTokenCount: raw.completion_tokens,
          totalTokenCount: raw.total_tokens,
        }
      : null;

    const parsed = JSON.parse(text) as { reviews?: unknown[] };
    const reviews = parsed.reviews;

    if (
      Array.isArray(reviews) &&
      reviews.length >= 4 &&
      reviews.every((r) => typeof r === "string" && r.trim().length > 0)
    ) {
      return {
        reviews: (reviews as string[]).slice(0, 4).map((r) => r.trim().slice(0, 1500)),
        usage,
      };
    }

    return { reviews: fallbackReviews(restaurantName, rating, selectedLabels), usage: null };
  } catch (error) {
    console.error("Groq generation error:", error);
    return { reviews: fallbackReviews(restaurantName, rating, selectedLabels), usage: null };
  }
}
