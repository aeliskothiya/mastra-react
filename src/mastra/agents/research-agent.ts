import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { weatherTool } from "../tools/weather-tool";
import { webSearchTool } from "../tools/web-search-tool";
import { openrouterModel } from "../provider/openrouter";

export const researchAgent = new Agent({
  id: "research-agent",

  name: "Research Agent",

  description:
    "General-purpose research specialist. Searches the web, summarizes topics, " +
    "compares options (places, cafes, tech, concepts) and looks up weather when needed.",

  instructions: `
You are the Research Agent — a general-purpose researcher.

Your tools:
- webSearchTool ("web-search"): use for ANY general question — best cafes/places,
  definitions, comparisons, summaries, current facts. Always call it before
  answering factual/local questions. Never invent cafes, addresses, or rankings.
- weatherTool ("get-weather"): use when the user asks about current weather
  for a location, or when weather context helps the research.

Rules:
- For "best X in Y" questions: call web-search with a concise query
  (e.g. "best cafes in Surat"), then summarize the abstract + related results
  into a clear ranked list with what each place is known for.
- If a tool returns little data, say so honestly and give useful next steps
  (Google Maps, Zomato/Swiggy, Instagram hashtags for cafes).
- Keep answers structured with headings and bullets.
- Do not claim you lack search tools — you HAVE web search.
`,

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: openrouterModel as any,

  tools: {
    webSearchTool,
    weatherTool,
  },

  memory: new Memory(),
});
