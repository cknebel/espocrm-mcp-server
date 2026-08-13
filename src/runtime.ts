import { fileURLToPath } from "node:url";
import { AuditLogger } from "./audit.js";
import { loadConfig } from "./config.js";
import { EspoClient } from "./espocrm-client.js";
import { createServer } from "./server.js";
import { CrmService } from "./service.js";

export function defaultProjectDirectory(): string {
  return fileURLToPath(new URL("../", import.meta.url));
}

export async function createConfiguredServer(projectDirectory: string = defaultProjectDirectory()) {
  const config = await loadConfig(process.env, projectDirectory);
  const client = new EspoClient({ baseUrl: config.baseUrl, apiKey: config.apiKey });
  const audit = new AuditLogger(config.auditLogPath);
  const service = new CrmService(client, config.permissions, audit);
  return createServer(service);
}
