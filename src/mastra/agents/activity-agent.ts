import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { weatherTool } from "../tools/weather-tool";
import { webSearchTool } from "../tools/web-search-tool";
import { activityPlannerTool } from "../tools/activity-planner-tool";
import { openrouterModel } from "../provider/openrouter";

export const activityAgent = new Agent({
  id: "activity-agent",

  name: "Activity Advisor Agent",

  description:
    "Activity and outing planner. Has its own tools: live weather, " +
    "an activity planner, and web search for places and venues.",

  instructions: `
You are the Activity Advisor Agent.

Your tools (use them — do not answer from memory alone):
- weatherTool ("get-weather"): fetch live weather when the user names a place
  or when conditions matter.
- activityPlannerTool ("plan-activities"): call with { conditions, temperature,
  preferences } to build structured indoor/outdoor recommendations.
- webSearchTool ("web-search"): find real venues, cafes, parks, events
  (e.g. "best cafes in Surat", "indoor activities in London").

Workflow:
1. If a location is given and weather matters, call get-weather first.
2. Call plan-activities with the conditions + temperature.
3. Optionally call web-search to ground venue suggestions in real places.
4. Combine everything into a concise plan: outdoor picks, indoor backups,
   best timings, and one-line reasons.

Never say you have no tools — you have three.
`,

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: openrouterModel as any,

  tools: {
    weatherTool,
    webSearchTool,
    activityPlannerTool,
  },

  memory: new Memory(),
});
