import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectPathCandidates = [
  process.env.AUDIT_PROJECT_PATH,
  path.resolve(process.cwd(), "../my-project"),
  path.resolve(process.cwd(), "../../../my-project"),
  path.resolve(moduleDirectory, "../../my-project"),
  path.resolve(moduleDirectory, "../../../../my-project"),
].filter((candidate): candidate is string => Boolean(candidate));
const TARGET_PROJECT_PATH = projectPathCandidates.find(fs.existsSync) ?? projectPathCandidates[0];
const MAX_CONTEXT_CHARS = 12_000; // Keep well within free-model token limits
const MAX_FILE_CHARS = 3_000;     // Cap each individual file at 3K chars

const fileFilters = {
  frontend: [
    "client/src/**/*.js",
    "client/src/**/*.jsx",
    "client/src/**/*.css",
    "client/package.json",
    "client/vite.config.js"
  ],
  backend: [
    "server/**/*.js",
    "server/**/*.sql",
    "server/package.json"
  ],
  security: [
    "server/middleware/",
    "server/db/",
    "server/index.js",
    ".env.example"
  ]
};

// Extremely simple glob/prefix matcher
function matchesFilter(relPath: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    if (pattern.includes("**/*.")) {
      const prefix = pattern.slice(0, pattern.indexOf("**/*"));
      const extension = pattern.slice(pattern.lastIndexOf("."));
      if (relPath.startsWith(prefix) && relPath.endsWith(extension)) {
        return true;
      }
      continue;
    }

    if (pattern.includes("**")) {
      const prefix = pattern.slice(0, pattern.indexOf("**"));
      if (relPath.startsWith(prefix)) {
        return true;
      }
    } else {
      if (relPath === pattern || relPath.startsWith(pattern)) {
        return true;
      }
    }
  }
  return false;
}

// Function to safely scan directory
function scanDir(dir: string, category: "frontend" | "backend" | "security", basePath: string = TARGET_PROJECT_PATH): { path: string, relPath: string, type: string, content: string }[] {
  let results: { path: string, relPath: string, type: string, content: string }[] = [];
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const relPath = path.relative(basePath, fullPath).replace(/\\/g, "/");

      // Skip common irrelevant/large directories
      if (relPath.includes("node_modules") || relPath.includes(".git") || relPath.includes("dist") || relPath.includes("build") || relPath.includes("coverage")) {
        continue;
      }

      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        results = results.concat(scanDir(fullPath, category, basePath));
      } else {
        // Only include if matches the category filters
        if (matchesFilter(relPath, fileFilters[category])) {
          // Read content, truncate if too large (> 100KB)
          let content = "";
          if (stat.size < 100 * 1024) {
            content = fs.readFileSync(fullPath, "utf-8");
          } else {
            content = "// File too large, truncated safely for AI context\n" + fs.readFileSync(fullPath, "utf-8").slice(0, 1024 * 10) + "\n...[TRUNCATED]";
          }
          
          results.push({
            path: fullPath,
            relPath: relPath,
            type: path.extname(fullPath) || "unknown",
            content
          });
        }
      }
    }
  } catch (error) {
    console.warn(`Could not read directory ${dir}`, error);
  }
  return results;
}

export function scanProject(category: "frontend" | "backend" | "security") {
  if (!fs.existsSync(TARGET_PROJECT_PATH)) {
    throw new Error(`Target project path not found: ${TARGET_PROJECT_PATH}`);
  }

  const files = scanDir(TARGET_PROJECT_PATH, category);
  let remainingContext = MAX_CONTEXT_CHARS;

  return {
    success: true,
    category,
    filesScanned: files.length,
    files: files
      .map(f => {
        // Cap each file individually first, then apply the total budget
        const fileContent = f.content.slice(0, MAX_FILE_CHARS);
        const content = remainingContext > 0
          ? fileContent.slice(0, remainingContext)
          : "[Omitted — context limit reached]";
        remainingContext -= content.length;
        return { relPath: f.relPath, content };
      })
      .filter(f => f.content !== "[Omitted — context limit reached]"),
  };
}

export const projectScannerTool = createTool({
  id: "project-scanner",
  description: "Read-only tool to scan the Week 1 project source code based on a specific category (frontend, backend, security). Safely filters and limits file sizes.",
  inputSchema: z.object({
    category: z.enum(["frontend", "backend", "security"]).describe("The category of files to retrieve."),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    category: z.string(),
    filesScanned: z.number(),
    files: z.array(
      z.object({
        relPath: z.string(),
        content: z.string(),
      }),
    ),
  }),
  execute: async (inputData: unknown) => {
    const category =
      (inputData as { category?: "frontend" | "backend" | "security" })?.category ??
      ((inputData as { context?: { category?: "frontend" | "backend" | "security" } })?.context?.category) ??
      "frontend";
    return scanProject(category);
  },
});
