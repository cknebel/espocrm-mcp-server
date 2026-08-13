import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadHttpConfig, loadPermissions } from "../src/config.js";

describe("permissions configuration", () => {
  it("loads the checked-in allowlist", async () => {
    const config = await loadPermissions(resolve("config/permissions.example.yaml"));
    expect(config.maxResults).toBe(20);
    expect(config.entities.Account.readableFields).toContain("cEnrichment");
    expect(config.entities.Contact.readableFields).toContain("cRolle");
    expect(config.entities.Contact.readableFields).toContain("cSektor");
    expect(config.entities.Opportunity.readableFields).not.toContain("description");
    expect(config.entities.Email.readableFields).toContain("bodyPlain");
    expect(config.entities.Email.readableFields).not.toContain("messageId");
    expect(config.entities.Meeting.writableFields).toContain("dateStart");
    expect(config.entities.Call.writableFields).toContain("direction");
    expect(config.entities.Task.writableFields).toContain("priority");
    expect(config.entities.Account.writableFields).toEqual([]);
  });
});

describe("HTTP transport configuration", () => {
  it("uses a localhost-only default endpoint", () => {
    expect(loadHttpConfig({})).toEqual({
      host: "127.0.0.1",
      port: 3000,
      path: "/mcp",
      bearerToken: undefined,
      allowedHosts: ["127.0.0.1"],
      allowedOrigins: [],
    });
  });

  it("parses explicit host, port, path, bearer token and allowlists", () => {
    expect(loadHttpConfig({
      MCP_HTTP_HOST: "0.0.0.0",
      MCP_HTTP_PORT: "3010",
      MCP_HTTP_PATH: "/crm-mcp",
      MCP_HTTP_BEARER_TOKEN: "secret",
      MCP_HTTP_ALLOWED_HOSTS: "crm.example.de, 127.0.0.1",
      MCP_HTTP_ALLOWED_ORIGINS: "https://chatgpt.com, https://claude.ai",
    })).toEqual({
      host: "0.0.0.0",
      port: 3010,
      path: "/crm-mcp",
      bearerToken: "secret",
      allowedHosts: ["crm.example.de", "127.0.0.1"],
      allowedOrigins: ["https://chatgpt.com", "https://claude.ai"],
    });
  });

  it("rejects invalid HTTP port and path values", () => {
    expect(() => loadHttpConfig({ MCP_HTTP_PORT: "0" })).toThrow("MCP_HTTP_PORT");
    expect(() => loadHttpConfig({ MCP_HTTP_PATH: "mcp" })).toThrow("MCP_HTTP_PATH");
  });
});
