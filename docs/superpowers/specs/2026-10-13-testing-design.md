# Testing strategy and setup

Date: 2026-10-13

## Goal

Catch mistakes before partners see them. The main risks are a hidden endpoint or schema leaking into a partner's docs, a broken partner config, and a page that stops rendering.

The repo has no tests today. This spec adds a test suite, coverage reporting, a component-testing setup for the future, and CI.

## Decisions

- Solo-maintained project, so the setup stays minimal.
- Tests run locally and in CI (GitHub Actions). No pre-commit hook.
- Unit tests use hand-written fixtures. Config-validity and E2E tests use the real `partners/` and `specs/` files.
- Coverage is reported without thresholds.
- Component testing is wired up and proven by one sample test. More component tests come later.

## Tooling

- **Vitest** for unit, config and component tests.
- **Playwright** (Chromium only) for end-to-end tests. The Next.js docs recommend E2E over unit tests for `async` Server Components, which covers `app/page.tsx` and `app/[partner]/page.tsx`.
- **@vitest/coverage-v8** for coverage.
- Dev dependencies: `vitest`, `@vitest/coverage-v8`, `vite-tsconfig-paths` (for the `@/*` alias), `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/dom`, `@playwright/test`.

## Layout

```
lib/
  filterSpec.ts
  filterSpec.test.ts
  loadPartner.ts
  loadPartner.test.ts
  __fixtures__/
    spec.json
    partner.json
components/
  RedocView.tsx
  RedocView.test.tsx
tests/
  partners.test.ts
  e2e/
    partners.spec.ts
vitest.config.ts
playwright.config.ts
.github/workflows/ci.yml
```

Unit and component tests sit next to the code they cover. `tests/` holds only tests that do not belong to one file.

## Vitest projects

Two projects in `vitest.config.ts`:

- **unit**: Node environment, runs `*.test.ts` (including `tests/partners.test.ts`).
- **component**: `jsdom` environment with the React plugin, runs `*.test.tsx`.

Both use `vite-tsconfig-paths`.

## What each layer checks

### `lib/filterSpec.test.ts` (fixtures)

- Operations without an allowed tag are dropped; kept operations lose non-allowed tags.
- A missing or empty `include.tags` keeps everything.
- `x-internal` operations and excluded `operationId`s are dropped.
- A route with no remaining methods is removed.
- Webhooks follow the same rules.
- `spec.tags` and `x-tagGroups` are filtered; empty groups are dropped.
- `servers` are overridden, `x-logo` is injected, and the title gets the partner name prefix unless it already starts with it.
- Components not reachable by `$ref` are pruned; transitive refs are kept; percent-encoded refs resolve; `discriminator` mapping values count as references; `securitySchemes` are never pruned.
- The input spec is not mutated.

### `lib/loadPartner.test.ts` (filesystem mocked)

- Invalid slugs and missing files return `null`.
- Malformed JSON throws "Invalid partner config".
- `loadSpec` rejects names such as `../x`.
- `listPartnerSlugs` ignores non-JSON files and invalid names.

### `tests/partners.test.ts` (real files)

For every `partners/*.json`, discovered automatically so new partners are covered:

- The referenced `spec` file exists.
- Every `include.tags` entry exists in that spec.
- Every `exclude.operationIds` entry matches a real operation.
- `servers` and `logo` are well-formed.

### `components/RedocView.test.tsx` (sample component test)

With Redoc mocked, render `RedocView` with both `options.theme` and `theme`, and assert that the mocked `RedocStandalone` receives the merged theme with the partner theme winning. This proves the jsdom project, the React plugin, Testing Library and the `@/*` alias.

### `tests/e2e/partners.spec.ts` (Playwright, production build)

- `/acme` and `/globex` return 200, the title is `<name> API Docs`, and Redoc renders.
- Each page shows an operation the partner may see and does not show one it may not. The exact operations are chosen from the real configs when the tests are written.
- An unknown slug returns 404.
- The home page links to every partner.

## Naming conventions

