import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CrmService } from "./service.js";
import type { ListOptions, SafeFilter } from "./types.js";

const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const idSchema = z.object({ id: z.string().min(1).max(64).describe("EspoCRM record ID") });
const relatedSchema = z.object({
  id: z.string().min(1).max(64).describe("EspoCRM record ID"),
  limit: z.number().int().min(1).max(20).optional(),
  offset: z.number().int().min(0).max(1000).optional(),
});

const accountSearchSchema = z.object({
  query: z.string().max(200).optional(),
  type: z.string().max(100).optional(),
  industry: z.string().max(150).optional(),
  city: z.string().max(150).optional(),
  enrichment: z.string().max(100).optional(),
  assignedUserId: z.string().max(64).optional(),
  primaryFilter: z.enum(["customers", "resellers", "partners", "recentlyCreated"]).optional(),
  onlyMy: z.boolean().optional(),
  limit: z.number().int().min(1).max(20).optional(),
  offset: z.number().int().min(0).max(1000).optional(),
  orderBy: z.enum(["name", "type", "industry", "createdAt", "modifiedAt"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
});

const contactSearchSchema = z.object({
  query: z.string().max(200).optional(),
  accountId: z.string().max(64).optional(),
  emailAddress: z.string().max(254).optional(),
  role: z.string().max(150).optional(),
  sector: z.string().max(150).optional(),
  assignedUserId: z.string().max(64).optional(),
  primaryFilter: z.enum(["portalUsers", "notPortalUsers", "accountActive"]).optional(),
  onlyMy: z.boolean().optional(),
  limit: z.number().int().min(1).max(20).optional(),
  offset: z.number().int().min(0).max(1000).optional(),
  orderBy: z.enum(["firstName", "lastName", "accountName", "createdAt", "modifiedAt"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
});

const opportunitySearchSchema = z.object({
  query: z.string().max(200).optional(),
  accountId: z.string().max(64).optional(),
  contactId: z.string().max(64).optional(),
  stage: z.string().max(100).optional(),
  leadSource: z.string().max(100).optional(),
  closeDateBefore: z.string().date().optional(),
  closeDateAfter: z.string().date().optional(),
  amountMin: z.number().nonnegative().optional(),
  amountMax: z.number().nonnegative().optional(),
  assignedUserId: z.string().max(64).optional(),
  primaryFilter: z.enum(["open", "won", "lost"]).optional(),
  onlyMy: z.boolean().optional(),
  limit: z.number().int().min(1).max(20).optional(),
  offset: z.number().int().min(0).max(1000).optional(),
  orderBy: z.enum(["name", "amount", "stage", "probability", "closeDate", "createdAt", "modifiedAt"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
});

function success(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error.";
  return { isError: true, content: [{ type: "text" as const, text: message }] };
}

function compactOptions(input: Record<string, unknown>): ListOptions {
  const options: ListOptions = {};
  for (const key of ["query", "limit", "offset", "orderBy", "order", "primaryFilter", "onlyMy"] as const) {
    const value = input[key];
    if (value !== undefined) Object.assign(options, { [key]: value });
  }
  return options;
}

function addFilter(filters: SafeFilter[], attribute: string, value: unknown, type: SafeFilter["type"] = "equals"): void {
  if (value !== undefined) filters.push({ attribute, type, value: value as string | number | string[] });
}

export function createServer(service: CrmService): McpServer {
  const server = new McpServer({ name: "espocrm-mcp-server", version: "0.1.0" });

  server.registerTool("search_accounts", {
    title: "Search Accounts",
    description: "Search a maximum of 20 EspoCRM accounts using approved filters.",
    inputSchema: accountSearchSchema,
    annotations,
  }, async (input) => {
    try {
      const filters: SafeFilter[] = [];
      addFilter(filters, "type", input.type);
      addFilter(filters, "industry", input.industry);
      addFilter(filters, "billingAddressCity", input.city, "contains");
      addFilter(filters, "cEnrichment", input.enrichment);
      addFilter(filters, "assignedUserId", input.assignedUserId);
      return success(await service.search("search_accounts", "Account", { ...compactOptions(input), filters }));
    } catch (error) { return failure(error); }
  });

  server.registerTool("get_account", { description: "Read one account by ID.", inputSchema: idSchema, annotations },
    async ({ id }) => { try { return success(await service.get("get_account", "Account", id)); } catch (error) { return failure(error); } });
  server.registerTool("get_account_contacts", { description: "List contacts linked to an account.", inputSchema: relatedSchema, annotations },
    async ({ id, limit, offset }) => { try { return success(await service.related("get_account_contacts", "Account", id, "contacts", compactOptions({ limit, offset }))); } catch (error) { return failure(error); } });
  server.registerTool("get_account_opportunities", { description: "List opportunities linked to an account.", inputSchema: relatedSchema, annotations },
    async ({ id, limit, offset }) => { try { return success(await service.related("get_account_opportunities", "Account", id, "opportunities", compactOptions({ limit, offset }))); } catch (error) { return failure(error); } });

  server.registerTool("search_contacts", {
    title: "Search Contacts",
    description: "Search a maximum of 20 EspoCRM contacts using approved filters.",
    inputSchema: contactSearchSchema,
    annotations,
  }, async (input) => {
    try {
      const filters: SafeFilter[] = [];
      addFilter(filters, "accountId", input.accountId);
      addFilter(filters, "emailAddress", input.emailAddress);
      addFilter(filters, "cRolle", input.role);
      addFilter(filters, "cSektor", input.sector);
      addFilter(filters, "assignedUserId", input.assignedUserId);
      return success(await service.search("search_contacts", "Contact", { ...compactOptions(input), filters }));
    } catch (error) { return failure(error); }
  });

  server.registerTool("get_contact", { description: "Read one contact by ID.", inputSchema: idSchema, annotations },
    async ({ id }) => { try { return success(await service.get("get_contact", "Contact", id)); } catch (error) { return failure(error); } });
  server.registerTool("get_contact_accounts", { description: "List all accounts linked to a contact.", inputSchema: relatedSchema, annotations },
    async ({ id, limit, offset }) => { try { return success(await service.related("get_contact_accounts", "Contact", id, "accounts", compactOptions({ limit, offset }))); } catch (error) { return failure(error); } });
  server.registerTool("get_contact_opportunities", { description: "List opportunities linked to a contact.", inputSchema: relatedSchema, annotations },
    async ({ id, limit, offset }) => { try { return success(await service.related("get_contact_opportunities", "Contact", id, "opportunities", compactOptions({ limit, offset }))); } catch (error) { return failure(error); } });

  server.registerTool("search_opportunities", {
    title: "Search Opportunities",
    description: "Search a maximum of 20 EspoCRM opportunities using approved filters.",
    inputSchema: opportunitySearchSchema,
    annotations,
  }, async (input) => {
    try {
      if (input.amountMin !== undefined && input.amountMax !== undefined && input.amountMin > input.amountMax) {
        throw new Error("amountMin must not exceed amountMax.");
      }
      const filters: SafeFilter[] = [];
      addFilter(filters, "accountId", input.accountId);
      addFilter(filters, "contactId", input.contactId);
      addFilter(filters, "stage", input.stage);
      addFilter(filters, "leadSource", input.leadSource);
      addFilter(filters, "closeDate", input.closeDateBefore, "before");
      addFilter(filters, "closeDate", input.closeDateAfter, "after");
      addFilter(filters, "amount", input.amountMin, "greaterThanOrEquals");
      addFilter(filters, "amount", input.amountMax, "lessThanOrEquals");
      addFilter(filters, "assignedUserId", input.assignedUserId);
      return success(await service.search("search_opportunities", "Opportunity", { ...compactOptions(input), filters }));
    } catch (error) { return failure(error); }
  });

  server.registerTool("get_opportunity", { description: "Read one opportunity by ID.", inputSchema: idSchema, annotations },
    async ({ id }) => { try { return success(await service.get("get_opportunity", "Opportunity", id)); } catch (error) { return failure(error); } });
  server.registerTool("get_opportunity_account", { description: "Read the account linked to an opportunity.", inputSchema: idSchema, annotations },
    async ({ id }) => {
      try {
        const opportunity = await service.get("get_opportunity_account", "Opportunity", id);
        const accountId = opportunity.accountId;
        if (typeof accountId !== "string" || !accountId) return success({ account: null });
        return success(await service.get("get_opportunity_account", "Account", accountId));
      } catch (error) { return failure(error); }
    });
  server.registerTool("get_opportunity_contacts", { description: "List contacts linked to an opportunity.", inputSchema: relatedSchema, annotations },
    async ({ id, limit, offset }) => { try { return success(await service.related("get_opportunity_contacts", "Opportunity", id, "contacts", compactOptions({ limit, offset }))); } catch (error) { return failure(error); } });

  return server;
}
