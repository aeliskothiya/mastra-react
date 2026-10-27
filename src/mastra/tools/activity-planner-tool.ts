import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// ============================================================
// Activity Planner Tool — dedicated tool for the Activity agent.
// Pure logic (no API key). Turns weather + preferences into
// structured indoor/outdoor recommendations.
// ============================================================

const activityPlannerOutputSchema = z.object({
  summary: z.string(),
  outdoor: z.array(z.string()),
  indoor: z.array(z.string()),
  tips: z.array(z.string()),
});

function normalizeInput(input: unknown): {
  conditions: string;
  temperature: number;
  preferences: string;
} {
  const fallback = { conditions: "", temperature: 22, preferences: "" };
  if (!input || typeof input !== "object") return fallback;
  const obj = input as Record<string, unknown>;
  const ctx = (obj.context as Record<string, unknown> | undefined) ?? {};
  const pick = (k: string): unknown => obj[k] ?? ctx[k];
  return {
    conditions: typeof pick("conditions") === "string" ? (pick("conditions") as string) : "",
    temperature: typeof pick("temperature") === "number" ? (pick("temperature") as number) : 22,
    preferences: typeof pick("preferences") === "string" ? (pick("preferences") as string) : "",
  };
}

function planActivities(conditions: string, temperature: number, preferences: string) {
  const c = conditions.toLowerCase();
  const isWet = /rain|drizzle|shower|thunderstorm|storm|snow/.test(c);
  const isClear = /clear|sunny|mainly clear/.test(c);
  const isCloudy = /cloud|overcast|fog/.test(c);
  const hot = temperature >= 30;
  const cold = temperature <= 10;
  const mild = !hot && !cold;

  const outdoor: string[] = [];
  const indoor: string[] = [];
  const tips: string[] = [];

  if (isWet) {
    outdoor.push("Short nature walk with rain gear during lighter spells");
    outdoor.push("Covered markets and street-food streets between showers");
    indoor.push("Cafes, bookshops and co-working spaces for a slow afternoon");
    indoor.push("Museums, galleries, cinema or indoor sports");
    tips.push("Carry an umbrella and waterproof footwear.");
  } else if (isClear && !hot) {
    outdoor.push("Morning park walk, cycling or open-air sightseeing");
    outdoor.push("Rooftop cafes and sunset viewpoints in the evening");
    indoor.push("Midday gallery or mall visit to avoid peak sun");
    tips.push("Mornings and evenings are best for outdoor plans.");
  } else if (hot) {
    outdoor.push("Early-morning walk or riverside stroll before 9 AM");
    outdoor.push("Evening food streets and night markets after sunset");
    indoor.push("Air-conditioned cafes, libraries and museums midday");
    indoor.push("Cinema, gaming zones or indoor pools in the afternoon");
    tips.push("Stay hydrated; avoid 12–4 PM outdoor exertion.");
  } else if (cold) {
    outdoor.push("Midday walk in the sun when it is warmest");
    outdoor.push("Bonfire / hot-food street evenings with layers");
    indoor.push("Warm cafes, bakeries and bookstores");
    tips.push("Layer up; prefer midday for outdoor activities.");
  } else if (isCloudy || mild) {
    outdoor.push("City sightseeing, gardens and lakefront walks");
    outdoor.push("Cafe-hopping across popular neighbourhoods");
    indoor.push("Museums and shopping streets as backup");
  }

  if (preferences.trim()) {
    tips.push(`Tailored to your preference: ${preferences.trim().slice(0, 200)}`);
  }

  const summary =
    `Weather looks ${conditions || "moderate"} at ~${temperature}°C — ` +
    (isWet
      ? "lean towards indoor plans with short outdoor windows."
      : hot
        ? "plan outdoors early/late and stay indoors midday."
        : "a good mix of outdoor and indoor plans works well.");

  return { summary, outdoor, indoor, tips };
}

export const activityPlannerTool = createTool({
  id: "plan-activities",
  description:
    "Plan indoor and outdoor activities from weather conditions. Input: conditions text, temperature in Celsius, optional user preferences.",
  inputSchema: z.object({
    conditions: z.string().describe("Weather conditions, e.g. 'Overcast', 'Clear sky'"),
    temperature: z.number().describe("Temperature in Celsius"),
    preferences: z.string().optional().describe("Optional user preferences"),
  }),
  outputSchema: activityPlannerOutputSchema,
  execute: async (inputData: unknown) => {
    const { conditions, temperature, preferences } = normalizeInput(inputData);
    return planActivities(conditions, temperature, preferences);
  },
});
