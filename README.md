# redoc-partner-docs

Small demo: Next.js (App Router) + Redoc rendering a public OpenAPI spec (Swagger Petstore).

One codebase, one spec, many partner views.

- `partners/<slug>.json` — per-partner config: theme, logo, servers, Redoc options, which tags / operations to expose.
- `lib/filterSpec.ts` — builds the partner view of the shared spec at build time (tag filter, excluded operationIds, `x-internal`, servers override, unused components pruned).
- `app/[partner]/page.tsx` — `generateStaticParams` prerenders `/acme`, `/globex`; add a JSON file to add a partner.

Next: customization notes, performance comparison (client render vs prerender vs static HTML).

Note: Next 16 with `cacheComponents` treats file reads as uncached data, so loaders in `lib/loadPartner.ts` use `"use cache"`. In dev, open via `localhost` (127.0.0.1 blocks HMR).

```bash
npm install
npm run dev   # http://localhost:3000
```

Spec: `specs/petstore.json` (from https://petstore3.swagger.io/api/v3/openapi.json).
