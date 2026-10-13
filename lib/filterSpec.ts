import type { OpenAPISpec, PartnerConfig } from "./types";

const HTTP_METHODS = ["get", "put", "post", "delete", "options", "head", "patch", "trace"];

/**
 * Builds a partner-specific view of a shared OpenAPI spec:
 * keeps only allowed tags, drops excluded/x-internal operations,
 * overrides servers and prunes components that are no longer referenced.
 */
export function filterSpec(source: OpenAPISpec, partner: PartnerConfig): OpenAPISpec {
  const spec: OpenAPISpec = structuredClone(source);
  const allowedTags = partner.include?.tags?.length ? new Set(partner.include.tags) : null;
  const excludedIds = new Set(partner.exclude?.operationIds ?? []);

  const filterOperations = (items: OpenAPISpec | undefined) => {
    if (!items) return;

    for (const [route, item] of Object.entries<OpenAPISpec>(items)) {
      for (const method of HTTP_METHODS) {
        const op = item[method];
        if (!op) continue;

        const tags: string[] = op.tags ?? [];
        const hiddenByTag = allowedTags && !tags.some((t) => allowedTags.has(t));

        if (hiddenByTag || op["x-internal"] || excludedIds.has(op.operationId)) {
          delete item[method];
        } else if (allowedTags) {
          // Redoc groups by operation tags, so strip the ones the partner may not see
          op.tags = tags.filter((t) => allowedTags.has(t));
        }
      }

      if (!HTTP_METHODS.some((m) => item[m])) delete items[route];
    }
  };

  filterOperations(spec.paths);
  filterOperations(spec.webhooks);

  if (allowedTags && spec.tags) {
    spec.tags = spec.tags.filter((t: { name: string }) => allowedTags.has(t.name));
  }

  if (allowedTags && spec["x-tagGroups"]) {
    spec["x-tagGroups"] = spec["x-tagGroups"]
      .map((g: { tags: string[] }) => ({ ...g, tags: g.tags.filter((t) => allowedTags.has(t)) }))
      .filter((g: { tags: string[] }) => g.tags.length > 0);
  }

  if (partner.servers) spec.servers = partner.servers.map((url) => ({ url }));

  spec.info ??= { title: "API", version: "1.0.0" };
  if (partner.logo) spec.info["x-logo"] = { url: partner.logo, altText: partner.name };

  if (!new RegExp(`^${escapeRegExp(partner.name)}\\b`, "i").test(spec.info.title ?? "")) {
    spec.info.title = `${partner.name} — ${spec.info.title ?? "API"}`;
  }

  pruneComponents(spec);

  return spec;
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const decodePointer = (s: string) => {
  let decoded = s;

  try {
    decoded = decodeURIComponent(s);
  } catch {
    // stray "%": use the raw segment
  }

  return decoded.replace(/~1/g, "/").replace(/~0/g, "~");
};

/** Removes components that are not reachable from the remaining paths and webhooks. */
function pruneComponents(spec: OpenAPISpec) {
  if (!spec.components) return;

  const used = new Set<string>();
  const queue: unknown[] = [spec.paths, spec.webhooks];

  const visit = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== "object") return;

    for (const value of Object.values(node)) {
      // any "#/components/..." string counts: $ref, discriminator mapping values, operationRef
      if (typeof value === "string" && value.startsWith("#/components/")) {
        const [, , section, name] = value.split("/").map(decodePointer);
        const ref = `#/components/${section}/${name}`;

        if (!used.has(ref)) {
          used.add(ref);
          queue.push(spec.components[section]?.[name]);
        }
      } else {
        visit(value);
      }
    }
  };

  while (queue.length) visit(queue.pop());

  for (const [section, items] of Object.entries<OpenAPISpec>(spec.components)) {
    // securitySchemes are referenced by name from `security`, not via $ref
    if (section === "securitySchemes") continue;

    for (const name of Object.keys(items)) {
      if (!used.has(`#/components/${section}/${name}`)) delete items[name];
    }
  }
}
