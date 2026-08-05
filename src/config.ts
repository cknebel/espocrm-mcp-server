import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import type { PermissionsConfig } from "./types.js";

const entityPermissionsSchema = z.object({
  readableFields: z.array(z.string().min(1)).min(1),
  listFields: z.array(z.string().min(1)).min(1),
  filterableFields: z.array(z.string().min(1)),
  orderableFields: z.array(z.string().min(1)),
  primaryFilters: z.array(z.string().min(1)),
});

const permissionsSchema = z.object({
  maxResults: z.number().int().min(1).max(20),
  maxOffset: z.number().int().min(0).max(10_000),
  entities: z.object({
    Account: entityPermissionsSchema,
    Contact: entityPermissionsSchema,
    Opportunity: entityPermissionsSchema,
  }),
});

export interface AppConfig {
  baseUrl: string;
  apiKey: string;
  permissions: PermissionsConfig;
  auditLogPath: string;
}

function normalizeBaseUrl(input: string): string {
  const value = input.replace(/\/+$/, "");
  const url = new URL(value);
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error("ESPOCRM_URL must use HTTPS (except localhost). ");
  }
  return value.endsWith("/api/v1") ? value : `${value}/api/v1`;
}

export async function loadPermissions(path: string): Promise<PermissionsConfig> {
  const document = await readFile(path, "utf8");
  const result = permissionsSchema.parse(parse(document));

  for (const [entity, permissions] of Object.entries(result.entities)) {
    const readable = new Set(permissions.readableFields);
    const invalidListFields = permissions.listFields.filter((field) => !readable.has(field));
    if (invalidListFields.length > 0) {
      throw new Error(`${entity}.listFields contains non-readable fields: ${invalidListFields.join(", ")}`);
    }
  }

  return result;
}

export async function loadConfig(
  env: NodeJS.ProcessEnv = process.env,
  baseDirectory: string = process.cwd(),
): Promise<AppConfig> {
  const baseUrl = env.ESPOCRM_URL;
  const apiKey = env.ESPOCRM_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error("ESPOCRM_URL and ESPOCRM_API_KEY are required.");
  }

  const permissionsPath = resolve(baseDirectory, env.ESPOCRM_PERMISSIONS_FILE ?? "config/permissions.example.yaml");
  return {
    baseUrl: normalizeBaseUrl(baseUrl),
    apiKey,
    permissions: await loadPermissions(permissionsPath),
    auditLogPath: resolve(baseDirectory, env.ESPOCRM_AUDIT_LOG ?? "logs/audit.jsonl"),
  };
}
