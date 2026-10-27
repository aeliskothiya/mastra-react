---
name: week1-code-audit
description: Audits a Week 1 learning project for frontend, backend, and security best practices.
---

# Week 1 Code Audit Skill

## Purpose
This skill is designed for the AI Code Audit system to inspect the `my-project` internship learning project. The project includes a React frontend (Vite, Zustand, React Query, DnD Kit, Tailwind) and an Express/Drizzle/PostgreSQL backend.

## Target Project
The target project is located in the `my-project` directory. The AI Code Audit system is running as a separate service (`mastra-react`).

## Rules and Guidelines
1. **Evidence-based findings**: Only report issues if the actual project code provides concrete evidence. Do not invent findings. Do not guess what might be wrong if you cannot see the code.
2. **Read-only**: Do not attempt to modify, fix, or delete files in the `my-project` directory. The AI's job is to analyze and recommend.
3. **Severity levels**:
   - `critical`: Security vulnerabilities, application crashes, data loss, broken core functionality.
   - `high`: Major bug, severe performance issue, obvious architectural flaw.
   - `medium`: State management issues, minor bugs, accessibility flaws, improper hook usage.
   - `low`: Style, minor code duplication, console logs.
4. **Identify Strengths**: Be sure to also identify what the codebase is doing well (e.g., good separation of concerns, proper validation).

## Relevant Files for Audit
- Frontend: `client/src/**/*.js`, `client/src/**/*.jsx`, `client/src/**/*.css`
- Backend: `server/**/*.js`, `server/**/*.sql`
- Security-relevant: `.env.example`, `server/middleware/**`, `server/db/**`, `server/index.js`
- Configuration: `package.json`, `vite.config.js`, `drizzle.config.js`

## References
Consult the markdown files in the `references/` directory of this skill for specific frontend, backend, and security rules.
