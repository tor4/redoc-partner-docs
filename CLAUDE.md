@AGENTS.md

## Commands

```bash
npm run dev     # http://localhost:3000 (use `localhost`, not 127.0.0.1, which blocks HMR)
npm run build
npm run lint    # eslint
npm test        # Vitest: unit, config and component tests
```

See Testing below for coverage and E2E commands.

## Architecture

One shared OpenAPI spec is rendered as a different Redoc page per partner.

- `partners/<slug>.json` is the per-partner config (`PartnerConfig` in `lib/types.ts`): name, which spec in `specs/` to use, logo, servers, `include.tags` / `exclude.operationIds`, Redoc `options`, and Redoc `theme`. Adding a JSON file adds a partner; there is no registry.
- `lib/loadPartner.ts` reads the partner and spec JSON from disk. Every loader uses `"use cache"`, because `cacheComponents: true` in `next.config.ts` treats file reads as uncached dynamic data. Keep the directive on any new loader.
- `lib/filterSpec.ts` builds a partner's view of the spec: tag allow-list, drops `x-internal` and excluded operationIds, overrides `servers`, injects `x-logo`, prefixes the title, then prunes `components` not reachable via `$ref` from the remaining paths. `securitySchemes` are exempt from pruning because they are referenced by name, not `$ref`.
- `app/[partner]/page.tsx` is a server component. It calls `generateStaticParams` over the partner files, filters the spec, and passes plain-JSON props to `components/RedocView.tsx`.
- `components/RedocView.tsx` is the only client component (`"use client"`). It wraps `RedocStandalone`.

## Gotchas

- `styled-components` is pinned to `^5.3.0` to match Redoc's expectations. v6 produces "unknown prop `depth` / `html`" warnings from Redoc's internals. After changing dependencies, restart `next dev` and clear `.next`, because a stale Turbopack cache can keep serving the old version.
- The `@/*` import alias maps to the repo root (not `src/`).

## Styling

- No inline styles (`style={{...}}`). Use CSS Modules (`*.module.css`) next to the component and import them as `styles`.

## Testing

```bash
npm test                # Vitest, once
npm run test:watch      # Vitest in watch mode
npm run test:coverage   # Vitest with coverage report (lib/** only, no thresholds)
npm run test:e2e        # Playwright against a production build on port 3100
```

- New logic in `lib/` ships with a colocated `<name>.test.ts`. A component test is `Foo.test.tsx` next to the component (jsdom project). Playwright specs live in `tests/e2e/*.spec.ts`.
- Check existing tests before writing a new one; extend them instead of duplicating.
- Test behavior, not implementation. One behavior per test, titled as a sentence starting with a verb (no "should").
- Cover edge cases (empty, missing, malformed input) and security: path traversal in slugs/spec names, regex characters in partner names, and hidden operations never appearing in a partner's page source.
- Keep tests deterministic and independent: no network or clock, clone fixtures with `structuredClone`, mock only what the project does not own (`node:fs`, `redoc`).
- Write a failing regression test before fixing a bug, and confirm a new test can fail by briefly breaking the code.
- `notFound()` for an unknown slug can return HTTP 200 or 404 depending on cache state, so E2E asserts the not-found page, not the status.

## Code style

- Separate logical blocks with empty lines for readability: between imports and code, between functions, and between distinct steps inside a function (e.g. before a `return`, between setup and logic).

## Git

- Commit messages follow Conventional Commits: `type(scope): subject`. Scope is optional.
- Allowed types: `feat`, `fix`, `docs`, `refactor`, `chore`, `style`, `test`.
- Subject line is imperative mood ("add filter", not "added filter") and 72 characters or fewer.
- Never add a `Co-Authored-By` trailer to commits.
