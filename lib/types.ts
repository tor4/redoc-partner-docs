// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OpenAPISpec = Record<string, any>;

export interface PartnerConfig {
  name: string;
  spec: string;
  logo?: string;
  servers?: string[];
  include?: { tags?: string[] };
  exclude?: { operationIds?: string[] };
  options?: Record<string, unknown>;
  theme?: Record<string, unknown>;
}
