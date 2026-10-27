import { z } from "zod";

export const findingSchema = z.object({
  id: z.string().describe("A unique identifier for the finding (e.g., FINDING-001)"),
  category: z.string().describe("The category of the finding (e.g., State Management, Security, Routing, etc.)"),
  severity: z.enum(["critical", "high", "medium", "low"]).describe("The severity level of the finding"),
  file: z.string().describe("The relative path to the file where the issue was found"),
  location: z.string().optional().describe("Line number or function name if applicable"),
  issue: z.string().describe("A short description of the problem"),
  explanation: z.string().describe("Detailed explanation of why this is a problem and what evidence exists"),
  recommendation: z.string().describe("Actionable recommendation on how to fix the issue"),
  status: z.enum(["open", "fixed", "accepted"]).optional().describe("Current status of the finding"),
});

export const auditOutputSchema = z.object({
  auditId: z.string().describe("Unique identifier for this audit run"),
  projectName: z.string().describe("Name of the audited project"),
  generatedAt: z.string().describe("ISO timestamp of when the audit was generated"),
  durationMs: z.number().describe("Duration of the audit in milliseconds"),
  filesScanned: z.number().describe("Total number of files scanned and analyzed"),
  agentsUsed: z.array(z.string()).describe("List of agents that participated in the audit"),
  summary: z.string().describe("High-level summary of the audit findings"),
  statistics: z.object({
    critical: z.number(),
    high: z.number(),
    medium: z.number(),
    low: z.number(),
    total: z.number(),
  }).describe("Count of findings by severity"),
  strengths: z.array(z.string()).describe("List of positive aspects identified in the codebase"),
  findings: z.array(findingSchema).describe("List of identified issues and recommendations"),
  recommendedNextSteps: z.array(z.string()).describe("High-level actionable next steps for the team"),
});

export type AuditOutput = z.infer<typeof auditOutputSchema>;
export type Finding = z.infer<typeof findingSchema>;
