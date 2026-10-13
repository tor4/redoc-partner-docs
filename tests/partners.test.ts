import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { OpenAPISpec, PartnerConfig } from "@/lib/types";

const root = process.cwd();
const HTTP_METHODS = ["get", "put", "post", "delete", "options", "head", "patch", "trace"];

const readJson = <T>(file: string) => JSON.parse(readFileSync(file, "utf8")) as T;

const partners = readdirSync(path.join(root, "partners"))
  .filter((file) => file.endsWith(".json"))
  .map((file) => ({
    slug: file.replace(/\.json$/, ""),
    config: readJson<PartnerConfig>(path.join(root, "partners", file)),
  }));

const specFile = (name: string) => path.join(root, "specs", `${name}.json`);

const collectOperations = (spec: OpenAPISpec) =>
  [spec.paths, spec.webhooks].flatMap((items) =>
    Object.values<OpenAPISpec>(items ?? {}).flatMap((item) =>
      HTTP_METHODS.filter((method) => item[method]).map((method) => item[method]),
    ),
  );

const isHttpsUrl = (value: string) => new URL(value).protocol === "https:";

describe("partner configs", () => {
  it("includes at least one partner", () => {
    expect(partners.length).toBeGreaterThan(0);
  });

  describe.each(partners)("$slug", ({ slug, config }) => {
    it("is named by a valid slug", () => {
      expect(slug).toMatch(/^[a-z0-9-]+$/);
    });

    it("references an existing spec", () => {
      expect(existsSync(specFile(config.spec))).toBe(true);
    });

    it("only includes tags that exist in the spec", () => {
      const spec = readJson<OpenAPISpec>(specFile(config.spec));
      const known = new Set<string>([
        ...(spec.tags ?? []).map((tag: { name: string }) => tag.name),
        ...collectOperations(spec).flatMap((op) => op.tags ?? []),
      ]);

      const unknown = (config.include?.tags ?? []).filter((tag) => !known.has(tag));

      expect(unknown).toEqual([]);
    });

    it("only excludes operationIds that exist in the spec", () => {
      const spec = readJson<OpenAPISpec>(specFile(config.spec));
      const known = new Set<string>(collectOperations(spec).map((op) => op.operationId));

      const unknown = (config.exclude?.operationIds ?? []).filter((id) => !known.has(id));

      expect(unknown).toEqual([]);
    });

    it("has absolute https servers", () => {
      for (const server of config.servers ?? []) {
        expect(isHttpsUrl(server), server).toBe(true);
      }
    });

    it("has an absolute https logo", () => {
      if (config.logo) expect(isHttpsUrl(config.logo), config.logo).toBe(true);
    });
  });
});
