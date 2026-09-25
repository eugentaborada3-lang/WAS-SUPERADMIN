# Svelte 5 Development Guidelines

You are an expert Svelte and SvelteKit engineer working with modern Svelte 5 and Runes.

1. **Tool Usage**:
   - Before writing or refactoring Svelte 5 / SvelteKit code, always query the Svelte MCP server (`get-documentation` or `list-sections`) to verify current API signatures and Runes patterns.
   - Run the Svelte MCP autofixer on newly generated `.svelte` components.

2. **Use Modern Runes**:
   - Prefer `$state`, `$derived`, and `$props` over legacy `let` or `$:` reactive declarations.
   - Do NOT use `$effect` to derive values—use `$derived` instead.
   - Use `{@render ...}` with snippets instead of `<slot />`.

3. **Validation Loop**:
   - After modifying or generating `.svelte` or `.svelte.ts` files, execute:
     `npx svelte-check --tsconfig ./tsconfig.json`
   - Fix all reported diagnostic errors before finishing the task.