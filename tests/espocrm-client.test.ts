import { describe, expect, it, vi } from "vitest";
import { EspoClient } from "../src/espocrm-client.js";

describe("EspoClient", () => {
  it("performs only a GET request with field projection and encoded filters", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      list: [{ id: "1", name: "Acme" }],
      total: -2,
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const client = new EspoClient({
      baseUrl: "https://crm.example.test/api/v1",
      apiKey: "test-key",
      fetchImpl: fetchMock,
    });

    await client.list("Account", ["id", "name"], {
      query: "Acme *",
      limit: 10,
      offset: 0,
      order: "asc",
      filters: [{ attribute: "name", type: "contains", value: "Acme" }],
    });

    const [url, request] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/api/v1/Account?");
    expect(String(url)).toContain("attributeSelect=id%2Cname");
    expect(String(url)).toContain("whereGroup%5B0%5D%5Battribute%5D=name");
    expect(request?.method).toBe("GET");
    expect(new Headers(request?.headers).get("X-Api-Key")).toBe("test-key");
    expect(new Headers(request?.headers).get("X-No-Total")).toBe("true");
  });

  it("does not expose an EspoCRM error body", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("sensitive server detail", { status: 403 }));
    const client = new EspoClient({ baseUrl: "https://crm.example.test/api/v1", apiKey: "x", fetchImpl: fetchMock });
    await expect(client.read("Account", "1")).rejects.toThrow("HTTP 403");
    await expect(client.read("Account", "1")).rejects.not.toThrow("sensitive server detail");
  });
});
