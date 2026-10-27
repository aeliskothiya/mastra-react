/**
 * OpenRouter provider — uses the OpenAI-compatible API from @ai-sdk/openai.
 *
 * OpenRouter exposes a standard OpenAI Chat Completions endpoint at:
 *   https://openrouter.ai/api/v1
 *
 * Set the following env vars (already defined in .env):
 *   OPENROUTER_API_KEY          — your sk-or-v1-… key
 *   OPENROUTER_MODEL            — primary model  (e.g. "cohere/north-mini-code:free")
 *   OPENROUTER_FALLBACK_MODEL   — fallback model (e.g. "liquid/lfm-2.5-2.6b:free")
 */

import { createOpenAI } from "@ai-sdk/openai";

// ─── Create a reusable OpenRouter provider instance ──────────────────────────

const openrouterProvider = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY ?? "",
  headers: {
    // OpenRouter recommends these headers for analytics / routing
    "HTTP-Referer": "http://localhost:5173",
    "X-Title": "Mastra React App",
  },
});

// ─── Primary model ────────────────────────────────────────────────────────────

const primaryModelId =
  process.env.OPENROUTER_MODEL ?? "cohere/north-mini-code:free";

export const openrouterModel = openrouterProvider(primaryModelId);

// ─── Fallback model ───────────────────────────────────────────────────────────
// The last definition of OPENROUTER_FALLBACK_MODEL wins in the .env file.

const fallbackModelId =
  process.env.OPENROUTER_FALLBACK_MODEL ??
  "liquid/lfm-2.5-2.6b:free";

export const openrouterFallbackModel = openrouterProvider(fallbackModelId);

// ─── Convenience alias (used by activity-agent which imported `openrouterModels`) ─

export const openrouterModels = openrouterModel;
