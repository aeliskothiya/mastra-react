import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { auditOutputSchema, findingSchema } from '../schema/audit-output.js';
import { frontendAuditorAgent } from '../agents/frontend-auditor-agent.js';
import { backendAuditorAgent } from '../agents/backend-auditor-agent.js';
import { securityAuditorAgent } from '../agents/security-auditor-agent.js';
import { scanProject } from '../tools/project-scanner-tool.js';
import type { Agent } from '@mastra/core/agent';

// ─── Schema for each specialist agent's response ────────────────────────────

const specialistAuditSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  findings: z.array(findingSchema),
  recommendedNextSteps: z.array(z.string()),
});

type SpecialistAudit = z.infer<typeof specialistAuditSchema>;

// ─── JSON format instructions injected into every prompt ────────────────────
// This replaces `structuredOutput` (which requires model-level JSON schema
// support — most free models don't have it). Plain-text JSON parsing works
// with ALL models.

const JSON_FORMAT_INSTRUCTIONS = `
Return ONLY a valid JSON object — no markdown fences, no extra text.
The JSON must match this exact shape:
{
  "summary": "One paragraph overview of findings",
  "strengths": ["Strength 1", "Strength 2"],
  "findings": [
    {
      "id": "FINDING-001",
      "category": "Category name",
      "severity": "critical|high|medium|low",
      "file": "relative/path/to/file.js",
      "location": "line number or function name",
      "issue": "Short title of the problem",
      "explanation": "Why this is a problem",
      "recommendation": "How to fix it",
      "status": "open"
    }
  ],
  "recommendedNextSteps": ["Step 1", "Step 2"]
}`;

// ─── Fallback when JSON parsing fails ───────────────────────────────────────

const emptyAudit = (label: string): SpecialistAudit => ({
  summary: `${label} audit: the AI response could not be parsed. Please retry.`,
  strengths: [],
  findings: [],
  recommendedNextSteps: ['Retry the audit — the model response was malformed.'],
});

// ─── Core: run ONE agent, parse response as JSON (no structuredOutput) ───────

async function runSingleAudit(
  category: 'frontend' | 'backend' | 'security',
  label: string,
  agent: Agent,
  projectName: string,
): Promise<{ agentId: string; filesScanned: number; audit: SpecialistAudit }> {
  const scan = scanProject(category);

  const prompt =
    `You are the ${label} Auditor for project "${projectName}".\n` +
    `The relevant source files are provided below — use only this evidence.\n` +
    `Do NOT call any tools; all information you need is already here.\n\n` +
    `FILES:\n${JSON.stringify(scan.files, null, 2)}\n\n` +
    JSON_FORMAT_INSTRUCTIONS;

  let text = '';
  try {
    const result = await agent.generate(prompt);
    text = (result.text ?? '').trim();

    // Strip markdown code fences if model added them
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) text = fenceMatch[1].trim();

    // Grab the first {...} JSON object in the response
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) text = objMatch[0];

    const parsed = JSON.parse(text);
    return {
      agentId: agent.id,
      filesScanned: scan.filesScanned,
      audit: specialistAuditSchema.parse(parsed),
    };
  } catch (err) {
    console.warn(`[${label}] Audit JSON parse failed:`, (err as Error).message);
    console.warn(`[${label}] Raw response (first 300 chars):`, text.slice(0, 300));
    return {
      agentId: agent.id,
      filesScanned: scan.filesScanned,
      audit: emptyAudit(label),
    };
  }
}

// ─── Audit targets ───────────────────────────────────────────────────────────

const ALL_TARGETS = [
  { category: 'frontend' as const, label: 'Frontend', agent: frontendAuditorAgent },
  { category: 'backend'  as const, label: 'Backend',  agent: backendAuditorAgent  },
  { category: 'security' as const, label: 'Security', agent: securityAuditorAgent },
];

// ─── Workflow step ───────────────────────────────────────────────────────────

const runAuditStep = createStep({
  id: 'run-audit',
  description: 'Runs audits SEQUENTIALLY — one agent at a time — to avoid overloading free models.',
  inputSchema: z.object({
    projectName: z.string().default('my-project'),
    category: z.enum(['frontend', 'backend', 'security', 'all']).default('all'),
  }),
  outputSchema: auditOutputSchema,
  execute: async ({ inputData }) => {
    const startedAt = Date.now();
    const { projectName, category } = inputData;

    const targets = category === 'all'
      ? ALL_TARGETS
      : ALL_TARGETS.filter((t) => t.category === category);

    const audits: Array<{ agentId: string; filesScanned: number; audit: SpecialistAudit }> = [];

    // ── Sequential: one request at a time ────────────────────────────────
    for (const { category: cat, label, agent } of targets) {
      console.log(`[Code Audit] Starting ${label} audit...`);
      const result = await runSingleAudit(cat, label, agent, projectName);
      audits.push(result);
      console.log(`[Code Audit] ${label} audit complete — ${result.audit.findings.length} finding(s).`);
    }

    const findings = audits.flatMap(({ audit }) => audit.findings);
    const statistics = findings.reduce(
      (counts, f) => {
        counts[f.severity] = (counts[f.severity] ?? 0) + 1;
        counts.total += 1;
        return counts;
      },
      { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
    );

    return {
      auditId: `audit-${projectName}-${Date.now()}`,
      projectName,
      generatedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      filesScanned: audits.reduce((sum, a) => sum + a.filesScanned, 0),
      agentsUsed: audits.map(({ agentId }) => agentId),
      summary: audits.map(({ audit }) => audit.summary).join(' '),
      statistics,
      strengths: audits.flatMap(({ audit }) => audit.strengths),
      findings,
      recommendedNextSteps: [...new Set(audits.flatMap(({ audit }) => audit.recommendedNextSteps))],
    };
  },
});

// ─── Workflow export ─────────────────────────────────────────────────────────

export const codeAuditWorkflow = createWorkflow({
  id: 'code-audit-workflow',
  inputSchema: z.object({
    projectName: z.string().default('my-project'),
    category: z.enum(['frontend', 'backend', 'security', 'all']).default('all'),
  }),
  outputSchema: auditOutputSchema,
}).then(runAuditStep);

codeAuditWorkflow.commit();
