#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "node:process";
import { createConfiguredServer } from "./runtime.js";

async function main(): Promise<void> {
  const projectDirectory = fileURLToPath(new URL("../", import.meta.url));
  const envPath = fileURLToPath(new URL("../.env", import.meta.url));
  if (existsSync(envPath)) loadEnvFile(envPath);
  const server = await createConfiguredServer(projectDirectory);
  await server.connect(new StdioServerTransport());
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown startup error.";
  process.stderr.write(`EspoCRM MCP server could not start: ${message}\n`);
  process.exitCode = 1;
});
