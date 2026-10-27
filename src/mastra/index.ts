import { Mastra } from "@mastra/core/mastra";
import { registerApiRoute } from "@mastra/core/server";
import { PinoLogger } from "@mastra/loggers";
import { LibSQLStore } from "@mastra/libsql";
import { DuckDBStore } from "@mastra/duckdb";
import { MastraCompositeStore } from "@mastra/core/storage";

import {
  Observability,
  MastraStorageExporter,
  MastraPlatformExporter,
  SensitiveDataFilter,
} from "@mastra/observability";

// Workflows
import { weatherWorkflow } from "./workflows/weather-workflow";
import { codeAuditWorkflow } from "./workflows/code-audit-workflow";

// Agents
import { weatherAgent } from "./agents/weather-agent";
import { researchAgent } from "./agents/research-agent";
import { activityAgent } from "./agents/activity-agent";
import { supervisorAgent } from "./agents/supervisor-agent";
import { frontendAuditorAgent } from "./agents/frontend-auditor-agent";
import { backendAuditorAgent } from "./agents/backend-auditor-agent";
import { securityAuditorAgent } from "./agents/security-auditor-agent";
import { auditSupervisorAgent } from "./agents/audit-supervisor-agent";

// Schemas
import { weatherOutputSchema } from "./schema/weather-output";

