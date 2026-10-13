import { promises as fs } from "node:fs";
import path from "node:path";
import type { OpenAPISpec, PartnerConfig } from "./types";

const root = process.cwd();
const SLUG_RE = /^[a-z0-9-]+$/;

export async function listPartnerSlugs(): Promise<string[]> {
  "use cache";

  const files = await fs.readdir(path.join(root, "partners"));

  return files
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .filter((slug) => SLUG_RE.test(slug));
}

export async function loadPartner(slug: string): Promise<PartnerConfig | null> {
  "use cache";

  if (!SLUG_RE.test(slug)) return null;

  try {
    const raw = await fs.readFile(path.join(root, "partners", `${slug}.json`), "utf8");

    return JSON.parse(raw) as PartnerConfig;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;

    throw new Error(`Invalid partner config "${slug}": ${(err as Error).message}`);
  }
}

export async function loadSpec(name: string): Promise<OpenAPISpec> {
  "use cache";

  if (!/^[\w.-]+$/.test(name) || name.includes("..")) throw new Error(`Invalid spec name "${name}"`);

  try {
    const raw = await fs.readFile(path.join(root, "specs", `${name}.json`), "utf8");

    return JSON.parse(raw) as OpenAPISpec;
  } catch (err) {
    throw new Error(`Cannot load spec "${name}": ${(err as Error).message}`);
  }
}
