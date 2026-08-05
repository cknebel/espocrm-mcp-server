import type { EntityName, EntityPermissions, EspoRecord, ListOptions, PermissionsConfig, SafeFilter } from "./types.js";

const SAFE_OPERATORS = new Set([
  "equals",
  "in",
  "contains",
  "greaterThan",
  "lessThan",
  "greaterThanOrEquals",
  "lessThanOrEquals",
  "before",
  "after",
  "between",
]);

export function projectRecord(record: EspoRecord, fields: readonly string[]): EspoRecord {
  const projected: EspoRecord = {};
  for (const field of fields) {
    if (Object.hasOwn(record, field)) projected[field] = record[field];
  }
  return projected;
}

export function validateId(id: string): string {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) throw new Error("Invalid record ID.");
  return id;
}

function validateFilter(filter: SafeFilter, permissions: EntityPermissions): SafeFilter {
  if (!permissions.filterableFields.includes(filter.attribute)) {
    throw new Error(`Filtering by '${filter.attribute}' is not allowed.`);
  }
  if (!SAFE_OPERATORS.has(filter.type)) {
    throw new Error(`Filter operator '${filter.type}' is not allowed.`);
  }
  return filter;
}

export function secureListOptions(
  entity: EntityName,
  options: ListOptions,
  config: PermissionsConfig,
): Required<Pick<ListOptions, "limit" | "offset" | "order">> & ListOptions {
  const permissions = config.entities[entity];
  const limit = Math.min(Math.max(options.limit ?? 10, 1), config.maxResults);
  const offset = Math.min(Math.max(options.offset ?? 0, 0), config.maxOffset);

  if (options.orderBy && !permissions.orderableFields.includes(options.orderBy)) {
    throw new Error(`Ordering by '${options.orderBy}' is not allowed.`);
  }
  if (options.primaryFilter && !permissions.primaryFilters.includes(options.primaryFilter)) {
    throw new Error(`Primary filter '${options.primaryFilter}' is not allowed.`);
  }
  if ((options.filters?.length ?? 0) > 10) throw new Error("At most 10 filters are allowed.");

  const secured: Required<Pick<ListOptions, "limit" | "offset" | "order">> & ListOptions = {
    ...options,
    limit,
    offset,
    order: options.order ?? "asc",
  };
  if (options.filters) secured.filters = options.filters.map((filter) => validateFilter(filter, permissions));
  return secured;
}
