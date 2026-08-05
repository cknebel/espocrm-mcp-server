import { AuditLogger } from "./audit.js";
import { normalizeEmail } from "./email-normalizer.js";
import { EspoClient, EspoError } from "./espocrm-client.js";
import { projectRecord, secureListOptions, validateId } from "./security.js";
import { normalizeStreamNote } from "./stream-normalizer.js";
import type { ActivityStreamEntry, ActivityStreamOptions, EmailContentOptions, EntityName, EspoRecord, ListOptions, PermissionsConfig, StreamEntityName } from "./types.js";

const RELATED_ENTITY: Record<string, EntityName> = {
  "Account.contacts": "Contact",
  "Account.opportunities": "Opportunity",
  "Contact.accounts": "Account",
  "Contact.opportunities": "Opportunity",
  "Opportunity.contacts": "Contact",
};

export class CrmService {
  constructor(
    private readonly client: EspoClient,
    private readonly permissions: PermissionsConfig,
    private readonly audit: AuditLogger,
  ) {}

  async search(tool: string, entity: EntityName, options: ListOptions): Promise<EspoRecord[]> {
    const secured = secureListOptions(entity, options, this.permissions);
    const fields = this.permissions.entities[entity].listFields;
    try {
      const response = await this.client.list(entity, fields, secured);
      const list = response.list.map((record) => projectRecord(record, fields));
      await this.audit.write({ tool, entity, operation: "list", success: true, resultCount: list.length });
      return list;
    } catch (error) {
      await this.audit.write({
        tool,
        entity,
        operation: "list",
        success: false,
        ...(error instanceof EspoError && error.statusCode ? { statusCode: error.statusCode } : {}),
      });
      throw error;
    }
  }

  async get(tool: string, entity: EntityName, id: string): Promise<EspoRecord> {
    const safeId = validateId(id);
    try {
      const record = await this.client.read(entity, safeId);
      const result = projectRecord(record, this.permissions.entities[entity].readableFields);
      await this.audit.write({ tool, entity, recordId: safeId, operation: "read", success: true });
      return result;
    } catch (error) {
      await this.audit.write({
        tool,
        entity,
        recordId: safeId,
        operation: "read",
        success: false,
        ...(error instanceof EspoError && error.statusCode ? { statusCode: error.statusCode } : {}),
      });
      throw error;
    }
  }

  async related(tool: string, entity: EntityName, id: string, link: string, options: ListOptions = {}): Promise<EspoRecord[]> {
    const safeId = validateId(id);
    const target = RELATED_ENTITY[`${entity}.${link}`];
    if (!target) throw new Error("Relationship is not allowed.");
    const secured = secureListOptions(target, options, this.permissions);
    const fields = this.permissions.entities[target].listFields;
    try {
      const response = await this.client.related(entity, safeId, link, fields, secured);
      const list = response.list.map((record) => projectRecord(record, fields));
      await this.audit.write({ tool, entity, recordId: safeId, operation: "related", success: true, resultCount: list.length });
      return list;
    } catch (error) {
      await this.audit.write({
        tool,
        entity,
        recordId: safeId,
        operation: "related",
        success: false,
        ...(error instanceof EspoError && error.statusCode ? { statusCode: error.statusCode } : {}),
      });
      throw error;
    }
  }

  async stream(tool: string, entity: StreamEntityName, id: string, options: ActivityStreamOptions = {}): Promise<ActivityStreamEntry[]> {
    const safeId = validateId(id);
    const limit = Math.min(Math.max(options.limit ?? 10, 1), this.permissions.maxResults);
    const offset = Math.min(Math.max(options.offset ?? 0, 0), this.permissions.maxOffset);
    try {
      const response = await this.client.stream(entity, safeId, limit, offset);
      const list = response.list
        .map((note) => normalizeStreamNote(note, entity, this.permissions))
        .filter((note): note is ActivityStreamEntry => note !== undefined);
      await this.audit.write({ tool, entity, recordId: safeId, operation: "stream", success: true, resultCount: list.length });
      return list;
    } catch (error) {
      await this.audit.write({
        tool,
        entity,
        recordId: safeId,
        operation: "stream",
        success: false,
        ...(error instanceof EspoError && error.statusCode ? { statusCode: error.statusCode } : {}),
      });
      throw error;
    }
  }

  async email(tool: string, id: string, options: EmailContentOptions = {}): Promise<EspoRecord> {
    const safeId = validateId(id);
    try {
      const record = await this.client.read("Email", safeId);
      const allowed = projectRecord(record, this.permissions.entities.Email.readableFields);
      const result = normalizeEmail(allowed, options);
      await this.audit.write({ tool, entity: "Email", recordId: safeId, operation: "read", success: true });
      return result;
    } catch (error) {
      await this.audit.write({
        tool,
        entity: "Email",
        recordId: safeId,
        operation: "read",
        success: false,
        ...(error instanceof EspoError && error.statusCode ? { statusCode: error.statusCode } : {}),
      });
      throw error;
    }
  }
}
