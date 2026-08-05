import { describe, expect, it } from "vitest";
import { normalizeStreamNote } from "../src/stream-normalizer.js";
import type { PermissionsConfig } from "../src/types.js";

const permissions: PermissionsConfig = {
  maxResults: 20,
  maxOffset: 1000,
  entities: {
    Account: {
      readableFields: ["id", "name", "type", "assignedUserId"],
      listFields: ["id", "name"],
      filterableFields: [],
      orderableFields: [],
      primaryFilters: [],
    },
    Contact: {
      readableFields: ["id", "firstName", "lastName"],
      listFields: ["id", "firstName", "lastName"],
      filterableFields: [],
      orderableFields: [],
      primaryFilters: [],
    },
    Opportunity: {
      readableFields: ["id", "name", "stage"],
      listFields: ["id", "name"],
      filterableFields: [],
      orderableFields: [],
      primaryFilters: [],
    },
    Email: {
      readableFields: ["id", "subject", "bodyPlain"],
      listFields: ["id", "subject"],
      filterableFields: [],
      orderableFields: [],
      primaryFilters: [],
    },
  },
};

describe("activity-stream normalization", () => {
  it("keeps post text but removes attachments, reactions and raw data", () => {
    const result = normalizeStreamNote({
      id: "note-1",
      type: "Post",
      post: "Meeting follow-up",
      createdAt: "2026-08-05 10:00:00",
      createdById: "user-1",
      createdByName: "A User",
      attachmentsIds: ["secret-attachment"],
      attachmentsNames: { "secret-attachment": "private.pdf" },
      reactionCounts: { Like: 1 },
      data: { confidential: "must-not-leak" },
    }, "Contact", permissions);

    expect(result).toEqual({
      id: "note-1",
      type: "Post",
      createdAt: "2026-08-05 10:00:00",
      author: { id: "user-1", name: "A User" },
      text: "Meeting follow-up",
      hasAttachments: true,
    });
    expect(JSON.stringify(result)).not.toContain("private.pdf");
    expect(JSON.stringify(result)).not.toContain("must-not-leak");
  });

  it("returns only changed field names that are already readable", () => {
    const result = normalizeStreamNote({
      id: "note-2",
      type: "Update",
      data: {
        fields: ["type", "description", "apiSecret"],
        attributes: {
          was: { type: "Prospect", description: "old secret" },
          became: { type: "Customer", description: "new secret" },
        },
      },
    }, "Account", permissions);

    expect(result).toEqual({ id: "note-2", type: "Update", changedFields: ["type"] });
    expect(JSON.stringify(result)).not.toContain("Prospect");
    expect(JSON.stringify(result)).not.toContain("description");
  });

  it("normalizes email metadata without exposing arbitrary note data", () => {
    const result = normalizeStreamNote({
      id: "note-3",
      type: "EmailReceived",
      data: {
        emailId: "email-1",
        emailName: "Project update",
        hasAttachment: true,
        personEntityType: "Contact",
        personEntityId: "contact-1",
        personEntityName: "Example Person",
        body: "private email body",
      },
    }, "Account", permissions);

    expect(result).toEqual({
      id: "note-3",
      type: "EmailReceived",
      hasAttachments: true,
      email: {
        direction: "received",
        id: "email-1",
        subject: "Project update",
        hasAttachment: true,
        person: { entityType: "Contact", id: "contact-1", name: "Example Person" },
      },
    });
    expect(JSON.stringify(result)).not.toContain("private email body");
  });

  it("does not expose an email preview stored in the generic post field", () => {
    const result = normalizeStreamNote({
      id: "note-email-preview",
      type: "EmailSent",
      post: "First lines of a confidential outgoing email",
      data: { emailId: "email-2", emailName: "Subject" },
    }, "Contact", permissions);

    expect(result).toEqual({
      id: "note-email-preview",
      type: "EmailSent",
      email: { direction: "sent", id: "email-2", subject: "Subject" },
    });
  });

  it("caps long posts", () => {
    const result = normalizeStreamNote({ id: "note-4", type: "Post", post: "x".repeat(4_100) }, "Contact", permissions);
    expect(result?.text).toHaveLength(4_001);
    expect(result?.textTruncated).toBe(true);
  });
});
