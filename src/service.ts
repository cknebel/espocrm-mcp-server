import { AuditLogger } from "./audit.js";
import { EspoClient, EspoError } from "./espocrm-client.js";
import { projectRecord, secureListOptions, validateId } from "./security.js";
import type { EntityName, EspoRecord, ListOptions, PermissionsConfig } from "./types.js";

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
}
