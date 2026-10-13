import { expect, test, type Page } from "@playwright/test";

const operation = (page: Page, operationId: string) =>
  page.locator(`[id="operation/${operationId}"]`);

test.describe("acme", () => {
  test("renders its allowed operations", async ({ page }) => {
    const response = await page.goto("/acme");

    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle("Acme Pets API Docs");
    await expect(operation(page, "getPetById")).toBeAttached();
    await expect(operation(page, "getInventory")).toBeAttached();
  });

  test("hides user operations", async ({ page }) => {
    await page.goto("/acme");
    await expect(operation(page, "getPetById")).toBeAttached();

    await expect(operation(page, "createUser")).toHaveCount(0);
  });

  test("raw HTML does not contain user operations", async ({ request }) => {
    const body = await (await request.get("/acme")).text();

    expect(body).not.toContain("createUser");
    expect(body).not.toContain("loginUser");
  });
});

test.describe("globex", () => {
  test("renders its allowed operations", async ({ page }) => {
    const response = await page.goto("/globex");

    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle("Globex Partner API API Docs");
    await expect(operation(page, "getPetById")).toBeAttached();
    await expect(operation(page, "getUserByName")).toBeAttached();
  });

  test("hides excluded and untagged operations", async ({ page }) => {
    await page.goto("/globex");
    await expect(operation(page, "getPetById")).toBeAttached();

    await expect(operation(page, "deletePet")).toHaveCount(0);
    await expect(operation(page, "deleteUser")).toHaveCount(0);
    await expect(operation(page, "getInventory")).toHaveCount(0);
  });

  test("raw HTML does not contain hidden operations", async ({ request }) => {
    const body = await (await request.get("/globex")).text();

    expect(body).not.toContain("deletePet");
    expect(body).not.toContain("deleteUser");
    expect(body).not.toContain("getInventory");
  });
});

test("each partner page only carries its own servers", async ({ request }) => {
  const acme = await (await request.get("/acme")).text();
  const globex = await (await request.get("/globex")).text();

  expect(acme).toContain("api.acme.example");
  expect(acme).not.toContain("partners.globex.example");
  expect(globex).toContain("partners.globex.example");
  expect(globex).not.toContain("api.acme.example");
});

// The status can be 200 or 404 depending on cache state (notFound() runs after streaming
// starts under cacheComponents), so assert the not-found page and the noindex tag instead.
// Slug case rules are unit-tested: a case-insensitive filesystem makes /ACME OS-dependent here.
test("shows the not-found page for an unknown slug", async ({ page }) => {
  await page.goto("/does-not-exist");

  await expect(page.getByText("This page could not be found")).toBeVisible();
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
  await expect(page.locator('[id^="operation/"]')).toHaveCount(0);
});

test("home page links to every partner", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: "Acme Pets" })).toHaveAttribute("href", "/acme");
  await expect(page.getByRole("link", { name: "Globex Partner API" })).toHaveAttribute(
    "href",
    "/globex",
  );
});
