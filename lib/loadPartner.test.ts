import { promises as fs } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listPartnerSlugs, loadPartner, loadSpec } from "./loadPartner";

vi.mock("node:fs", () => ({
  promises: { readdir: vi.fn(), readFile: vi.fn() },
}));

const readFile = vi.mocked(fs.readFile);
const readdir = vi.mocked(fs.readdir);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("loadPartner", () => {
  it("returns the parsed config for a valid slug", async () => {
    readFile.mockResolvedValue(JSON.stringify({ name: "Acme", spec: "petstore" }));

    const result = await loadPartner("acme");

    expect(result).toEqual({ name: "Acme", spec: "petstore" });
    expect(String(readFile.mock.calls[0][0])).toMatch(/partners[\\/]acme\.json$/);
  });

  it("returns null when the file does not exist", async () => {
    readFile.mockRejectedValue(Object.assign(new Error("missing"), { code: "ENOENT" }));

    const result = await loadPartner("acme");

    expect(result).toBeNull();
  });

  it("throws 'Invalid partner config' on malformed JSON", async () => {
    readFile.mockResolvedValue("{ not json");

    await expect(loadPartner("acme")).rejects.toThrow(/Invalid partner config "acme"/);
  });

  it.each(["../partners/acme", "acme/../globex", "ACME", "", "acme.json"])(
    "returns null for the slug %j without reading a file",
    async (slug) => {
      const result = await loadPartner(slug);

      expect(result).toBeNull();
      expect(readFile).not.toHaveBeenCalled();
    },
  );
});

describe("loadSpec", () => {
  it("returns the parsed spec", async () => {
    readFile.mockResolvedValue(JSON.stringify({ openapi: "3.0.4" }));

    const result = await loadSpec("petstore");

    expect(result).toEqual({ openapi: "3.0.4" });
    expect(String(readFile.mock.calls[0][0])).toMatch(/specs[\\/]petstore\.json$/);
  });

  it.each(["../x", "..", "a/b", "/etc/passwd", "%2e%2e"])(
    "rejects the name %j without reading a file",
    async (name) => {
      await expect(loadSpec(name)).rejects.toThrow(/Invalid spec name/);

      expect(readFile).not.toHaveBeenCalled();
    },
  );

  it("wraps read errors as 'Cannot load spec'", async () => {
    readFile.mockRejectedValue(new Error("disk on fire"));

    await expect(loadSpec("petstore")).rejects.toThrow(/Cannot load spec "petstore": disk on fire/);
  });
});

describe("listPartnerSlugs", () => {
  it("ignores non-JSON files and invalid names", async () => {
    readdir.mockResolvedValue(["acme.json", "notes.txt", "Bad_Name.json", "globex.json"] as never);

    const result = await listPartnerSlugs();

    expect(result).toEqual(["acme", "globex"]);
  });
});
