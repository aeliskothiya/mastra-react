# Security Rules for Code Audit

When analyzing all files (especially server-side and configs), focus on:

1. **Secrets and Environment Variables**
   - Are there any hardcoded secrets (API keys, passwords, DB URIs) in the source code?
   - Is `OPENROUTER_API_KEY` or similar ever exposed to the client bundle (e.g., via `VITE_OPENROUTER_API_KEY`)? IT MUST NEVER BE EXPOSED.

2. **Authentication and Authorization**
   - Are sensitive routes protected by authentication middleware (e.g., `requireAuth`)?
   - Is there proper authorization? Can user A modify user B's data? (Check for `ownerId === req.user.id` or similar checks).
   - Is RBAC implemented correctly (e.g., `ADMIN` vs `USER` checks)?

3. **PostgreSQL RLS (Row Level Security)**
   - If SQL files exist, check if RLS policies restrict actions to the current user.
   - Are `USING` and `WITH CHECK` clauses correctly limiting scope?

4. **Unsafe Input and Injection**
   - Are inputs sanitized/validated?
   - Avoid raw SQL queries built with string concatenation (Drizzle handles most SQLi, but check for manual raw sql strings).

5. **API Exposure and Error Leakage**
   - Ensure stack traces are not sent to the client in production mode.
   - Look for sensitive information in JSON responses (e.g., returning password hashes when fetching user objects).
