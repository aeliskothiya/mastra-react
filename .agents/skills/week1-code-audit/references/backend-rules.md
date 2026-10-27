# Backend Rules for Code Audit

When analyzing backend files (server/**/*.js), focus on:

1. **API Structure and Routing**
   - Are routes well-organized?
   - Is there a consistent standard for API responses (e.g., `{ success: true, data: ... }` vs `{ success: false, error: ... }`)?
   - Are errors caught and handled gracefully (no crashing the Node process)?

2. **Database and Drizzle**
   - Is Drizzle used effectively? Are schemas strongly typed/defined?
   - Look for N+1 query problems in relationships.
   - Are transactions used where necessary (e.g., multiple related inserts)?

3. **Validation and Type Safety**
   - Are incoming payloads validated using Zod schemas?
   - Is the application relying blindly on `req.body`?

4. **Separation of Concerns**
   - Is business logic kept out of route handlers, or are route handlers massive? (For a small week 1 project, minor mixing is okay, but huge blocks should be flagged).

5. **Error Responses**
   - Are API errors descriptive without leaking internal database errors (like SQL syntax errors or stack traces)?
