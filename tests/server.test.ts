import { describe, expect, it } from "vitest";
import { createServer } from "../src/server.js";
import type { CrmService } from "../src/service.js";

interface RegisteredTool {
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
  };
}

describe("MCP tool registration", () => {
  it("registers read and write tools for all three activity entities", () => {
    const server = createServer({} as CrmService);
    const tools = (server as unknown as { _registeredTools: Record<string, RegisteredTool> })._registeredTools;

    expect(Object.keys(tools)).toHaveLength(28);
    for (const entity of ["meeting", "call", "task"]) {
      expect(tools[`search_${entity}s`]?.annotations?.readOnlyHint).toBe(true);
      expect(tools[`get_${entity}`]?.annotations?.readOnlyHint).toBe(true);
      expect(tools[`create_${entity}`]?.annotations).toMatchObject({
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
      });
      expect(tools[`update_${entity}`]?.annotations).toMatchObject({
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
      });
    }
  });
});
