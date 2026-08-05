export type StreamEntityName = "Account" | "Contact" | "Opportunity";
export type EntityName = StreamEntityName | "Email";

export type EspoRecord = Record<string, unknown> & { id?: string };

export interface EspoListResponse {
  list: EspoRecord[];
  total?: number;
}

export interface ActivityStreamOptions {
  limit?: number;
  offset?: number;
}

export interface ActivityStreamEntry extends EspoRecord {
  id: string;
  type: string;
  createdAt?: string;
}

export interface EmailContentOptions {
  bodyOffset?: number;
  bodyLimit?: number;
}

export type FilterOperator =
  | "equals"
  | "in"
  | "contains"
  | "greaterThan"
  | "lessThan"
  | "greaterThanOrEquals"
  | "lessThanOrEquals"
  | "before"
  | "after"
  | "between";

export interface SafeFilter {
  attribute: string;
  type: FilterOperator;
  value: string | number | string[];
}

export interface ListOptions {
  query?: string;
  filters?: SafeFilter[];
  limit?: number;
  offset?: number;
  orderBy?: string;
  order?: "asc" | "desc";
  primaryFilter?: string;
  onlyMy?: boolean;
}

export interface EntityPermissions {
  readableFields: string[];
  listFields: string[];
  filterableFields: string[];
  orderableFields: string[];
  primaryFilters: string[];
}

export interface PermissionsConfig {
  maxResults: number;
  maxOffset: number;
  entities: Record<EntityName, EntityPermissions>;
}
