import { describe, expect, it } from "vitest";
import { filterSpec } from "./filterSpec";
import partnerFixture from "./__fixtures__/partner.json";
import specFixture from "./__fixtures__/spec.json";
import type { PartnerConfig } from "./types";

const run = (overrides: Partial<PartnerConfig> = {}) =>
  filterSpec(structuredClone(specFixture), { ...partnerFixture, ...overrides });

describe("filterSpec", () => {
  describe("operation filtering", () => {
    it("drops operations without an allowed tag", () => {
      const result = run();

      expect(result.paths).not.toHaveProperty("/admin/users");
      expect(result.paths).not.toHaveProperty("/invoices");
    });

    it("strips non-allowed tags from kept operations", () => {
      const result = run();

      expect(result.paths["/pets"].post.tags).toEqual(["pets"]);
    });

    it("keeps every operation when include.tags is empty", () => {
      const result = run({ include: { tags: [] }, exclude: undefined });

      expect(Object.keys(result.paths).sort()).toEqual([
        "/admin/users",
        "/invoices",
        "/pets",
        "/pets/{petId}",
      ]);
      expect(result.paths["/pets"].post.tags).toEqual(["pets", "admin"]);
    });

    it("keeps every operation when include is missing", () => {
      const result = run({ include: undefined, exclude: undefined });

      expect(Object.keys(result.paths).sort()).toEqual([
        "/admin/users",
        "/invoices",
        "/pets",
        "/pets/{petId}",
      ]);
    });

    it("drops x-internal operations", () => {
      const result = run({ include: undefined });

      expect(result.paths).not.toHaveProperty("/internal/stats");
    });

    it("drops excluded operationIds", () => {
      const result = run();

      expect(result.paths["/pets/{petId}"]).toHaveProperty("get");
      expect(result.paths["/pets/{petId}"]).not.toHaveProperty("delete");
    });

    it("removes a route once none of its methods remain", () => {
      const result = run({ exclude: { operationIds: ["getPet", "deletePet"] } });

      expect(result.paths).not.toHaveProperty("/pets/{petId}");
    });

    it("filters webhooks like paths", () => {
      const result = run();

      expect(result.webhooks).toHaveProperty("petAdded");
      expect(result.webhooks).not.toHaveProperty("adminAlert");
    });

    it("returns empty paths and components when no tag matches", () => {
      const result = run({ include: { tags: ["nope"] } });

      expect(result.paths).toEqual({});
      expect(result.components.schemas).toEqual({});
    });
  });

  describe("tags", () => {
    it("keeps only allowed entries in spec.tags", () => {
      const result = run();

      expect(result.tags).toEqual([{ name: "pets" }]);
    });

    it("filters x-tagGroups and drops empty groups", () => {
      const result = run();

      expect(result["x-tagGroups"]).toEqual([{ name: "Core", tags: ["pets"] }]);
    });
  });

  describe("metadata", () => {
    it("overrides servers", () => {
      const result = run();

      expect(result.servers).toEqual([{ url: "https://partner.example/v1" }]);
    });

    it("keeps the original servers when the partner defines none", () => {
      const result = run({ servers: undefined });

      expect(result.servers).toEqual([{ url: "https://original.example" }]);
    });

    it("injects x-logo", () => {
      const result = run();

      expect(result.info["x-logo"]).toEqual({
        url: "https://example.com/logo.png",
        altText: "Fixture Partner",
      });
    });

    it("prefixes the title with the partner name", () => {
      const result = run();

      expect(result.info.title).toBe("Fixture Partner — Fixture API");
    });

    it("does not prefix a title that already starts with the partner name", () => {
      const spec = structuredClone(specFixture);
      spec.info.title = "Fixture Partner Guide";

      const result = filterSpec(spec, partnerFixture);

      expect(result.info.title).toBe("Fixture Partner Guide");
    });

    it("prefixes a title that only starts with the partner name as part of a longer word", () => {
      const spec = structuredClone(specFixture);
      spec.info.title = "Acmeville API";

      const result = filterSpec(spec, { ...partnerFixture, name: "Acme" });

      expect(result.info.title).toBe("Acme — Acmeville API");
    });

    it("does not double-prefix a name ending in a non-word character", () => {
      const spec = structuredClone(specFixture);
      spec.info.title = "Acme (EU) API";

      const result = filterSpec(spec, { ...partnerFixture, name: "Acme (EU)" });

      expect(result.info.title).toBe("Acme (EU) API");
    });

    it("treats regex characters in the partner name literally", () => {
      const spec = structuredClone(specFixture);
      spec.info.title = "axb API";

      const result = filterSpec(spec, { ...partnerFixture, name: "a.b*" });

      expect(result.info.title).toBe("a.b* — axb API");
    });
  });

  describe("component pruning", () => {
    it("removes schemas no remaining operation references", () => {
      const schemas = run().components.schemas;

      expect(schemas).not.toHaveProperty("User");
      expect(schemas).not.toHaveProperty("Invoice");
      expect(schemas).not.toHaveProperty("StatsOnly");
      expect(schemas).not.toHaveProperty("Unused");
    });

    it("keeps schemas reachable through transitive refs", () => {
      const schemas = run().components.schemas;

      expect(schemas).toHaveProperty("Category");
      expect(schemas).toHaveProperty("Shape");
    });

    it("terminates and keeps both sides of a $ref cycle", () => {
      const schemas = run().components.schemas;

      expect(schemas).toHaveProperty("Pet");
      expect(schemas).toHaveProperty("Category");
    });

    it("resolves percent-encoded refs", () => {
      const schemas = run().components.schemas;

      expect(schemas).toHaveProperty("Pet Owner");
    });

    it("counts discriminator mapping values as references", () => {
      const schemas = run().components.schemas;

      expect(schemas).toHaveProperty("Circle");
    });

    it("never prunes securitySchemes", () => {
      const result = run({ include: { tags: ["nope"] } });

      expect(result.components.securitySchemes).toHaveProperty("api_key");
    });

    it("keeps schemas used only by a kept webhook", () => {
      const schemas = run().components.schemas;

      expect(schemas).toHaveProperty("PetEvent");
      expect(schemas).not.toHaveProperty("AdminEvent");
    });

    it("drops schemas used only by hidden operations", () => {
      const schemas = run({ include: { tags: ["billing"] }, exclude: undefined }).components
        .schemas;

      expect(schemas).toHaveProperty("Invoice");
      expect(schemas).not.toHaveProperty("Pet");
      expect(schemas).not.toHaveProperty("Category");
      expect(schemas).not.toHaveProperty("Circle");
    });
  });

  describe("robustness", () => {
    it("handles a spec with no info, paths or components", () => {
      const spec = { openapi: "3.0.4", webhooks: { petAdded: specFixture.webhooks.petAdded } };

      const result = filterSpec(spec, partnerFixture);

      expect(result.info.title).toBe("Fixture Partner — API");
      expect(result.webhooks).toHaveProperty("petAdded");
    });

    it("does not mutate the input spec", () => {
      const spec = structuredClone(specFixture);

      filterSpec(spec, partnerFixture);

      expect(spec).toEqual(specFixture);
    });
  });
});
