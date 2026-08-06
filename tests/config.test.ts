import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadPermissions } from "../src/config.js";

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
