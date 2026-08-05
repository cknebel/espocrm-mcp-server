import type { ActivityStreamEntry, EspoRecord, PermissionsConfig, StreamEntityName } from "./types.js";

const MAX_POST_LENGTH = 4_000;
const MAX_LABEL_LENGTH = 500;

function asObject(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function truncate(value: string, maximum: number): { value: string; truncated: boolean } {
  if (value.length <= maximum) return { value, truncated: false };
  return { value: `${value.slice(0, maximum)}…`, truncated: true };
}

function addString(target: EspoRecord, key: string, value: unknown, maximum = MAX_LABEL_LENGTH): void {
  const stringValue = asString(value);
  if (stringValue) target[key] = truncate(stringValue, maximum).value;
}

function normalizeEmailData(data: Record<string, unknown>, type: string): EspoRecord | undefined {
  if (type !== "EmailReceived" && type !== "EmailSent") return undefined;
  const email: EspoRecord = { direction: type === "EmailReceived" ? "received" : "sent" };
  addString(email, "id", data.emailId, 64);
  addString(email, "subject", data.emailName);
  if (typeof data.hasAttachment === "boolean") email.hasAttachment = data.hasAttachment;

  const person: EspoRecord = {};
  addString(person, "entityType", data.personEntityType, 64);
  addString(person, "id", data.personEntityId, 64);
  addString(person, "name", data.personEntityName);
  if (Object.keys(person).length > 0) email.person = person;
  return email;
}

export function normalizeStreamNote(
  note: EspoRecord,
  entity: StreamEntityName,
  permissions: PermissionsConfig,
): ActivityStreamEntry | undefined {
  const id = asString(note.id);
  const type = asString(note.type);
  if (!id || !type) return undefined;

  const result: ActivityStreamEntry = { id, type };
  addString(result, "createdAt", note.createdAt, 40);
  if (typeof note.isInternal === "boolean") result.isInternal = note.isInternal;
  if (typeof note.isPinned === "boolean") result.isPinned = note.isPinned;

  const author: EspoRecord = {};
  addString(author, "id", note.createdById, 64);
  addString(author, "name", note.createdByName);
  if (Object.keys(author).length > 0) result.author = author;

  const post = type === "Post" ? asString(note.post) : undefined;
  if (post) {
    const normalizedPost = truncate(post, MAX_POST_LENGTH);
    result.text = normalizedPost.value;
    if (normalizedPost.truncated) result.textTruncated = true;
  }

  const related: EspoRecord = {};
  addString(related, "entityType", note.relatedType, 64);
  addString(related, "id", note.relatedId, 64);
  addString(related, "name", note.relatedName);
  if (Object.keys(related).length > 0) result.related = related;

  const attachmentIds = Array.isArray(note.attachmentsIds) ? note.attachmentsIds : [];
  if (attachmentIds.length > 0) result.hasAttachments = true;

  const data = asObject(note.data) ?? {};
  const readable = new Set(permissions.entities[entity].readableFields);
  const fields = Array.isArray(data.fields)
    ? data.fields.filter((field): field is string => typeof field === "string" && readable.has(field))
    : [];
  if (fields.length > 0) result.changedFields = fields;

  const statusField = asString(data.statusField);
  if (statusField && readable.has(statusField)) {
    const status: EspoRecord = { field: statusField };
    addString(status, "value", data.statusValue);
    result.status = status;
  }

  const email = normalizeEmailData(data, type);
  if (email) {
    result.email = email;
    if (email.hasAttachment === true) result.hasAttachments = true;
  }

  return result;
}
