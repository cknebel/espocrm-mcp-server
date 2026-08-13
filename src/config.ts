import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import type { PermissionsConfig } from "./types.js";

const entityPermissionsSchema = z.object({
  readableFields: z.array(z.string().min(1)).min(1),
  listFields: z.array(z.string().min(1)).min(1),
  writableFields: z.array(z.string().min(1)),
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
    Email: entityPermissionsSchema,
    Meeting: entityPermissionsSchema,
    Call: entityPermissionsSchema,
    Task: entityPermissionsSchema,
  }),
});

export interface AppConfig {
  baseUrl: string;
  apiKey: string;
  permissions: PermissionsConfig;
  auditLogPath: string;
}

export interface HttpConfig {
  host: string;
  port: number;
  path: string;
  allowedHosts: string[];
  allowedOrigins: string[];
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
    const invalidWritableFields = permissions.writableFields.filter((field) => !readable.has(field));
    if (invalidWritableFields.length > 0) {
      throw new Error(`${entity}.writableFields contains non-readable fields: ${invalidWritableFields.join(", ")}`);
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

function parsePort(value: string | undefined): number {
  const port = Number(value ?? "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("MCP_HTTP_PORT must be an integer between 1 and 65535.");
  }
  return port;
}

function parsePath(value: string | undefined): string {
  const path = value?.trim() || "/mcp";
  if (!path.startsWith("/")) throw new Error("MCP_HTTP_PATH must start with '/'.");
  return path;
}

function parseList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function loadHttpConfig(env: NodeJS.ProcessEnv = process.env): HttpConfig {
  const host = env.MCP_HTTP_HOST?.trim() || "127.0.0.1";
  const defaultAllowedHosts = host === "0.0.0.0" || host === "::" ? [] : [host];

  return {
    host,
    port: parsePort(env.MCP_HTTP_PORT),
    path: parsePath(env.MCP_HTTP_PATH),
    allowedHosts: parseList(env.MCP_HTTP_ALLOWED_HOSTS).length > 0
      ? parseList(env.MCP_HTTP_ALLOWED_HOSTS)
      : defaultAllowedHosts,
    allowedOrigins: parseList(env.MCP_HTTP_ALLOWED_ORIGINS),
  };
}
