import { describe, expect, it } from "vitest";
import { normalizeEmail } from "../src/email-normalizer.js";

describe("email normalization", () => {
  it("returns useful metadata and plain text without raw attachment data", () => {
    const result = normalizeEmail({
      id: "email-1",
      subject: "Project update",
      from: "sender@example.test",
      to: "recipient@example.test",
      cc: "copy@example.test",
      bodyPlain: "Hello\n\nStatus update.",
      body: "<p>HTML secret duplicate</p>",
      hasAttachment: true,
      attachmentsIds: ["attachment-secret"],
      messageId: "technical-secret",
      parentType: "Contact",
      parentId: "contact-1",
      parentName: "Example Person",
      repliesIds: ["email-2", "../invalid"],
    });

    expect(result).toMatchObject({
      id: "email-1",
      subject: "Project update",
      from: "sender@example.test",
      to: "recipient@example.test",
      cc: "copy@example.test",
      hasAttachments: true,
      parent: { entityType: "Contact", id: "contact-1", name: "Example Person" },
      replyIds: ["email-2"],
      bodyText: "Hello\n\nStatus update.",
      bodySource: "plain",
      bodyOffset: 0,
      bodyCharacters: 21,
      bodyTotalCharacters: 21,
      bodyHasMore: false,
    });
    expect(JSON.stringify(result)).not.toContain("attachment-secret");
    expect(JSON.stringify(result)).not.toContain("technical-secret");
    expect(JSON.stringify(result)).not.toContain("HTML secret duplicate");
  });

  it("converts HTML to text only when plain text is unavailable", () => {
    const result = normalizeEmail({
      id: "email-2",
      body: "<style>.hidden { display:none }</style><p>Hello &amp; welcome<br>Next line</p><script>bad()</script>",
    });

    expect(result.bodyText).toBe("Hello & welcome\nNext line");
    expect(result.bodySource).toBe("html-fallback");
    expect(JSON.stringify(result)).not.toContain("bad()");
  });

  it("supports bounded chunks for long email bodies", () => {
    const result = normalizeEmail({ id: "email-3", bodyPlain: "0123456789" }, { bodyOffset: 3, bodyLimit: 4 });

    expect(result).toMatchObject({
      bodyText: "3456",
      bodyOffset: 3,
      bodyCharacters: 4,
      bodyTotalCharacters: 10,
      bodyHasMore: true,
    });
  });
});
