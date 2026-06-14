import { afterEach, describe, expect, it, vi } from "vitest";
import { createInventoryQuery, executeInventoryQuery, InventoryApiError } from "../src/api.js";
import { QUERY_RESOURCE_TYPES } from "../src/constants.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createInventoryQuery", () => {
  it("uses the PowerPlatformResources table and pagination token", () => {
    const query = createInventoryQuery("next-token");
    expect(query.TableName).toBe("PowerPlatformResources");
    expect(query.Options.Top).toBe(1000);
    expect(query.Options.SkipToken).toBe("next-token");
  });

  it("includes all supported resource types", () => {
    const query = createInventoryQuery();
    const where = query.Clauses.find(clause => clause.$type === "where");
    for (const type of QUERY_RESOURCE_TYPES) {
      expect(where.Values).toContain(`'${type}'`);
    }
  });
});

describe("inventory error diagnostics", () => {
  it("preserves the service error, correlation ID, endpoint, query name and request body", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      error: { code: "BadRequest", message: "The query specification is invalid." }
    }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "x-ms-correlation-request-id": "correlation-123"
      }
    })));

    const query = createInventoryQuery();
    let caught;
    try {
      await executeInventoryQuery("token", query, { queryName: "test-query" });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(InventoryApiError);
    expect(caught.status).toBe(400);
    expect(caught.details).toContain("invalid");
    expect(caught.correlationId).toBe("correlation-123");
    expect(caught.queryName).toBe("test-query");
    expect(caught.endpoint).toContain("resourcequery/resources/query");
    expect(caught.requestBody).toContain('"TableName": "PowerPlatformResources"');
    expect(caught.requestBody).not.toContain("token");
  });
});
