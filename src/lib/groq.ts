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
  const labels = selectedLabels.length ? selectedLabels.join(", ") : "the overall experience";
  if (rating >= 4) {
    return [
      `Had a lovely experience at ${restaurantName}. The ${labels} stood out, and everything felt well managed from start to finish. It was easy to enjoy the meal and the atmosphere, and I would be happy to visit again.`,
      `${restaurantName} was a great choice. I especially liked ${labels}, and the visit felt smooth, warm, and worth recommending. The team clearly puts care into the guest experience.`,
      `Really enjoyed my time at ${restaurantName}. The highlights for me were ${labels}. The food, service, and overall vibe made the visit memorable, and I would gladly recommend it to others.`,
      `A very satisfying visit to ${restaurantName}. ${labels} made the experience feel special, and the overall quality was consistent. I left happy and would definitely consider coming back soon.`,
    ];
  }
  return [
    `My visit to ${restaurantName} could have been better. The main areas that stood out were ${labels}. I hope the team can improve these parts because the place has potential.`,
    `${restaurantName} was not quite up to expectations this time. ${labels} affected the experience, and I would like to see more consistency on a future visit.`,
    `There were some positives, but ${labels} could use attention. I appreciate the effort from the team at ${restaurantName}, and I hope the experience improves next time.`,
    `The experience at ${restaurantName} felt mixed. ${labels} were the main things that could be improved. With a little more care, this could be much better.`,
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

  const prompt = `Write exactly 4 varied authentic Google restaurant reviews for "${restaurantName}" (${restaurantCategory || "restaurant"}).
Rating: ${rating}/5 stars. Customer highlights: ${selectedLabels.join(", ") || "overall experience"}.
Rules: 60-100 words each, natural human tone, reflects the star rating, mentions 1-2 highlights naturally. No reviewer names, no markdown.
Return valid JSON only: {"reviews": ["review1", "review2", "review3", "review4"]}`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 800,
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