- Files: `<name>.test.ts` or `<name>.test.tsx` next to the source; Playwright files use `.spec.ts`.
- One top-level `describe` per module or component, named after it. Nested `describe`s group by behavior area.
- Test titles are plain sentences that start with a verb and state the behavior. No "should", no function names. Example: `it("drops operations without an allowed tag")`.
- Data-driven tests use `it.each`, so each partner appears as its own line.
- E2E titles read as user-visible outcomes.
- Arrange, act and assert are separated by blank lines, per CLAUDE.md.

## Test-writing guidelines

### Before writing

- Check existing tests first. Search for tests of the same module or behavior, extend or fix them where they fit, and add a new test only for behavior nothing covers yet. Do not duplicate coverage.

### Edge cases

- For each function, test the happy path first, then empty, missing and `null` inputs, boundaries, and malformed data. Examples: an empty `include.tags`, a route with no methods left, a `$ref` that points nowhere.
- Cover every branch. If a line of logic exists, some test should fail when it is removed.

### Security

The main risk is leaking data to the wrong partner.

- Input validation: `loadPartner` and `loadSpec` reject path traversal (`../x`, absolute paths, encoded variants) and invalid slugs.
- Regex safety: partner names containing regex characters (`Acme (EU)`, `a.b*`) do not break or hijack the title check in `filterSpec`.
- No leakage in the page source: E2E tests check the raw HTML and embedded data, not only the visible UI. A hidden operation must not appear anywhere in the response.
- Hidden means gone: `x-internal` and excluded operations never appear, and schemas used only by hidden operations are pruned.

### General rules

- Test behavior, not implementation. Assert on results, not on how the code got there.
- One behavior per test, so a failing title says exactly what broke.
- Tests are deterministic and independent: no network, no clock, no shared mutable state. Clone fixtures per test with `structuredClone`.
- Mock only what the project does not own (the filesystem, Redoc), never its own functions.
- For every bug fix, write a failing regression test first.
- Confirm a new test can fail: briefly break the code or remove a line and see it go red.

## Coverage

- `npm run test:coverage` prints a terminal summary and writes an HTML report and `lcov`. `coverage/` is gitignored.
- It measures `lib/**` only. Pages are covered by E2E, which does not feed this report, so including `app/**` would show a misleading 0%. Widen it when component tests exist.
- No thresholds. Coverage never fails the build.

## Scripts

- `npm test`: Vitest, once.
- `npm run test:watch`: Vitest in watch mode.
- `npm run test:coverage`: Vitest with coverage.
- `npm run test:e2e`: Playwright.

## Playwright config

- Chromium only, `baseURL` `http://localhost:3100`.
- `webServer` runs `npm run build && npm run start` on port 3100, so it does not clash with `npm run dev` on 3000. It uses `localhost`, not `127.0.0.1`.
- Reuses an existing server locally; retries failed tests twice in CI; writes an HTML report.
- `test-results/` and `playwright-report/` are gitignored.

## CI

`.github/workflows/ci.yml`, on pushes to `main` and on every pull request:

1. Checkout, set up Node, `npm ci`.
2. `npm run lint`.
3. `npm run test:coverage`, then upload the HTML coverage report as an artifact.
4. Install Chromium for Playwright.
5. `npm run test:e2e`. It builds the app (which also type-checks), so there is no separate build step.
6. Upload the Playwright report as an artifact if the run fails.

## Documentation

`CLAUDE.md` gets a "Testing" section with:

- the commands,
- a rule that new logic in `lib/` ships with a colocated test,
- how to add a component test (`Foo.test.tsx` next to the component),
- a 6 to 8 line summary of the test-writing guidelines above, starting with "check existing tests before writing a new one".

## Out of scope

Coverage thresholds, snapshot tests, a pre-commit hook, and component tests beyond the one sample.

## Open items to verify during implementation

- The `"use cache"` directive is harmless under plain Vitest.
- The exact Vitest projects configuration for the installed version.
- The Node version for CI, matched to the project.
- The specific operations to assert in the E2E tests, taken from the real partner configs.