export const mastra = new Mastra({
  // ============================================================
  // WORKFLOWS
  // ============================================================

  workflows: {
    weatherWorkflow,
    codeAuditWorkflow,
  },

  // ============================================================
  // AGENTS
  // ============================================================

  agents: {
    "weather-agent": weatherAgent,
    "research-agent": researchAgent,
    "activity-agent": activityAgent,
    "supervisor-agent": supervisorAgent,
    "frontend-auditor-agent": frontendAuditorAgent,
    "backend-auditor-agent": backendAuditorAgent,
    "security-auditor-agent": securityAuditorAgent,
    "audit-supervisor-agent": auditSupervisorAgent,
  },

  // ============================================================
  // STORAGE
  // ============================================================

  storage: new MastraCompositeStore({
    id: "composite-storage",

    default: new LibSQLStore({
      id: "mastra-storage", 

      

      // Uses hosted database when deployed
      // Uses local database during development.
      url:
        process.env.TURSO_DATABASE_URL ??
        "file:./mastra.db",

      authToken: process.env.TURSO_AUTH_TOKEN,
    }),

    domains: {
      observability:
        await new DuckDBStore().getStore("observability"),
    },
  }),

  // ============================================================
  // LOGGER
  // ============================================================

  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),

  // ============================================================
  // OBSERVABILITY
  // ============================================================

  observability: new Observability({
    configs: {
      default: {
        serviceName: "mastra",

        exporters: [
          // Persists observability events to Mastra Storage
          new MastraStorageExporter(),

          // Sends observability events to Mastra Platform
          // if MASTRA_PLATFORM_ACCESS_TOKEN is configured
          new MastraPlatformExporter(),
        ],

        spanOutputProcessors: [
          // Redacts sensitive data such as passwords,
          // tokens and API keys
          new SensitiveDataFilter(),
        ],
      },
    },
  }),

  // ============================================================
  // SERVER
  // ============================================================

  server: {
    apiRoutes: [

      // ========================================================
      // 1. GENERIC CHAT ROUTE
      // ========================================================

      registerApiRoute("/chat/:agentId", {
        method: "POST",

        cors: {
          origin: "*",
        },

        handler: async (context) => {
          const agentId = context.req.param("agentId");

          const agent = context
            .get("mastra")
            .getAgent(agentId);

          const body =
            await context.req.json<{
              messages?: unknown[];
              threadId?: string;
              resourceId?: string;
            }>();

          // ----------------------------------------------------
          // Validate messages
          // ----------------------------------------------------

          if (!body.messages?.length) {
            return context.json(
              {
                error:
                  "At least one message is required.",
              },
              400,
            );
          }

          // ----------------------------------------------------
          // Memory identifiers
          // ----------------------------------------------------

          const threadId =
            body.threadId ?? "default-thread";

          const resourceId =
            body.resourceId ?? "default-user";

          // ----------------------------------------------------
          // Agent messages
          // ----------------------------------------------------

          const messages =
            body.messages as Parameters<
              typeof agent.stream
            >[0];

          // ----------------------------------------------------
          // Start agent
          // ----------------------------------------------------

          const stream =
            await agent.stream(messages, {
              memory: {
                thread: threadId,
                resource: resourceId,
              },
            });

          // ----------------------------------------------------
          // Convert agent stream to HTTP response
          // ----------------------------------------------------

          const responseStream =
            new ReadableStream<Uint8Array>({
              async start(controller) {
                const encoder =
                  new TextEncoder();
                  
                // Send current model info at the start
                const currentModel = process.env.OPENROUTER_MODEL || "unknown";
                controller.enqueue(
                  encoder.encode(`__META_MODEL__${currentModel}__\n`)
                );

                try {
                  // Iterate over fullStream to intercept tool calls
                  for await (
                    const chunk of stream.fullStream
                  ) {
                    console.log("[MASTRA_STREAM_CHUNK]", JSON.stringify(chunk));
                    
                    const chunkAny = chunk as any;
                    if (chunk.type === "text-delta") {
                      const text = chunkAny.textDelta || chunkAny.text || chunkAny.payload?.textDelta || chunkAny.payload?.text || "";
                      if (text) {
                        controller.enqueue(
                          encoder.encode(text),
                        );
                      }
                    } else if (chunk.type === "tool-call") {
                      const toolName = chunkAny.toolName || chunkAny.payload?.toolName || "unknown-tool";
                      controller.enqueue(
                        encoder.encode(`__META_TOOL__${toolName}__\n`)
                      );
                    } else if (chunk.type === "error") {
                      const errorMsg = chunkAny.error?.message || chunkAny.error || "Unknown API Error";
                      controller.enqueue(
                        encoder.encode(`\n\n⚠️ **Error:** ${errorMsg}\n`)
                      );
                    }
                  }

                  controller.close();
                } catch (error) {
                  controller.error(error);
                }
              },
            });

          return new Response(
            responseStream,
            {
              headers: {
                "Content-Type":
                  "text/plain; charset=utf-8",
              },
            },
          );
        },
      }),

      // ========================================================
      // 2. STRUCTURED WEATHER OUTPUT
      // ========================================================

      registerApiRoute("/weather-structured", {
        method: "POST",

        cors: {
          origin: "*",
        },

        handler: async (context) => {
          const agent = context
            .get("mastra")
            .getAgent("weather-agent");

          const body =
            await context.req.json<{
              message?: string;
            }>();

          if (!body.message) {
            return context.json(
              {
                error:
                  "Message is required.",
              },
              400,
            );
          }

          const result =
            await agent.generate(
              body.message,
              {
                structuredOutput: {
                  schema:
                    weatherOutputSchema,
                },
              },
            );

          return context.json(
            result.object,
          );
        },
      }),

      // ========================================================
      // 3. WEATHER WEBHOOK
      // ========================================================

      registerApiRoute("/weather-webhook", {
        method: "POST",

        cors: {
          origin: "*",
        },

        handler: async (context) => {
          const agent = context
            .get("mastra")
            .getAgent("weather-agent");

          const body =
            await context.req.json<{
              location?: string;
            }>();

          if (
            !body.location ||
            !body.location.trim()
          ) {
            return context.json(
              {
                error:
                  "Location is required.",
              },
              400,
            );
          }

          const location =
            body.location.trim();

          try {
            const result =
              await agent.generate(
                `Get the current weather for ${location}.`,
                {
                  structuredOutput: {
                    schema:
                      weatherOutputSchema,
                  },
                },
              );

            return context.json({
              event: "weather-webhook",

              receivedLocation:
                location,

              weather: result.object,
            });
          } catch (error) {
            console.error(
              "Weather agent failed:",
              error,
            );

            // Invalid location
            if (
              error instanceof Error &&
              error.message
                .includes("Location") &&
              error.message
                .includes("not found")
            ) {
              return context.json(
                {
                  error: error.message,
                },
                404,
              );
            }
              
              // Temporary AI/API failure
            return context.json(
              {
                error:
                  "Weather service temporarily unavailable.",
              },
              503,
            );
          }
        },
      }),

      // ========================================================
      // 4. CODE AUDIT
      // ========================================================

      registerApiRoute("/code-audit", {
        method: "POST",

        cors: {
          origin: "*",
        },

        handler: async (context) => {
          try {
            const mastraInstance = context.get("mastra");
            const workflow = mastraInstance.getWorkflow("codeAuditWorkflow");

            if (!workflow) {
              return context.json({ error: "Code audit workflow not found" }, 500);
            }

            const run = await workflow.createRun();
            const body = await context.req.json<{ category?: string }>().catch((): { category?: string } => ({}));
            const category = ['frontend', 'backend', 'security', 'all'].includes(body.category ?? '')
              ? (body.category as 'frontend' | 'backend' | 'security' | 'all')
              : 'all';

            console.log(`[Code Audit Route] Starting audit — category: ${category}`);
            const workflowResult = await run.start({ inputData: { projectName: "my-project", category } });

            if (workflowResult.status === "success") {
              // Mastra stores step outputs in workflowResult.steps[stepId].output
              type WorkflowSuccess = typeof workflowResult & {
                steps?: Record<string, { output?: unknown }>;
                result?: unknown;
                results?: unknown;
              };
              const successResult = workflowResult as WorkflowSuccess;
              const steps = successResult.steps;
              const auditOutput =
                steps?.["run-audit"]?.output ??
                successResult.result ??
                successResult.results;

              if (!auditOutput) {
                console.error("Workflow succeeded but no output found. Full result:", JSON.stringify(workflowResult, null, 2));
                return context.json({ error: "Audit completed but returned no data." }, 500);
              }
              return context.json(auditOutput);
            } else {
              console.error("Workflow failed/incomplete:", JSON.stringify(workflowResult, null, 2));
              return context.json(
                {
                  error: "Code audit workflow didn't complete successfully.",
                  ...(process.env.NODE_ENV !== "production" && {
                    details: (workflowResult as typeof workflowResult & { error?: string }).error || workflowResult.status,
                  }),
                },
                500,
              );
            }
          } catch (error) {
            console.error("Code Audit Workflow failed:", error);
            return context.json(
              {
                error: "Code audit service failed to process.",
                ...(process.env.NODE_ENV !== "production" && {
                  details: error instanceof Error ? error.message : String(error),
                }),
              },
              500,
            );
          }
        },
      }),
    ],
  },
});
