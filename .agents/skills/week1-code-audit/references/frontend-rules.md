# Frontend Rules for Code Audit

When analyzing frontend files (client/src/**/*.js, *.jsx), focus on:

1. **React Best Practices**
   - Are components reasonably sized? If a component is > 300 lines, recommend splitting it.
   - Are hooks used correctly (no conditional hooks, proper dependencies in useEffect/useMemo/useCallback)?
   - Is there unnecessary prop drilling? Suggest context or Zustand if appropriate.
   - Is `useState` used for derived state? Recommend calculating derived state during render.

2. **Forms and Validation**
   - Are forms using a robust solution like `react-hook-form`?
   - Is `zod` used for validation schemas?
   - How are errors displayed to the user?

3. **State Management**
   - Check usage of `Zustand` for global client state.
   - Check usage of `React Query` for server state (caching, fetching, mutating). Are mutations invalidating queries properly?
   - Check `Context` usage (should be limited to low-frequency updates like themes/auth).

4. **UI and Accessibility**
   - Check for basic accessibility attributes (aria-labels, alt text, focus management).
   - Are loading states and error states handled gracefully?
   - Are Tailwind/shadcn classes used cleanly without excessive duplication?

5. **Drag and Drop (DnD)**
   - Check `@dnd-kit/core` usage.
   - Ensure sortable context and collision detection are handled properly.
