import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// ============================================================
// Web Search Tool — no API key required
// Uses DuckDuckGo Instant Answer + Wikipedia REST APIs.
// Gives every general-purpose agent a real research capability.
// ============================================================

const webSearchOutputSchema = z.object({
  query: z.string(),
  abstract: z.string(),
  abstractSource: z.string(),
  related: z.array(
    z.object({
      title: z.string(),
      snippet: z.string(),
      url: z.string(),
    }),
  ),
  wikiSummary: z.string(),
});

type WebSearchOutput = z.infer<typeof webSearchOutputSchema>;

async function fetchJson(url: string, timeoutMs = 8000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "NexusAI/1.0 (research tool)" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function searchWeb(query: string): Promise<WebSearchOutput> {
  const q = query.trim().slice(0, 200);

  // 1. DuckDuckGo Instant Answer (free, no key)
  const ddg = await fetchJson(
    `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`,
  );

  const abstract: string =
    ddg?.AbstractText && ddg.AbstractText.trim()
      ? String(ddg.AbstractText).slice(0, 1500)
      : "";

  const abstractSource: string = ddg?.AbstractSource
    ? String(ddg.AbstractSource)
    : "";

  const related: WebSearchOutput["related"] = [];
  if (Array.isArray(ddg?.RelatedTopics)) {
    for (const item of ddg.RelatedTopics.slice(0, 8)) {
      if (item?.Text && item?.FirstURL) {
        related.push({
          title: String(item.Text).split(" - ")[0].slice(0, 120),
          snippet: String(item.Text).slice(0, 300),
          url: String(item.FirstURL),
        });
      } else if (Array.isArray(item?.Topics)) {
        for (const sub of item.Topics.slice(0, 3)) {
          if (sub?.Text && sub?.FirstURL && related.length < 8) {
            related.push({
              title: String(sub.Text).split(" - ")[0].slice(0, 120),
              snippet: String(sub.Text).slice(0, 300),
              url: String(sub.FirstURL),
            });
          }
        }
      }
    }
  }

  // 2. Wikipedia summary (free, no key) — best-effort enrichment
  let wikiSummary = "";
  const wiki = await fetchJson(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`,
  );
  if (wiki?.extract) {
    wikiSummary = String(wiki.extract).slice(0, 1500);
  }

  return { query: q, abstract, abstractSource, related, wikiSummary };
}

function normalizeInput(input: unknown): { query: string } {
  if (typeof input === "string") return { query: input };
  if (input && typeof input === "object") {
    const obj = input as Record<string, unknown>;
    // Mastra may wrap payload in `context`
    const ctx = obj.context as Record<string, unknown> | undefined;
    const query =
      (typeof obj.query === "string" && obj.query) ||
      (ctx && typeof ctx.query === "string" && ctx.query) ||
      "";
    return { query };
  }
  return { query: "" };
}

export const webSearchTool = createTool({
  id: "web-search",
  description:
    "Search the web for general knowledge, places, cafes, restaurants, definitions, and current facts. Uses DuckDuckGo and Wikipedia (no API key). Input: a concise search query.",
  inputSchema: z.object({
    query: z.string().describe("Concise search query, e.g. 'best cafes in Surat'"),
  }),
  outputSchema: webSearchOutputSchema,
  execute: async (inputData: unknown) => {
    const { query } = normalizeInput(inputData);
    if (!query.trim()) {
      return {
        query: "",
        abstract: "",
        abstractSource: "",
        related: [],
        wikiSummary: "",
      };
    }
    return await searchWeb(query);
  },
});
