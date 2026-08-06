import { describe, expect, it } from "vitest";
import { projectRecord, secureListOptions, secureWriteData, validateId } from "../src/security.js";
import type { PermissionsConfig } from "../src/types.js";

const entity = {
  readableFields: ["id", "name"],
  listFields: ["id", "name"],
  writableFields: ["name"],
  filterableFields: ["name"],
  orderableFields: ["name"],
  primaryFilters: ["open"],
};

const config: PermissionsConfig = {
  maxResults: 20,
  maxOffset: 1000,
  entities: { Account: entity, Contact: entity, Opportunity: entity, Email: entity, Meeting: entity, Call: entity, Task: entity },
};

describe("field projection", () => {
  it("removes every field not explicitly allowed", () => {
    expect(projectRecord({ id: "1", name: "Acme", description: "secret", emailAddressData: ["x"] }, ["id", "name"]))
      .toEqual({ id: "1", name: "Acme" });
  });
});

describe("list security", () => {
  it("caps limits and offsets", () => {
    expect(secureListOptions("Account", { limit: 200, offset: 5000 }, config)).toMatchObject({ limit: 20, offset: 1000 });
  });

  it("rejects arbitrary fields and operators", () => {
    expect(() => secureListOptions("Account", {
      filters: [{ attribute: "description", type: "equals", value: "x" }],
    }, config)).toThrow("not allowed");
  });

  it("rejects arbitrary ordering", () => {
    expect(() => secureListOptions("Account", { orderBy: "createdById" }, config)).toThrow("not allowed");
  });
});

describe("record IDs", () => {
  it("accepts Espo-style IDs and rejects path traversal", () => {
    expect(validateId("68931abcDEF_12")).toBe("68931abcDEF_12");
    expect(() => validateId("../User/1")).toThrow("Invalid record ID");
  });
});

describe("write security", () => {
  it("allows only explicitly writable fields", () => {
    expect(secureWriteData("Meeting", { name: "Kick-off" }, config)).toEqual({ name: "Kick-off" });
    expect(() => secureWriteData("Meeting", { createdById: "admin" }, config)).toThrow("not allowed");
  });

  it("rejects empty updates", () => {
    expect(() => secureWriteData("Task", {}, config)).toThrow("At least one field");
  });
});
