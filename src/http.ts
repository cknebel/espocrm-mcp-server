#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { loadHttpConfig, type HttpConfig } from "./config.js";
import { createConfiguredServer } from "./runtime.js";

const MAX_BODY_BYTES = 1_000_000;

function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function methodNotAllowed(res: ServerResponse): void {
  res.writeHead(405, { Allow: "GET, POST, DELETE", "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Method not allowed" }));
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > MAX_BODY_BYTES) throw new Error("Request body is too large.");
    chunks.push(buffer);
  }
  if (chunks.length === 0) return undefined;
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function isMcpPath(req: IncomingMessage, config: HttpConfig): boolean {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  return url.pathname === config.path;
}

async function main(): Promise<void> {
  const projectDirectory = fileURLToPath(new URL("../", import.meta.url));
  const envPath = fileURLToPath(new URL("../.env", import.meta.url));
  if (existsSync(envPath)) loadEnvFile(envPath);

  const config = loadHttpConfig(process.env);
  const transports = new Map<string, StreamableHTTPServerTransport>();

  const httpServer = createHttpServer(async (req, res) => {
    try {
      if (req.url === "/healthz") {
        sendJson(res, 200, { ok: true });
        return;
      }
      if (!isMcpPath(req, config)) {
        sendJson(res, 404, { error: "Not found" });
        return;
      }
      if (req.method !== "GET" && req.method !== "POST" && req.method !== "DELETE") {
        methodNotAllowed(res);
        return;
      }

      const sessionId = req.headers["mcp-session-id"];
      const existingSessionId = Array.isArray(sessionId) ? sessionId[0] : sessionId;
      let transport = existingSessionId ? transports.get(existingSessionId) : undefined;
      let body: unknown;

      if (req.method === "POST") {
        body = await readJsonBody(req);
        if (!transport && isInitializeRequest(body)) {
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            enableDnsRebindingProtection: true,
            allowedHosts: config.allowedHosts,
            allowedOrigins: config.allowedOrigins,
            onsessioninitialized: (newSessionId) => {
              transports.set(newSessionId, transport as StreamableHTTPServerTransport);
            },
          });

          transport.onclose = () => {
            if (transport?.sessionId) transports.delete(transport.sessionId);
          };

          const mcpServer = await createConfiguredServer(projectDirectory);
          await mcpServer.connect(transport as Parameters<typeof mcpServer.connect>[0]);
        }
      }

      if (!transport) {
        sendJson(res, 400, {
          jsonrpc: "2.0",
          error: { code: -32000, message: "Bad Request: No valid MCP session." },
          id: null,
        });
        return;
      }

      await transport.handleRequest(req, res, body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected HTTP server error.";
      if (!res.headersSent) {
        sendJson(res, 500, {
          jsonrpc: "2.0",
          error: { code: -32603, message },
          id: null,
        });
      }
    }
  });

  httpServer.listen(config.port, config.host, () => {
    process.stderr.write(`EspoCRM MCP HTTP server listening on http://${config.host}:${config.port}${config.path}\n`);
  });

  const shutdown = async () => {
    httpServer.close();
    await Promise.all([...transports.values()].map((transport) => transport.close()));
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown startup error.";
  process.stderr.write(`EspoCRM MCP HTTP server could not start: ${message}\n`);
  process.exitCode = 1;
});
