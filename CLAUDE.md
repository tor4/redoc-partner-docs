@AGENTS.md

## Commands

```bash
npm run dev     # http://localhost:3000 (use `localhost`, not 127.0.0.1, which blocks HMR)
npm run build
npm run lint    # eslint
```

There is no test suite.

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

## Code style

- Separate logical blocks with empty lines for readability: between imports and code, between functions, and between distinct steps inside a function (e.g. before a `return`, between setup and logic).

## Git

- Commit messages follow Conventional Commits: `type(scope): subject`. Scope is optional.
- Allowed types: `feat`, `fix`, `docs`, `refactor`, `chore`, `style`, `test`.
- Subject line is imperative mood ("add filter", not "added filter") and 72 characters or fewer.
- Never add a `Co-Authored-By` trailer to commits.
