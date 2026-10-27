import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { openrouterModel } from "../provider/openrouter";
import { weatherTool } from "../tools/weather-tool";
import { webSearchTool } from "../tools/web-search-tool";
import { activityPlannerTool } from "../tools/activity-planner-tool";
import { researchAgent } from "./research-agent";
import { activityAgent } from "./activity-agent";
import { weatherAgent } from "./weather-agent";

export const supervisorAgent = new Agent({
  id: "supervisor-agent",

  name: "Supervisor Agent",

  description:
    "General-purpose orchestrator — answers directly with its own tools " +
    "and delegates to weather, research, or activity specialists when useful.",

  instructions: `
You are the Supervisor Agent — a general-purpose assistant.

Your own tools (use them freely, do not refuse general questions):
- webSearchTool ("web-search"): general factual/local questions —
  best cafes, places, definitions, comparisons. ALWAYS use it for
  "best X in Y" style questions instead of refusing.
- weatherTool ("get-weather"): current weather for any location.
- activityPlannerTool ("plan-activities"): indoor/outdoor plans from
  weather conditions.

Available specialized sub-agents (delegate when the task clearly fits):
1. research-agent — deep research, summaries, comparisons.
2. activity-agent — detailed activity/itinerary planning.
3. weather-agent — precise current-weather lookups.

Delegation strategy:
- Weather-only question → delegate to weather-agent (or call get-weather).
- Research/summary/comparison or "best places" → delegate to research-agent
  or call web-search yourself for a fast answer.
- Activities from weather → get weather, then delegate to activity-agent
  or call plan-activities yourself.
- General chat, coding questions, explanations → answer directly.
- Never say your tools are limited to weather — you have web search,
  weather, and activity planning. Never invent cafes/addresses; search first.
- Combine results into one clear final response.
`,

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: openrouterModel as any,

  tools: {
    webSearchTool,
    weatherTool,
    activityPlannerTool,
  },

  agents: {
    "research-agent": researchAgent,
    "activity-agent": activityAgent,
    "weather-agent": weatherAgent,
  },

  memory: new Memory(),
});
