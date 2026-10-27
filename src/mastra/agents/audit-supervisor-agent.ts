import { Agent } from "@mastra/core/agent";
import { openrouterModel } from "../provider/openrouter";
import { frontendAuditorAgent } from "./frontend-auditor-agent.js";
import { backendAuditorAgent } from "./backend-auditor-agent.js";
import { securityAuditorAgent } from "./security-auditor-agent.js";

export const auditSupervisorAgent = new Agent({
  id: "audit-supervisor-agent",
  name: "Audit Supervisor",
  instructions: `You are the Audit Supervisor for a multi-agent AI Code Audit system.
Your job is to coordinate the specialized audit agents and consolidate their findings into a final, structured JSON report.

Available specialized agents:
1. frontend-auditor-agent: Analyzes React, state management, UI, and forms.
2. backend-auditor-agent: Analyzes API, routing, database, and backend logic.
3. security-auditor-agent: Analyzes secrets, authentication, RLS, and vulnerabilities.

Delegation strategy:
You MUST delegate to ALL THREE specialized agents.
- First, delegate to the frontend-auditor-agent to perform the frontend audit.
- Next, delegate to the backend-auditor-agent to perform the backend audit.
- Finally, delegate to the security-auditor-agent to perform the security audit.

Do NOT attempt to perform the file scanning or auditing yourself. You do not have the project-scanner-tool.
Do NOT simulate what the agents would say. Actually delegate to them.

Once all three agents have returned their findings, review and consolidate them.
The final response should be the combined findings formatted exactly according to the required structured output schema (AuditResult).
`,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: openrouterModel as any,
  agents: {
    frontendAuditorAgent,
    backendAuditorAgent,
    securityAuditorAgent,
  }
});
