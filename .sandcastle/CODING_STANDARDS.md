# Coding Standards

## Style

- Follow the existing TypeScript, React, and Tailwind conventions in the touched module.
- Prefer the smallest correct change and avoid speculative compatibility layers.
- Use explicit domain names from `CONTEXT.md`; UI copy and human-facing URLs are Spanish.
- Keep technical contracts, identifiers, `/api/**`, and `/overlay` in English.
- Do not add AI attribution to code or commits.

## Testing

- Test externally observable behavior at the highest practical seam.
- Routing slices require Playwright coverage for direct URL entry, reload, and browser history.
- Add focused unit tests only for pure mapping or validation rules that browser tests cannot isolate.
- Run TypeScript and focused lint/tests; never run a local production build.

## Architecture

- The URL is the source of truth for navigable state.
- Primary destinations use route segments; filters and local modes use Spanish search parameters.
- Drafts, confirmations, recordings, and unsaved forms remain local state.
- Next.js Proxy may redirect optimistically, but server layouts and handlers own authorization.
- Preserve existing business behavior while extracting route-specific modules from monolithic pages.
- Never read, expose, or commit secrets.
