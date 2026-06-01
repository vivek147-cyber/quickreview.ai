import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

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

// JSON mode schema — forces the model to return a plain string array (no markdown wrapping)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const reviewsSchema: any = {
  type: SchemaType.ARRAY,
  items: { type: SchemaType.STRING },
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
  const key = apiKey || process.env.GEMINI_API_KEY || "";

  if (!key) {
    return { reviews: fallbackReviews(restaurantName, rating, selectedLabels), usage: null };
  }

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: reviewsSchema,
    },
  });

  // Compact prompt — JSON mode handles structure, saving ~30% tokens vs prose instructions
  const prompt = `Write 4 varied authentic Google restaurant reviews for "${restaurantName}" (${restaurantCategory || "restaurant"}).
Rating: ${rating}/5 stars. Customer highlights: ${selectedLabels.join(", ")}.
Each review: 60-100 words, natural and human-sounding, reflects the rating, mentions 1-2 highlights naturally. No names, no markdown.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const usageMetadata = result.response.usageMetadata;

    const usage: GenerateUsage | null = usageMetadata
      ? {
          promptTokenCount: usageMetadata.promptTokenCount ?? 0,
          candidatesTokenCount: usageMetadata.candidatesTokenCount ?? 0,
          totalTokenCount: usageMetadata.totalTokenCount ?? 0,
        }
      : null;

    const parsed: unknown = JSON.parse(text);

    if (
      Array.isArray(parsed) &&
      parsed.length >= 4 &&
      parsed.every((item) => typeof item === "string" && item.trim().length > 0)
    ) {
      return {
        reviews: parsed.slice(0, 4).map((item: string) => item.trim().slice(0, 1500)),
        usage,
      };
    }

    return { reviews: fallbackReviews(restaurantName, rating, selectedLabels), usage };
  } catch (error) {
    console.error("Gemini generation error:", error);
    return { reviews: fallbackReviews(restaurantName, rating, selectedLabels), usage: null };
  }
}
