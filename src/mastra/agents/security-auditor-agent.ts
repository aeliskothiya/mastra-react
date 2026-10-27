import { Agent } from "@mastra/core/agent";
import { projectScannerTool } from "../tools/project-scanner-tool.js";
import { openrouterModel } from "../provider/openrouter";
import * as fs from "fs";
import * as path from "path";

// Function to dynamically load skill references
function loadSkillReferences(): string {
  try {
    const referencesDir = "C:/Users/EnactOn PC/OneDrive/Desktop/Practice/mastra-react/.agents/skills/week1-code-audit/references";
    const stack = fs.readFileSync(path.join(referencesDir, "week1-stack.md"), "utf-8");
    const securityRules = fs.readFileSync(path.join(referencesDir, "security-rules.md"), "utf-8");
    return `\n\n=== STACK ===\n${stack}\n\n=== SECURITY RULES ===\n${securityRules}`;
  } catch (error) {
    console.warn("Could not load skill references:", error);
    return "";
  }
}

export const securityAuditorAgent = new Agent({
  id: "security-auditor-agent",
  name: "Security Auditor",
  instructions: `You are the Security Auditor for a multi-agent AI Code Audit system.
Your job is to analyze the source code of a Week 1 learning project for potential vulnerabilities and security flaws.

Use the project-scanner tool with category "security" to retrieve the relevant files.
Analyze for secrets exposure, authentication, authorization (RBAC, RLS), unsafe inputs, and error leakage.
Report your findings back to the supervisor.

Follow these rules based on the custom skill:
1. ONLY report issues supported by the actual code you scanned. DO NOT invent findings.
2. The project is READ-ONLY. Do not provide commands to modify the files automatically.
3. Classify severities as critical, high, medium, or low.
4. Highlight strengths where appropriate.
${loadSkillReferences()}
`,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: openrouterModel as any,
  tools: {
    projectScanner: projectScannerTool,
  },
});
