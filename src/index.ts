#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "node:process";
import { AuditLogger } from "./audit.js";
import { loadConfig } from "./config.js";
import { EspoClient } from "./espocrm-client.js";
import { createServer } from "./server.js";
import { CrmService } from "./service.js";

async function main(): Promise<void> {
  const projectDirectory = fileURLToPath(new URL("../", import.meta.url));
  const envPath = fileURLToPath(new URL("../.env", import.meta.url));
  if (existsSync(envPath)) loadEnvFile(envPath);
  const config = await loadConfig(process.env, projectDirectory);
  const client = new EspoClient({ baseUrl: config.baseUrl, apiKey: config.apiKey });
  const audit = new AuditLogger(config.auditLogPath);
  const service = new CrmService(client, config.permissions, audit);
  const server = createServer(service);
  await server.connect(new StdioServerTransport());
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown startup error.";
  process.stderr.write(`EspoCRM MCP server could not start: ${message}\n`);
  process.exitCode = 1;
});
