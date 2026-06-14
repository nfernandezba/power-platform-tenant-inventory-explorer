import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createEnvironmentCountQuery,
  createEnvironmentQuery,
  createRecentQuery,
  createResourceDetailQuery,
  createResourceTypeQuery,
  createSummaryQuery,
  queryBootstrapSummary
} from "../src/api.js";
import { datasetCacheKey } from "../src/cache.js";
import { normaliseSummaryRows } from "../src/data.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("modular inventory queries", () => {
  it("uses the documented aggregate summary by type and region", () => {
    const query = createSummaryQuery();
    const summarize = query.Clauses.find(clause => clause.$type === "summarize");
    expect(summarize.SummarizeClauseExpression.OperatorName).toBe("count");
    expect(summarize.SummarizeClauseExpression.FieldList).toEqual(["type", "location"]);
    expect(query.Clauses.some(clause => clause.$type === "extend")).toBe(false);
    expect(query.Options.Top).toBeLessThanOrEqual(1000);
    expect(createSummaryQuery("next-token").Options.SkipToken).toBe("next-token");
  });

  it("isolates the optional environment-count aggregation", () => {
    const query = createEnvironmentCountQuery();
    const summarize = query.Clauses.find(clause => clause.$type === "summarize");
    expect(summarize.SummarizeClauseExpression.FieldList).toEqual(["environmentId"]);
    expect(query.Clauses.some(clause => clause.$type === "extend")).toBe(true);
  });

  it("never requests more than 1,000 records in Query Options", () => {
    expect(createRecentQuery(5000).Options.Top).toBe(1000);
    expect(createRecentQuery(0).Options.Top).toBe(1);
  });

  it("projects lightweight fields with stable aliases for real tenant responses", () => {
    const environmentProject = createEnvironmentQuery().Clauses.find(clause => clause.$type === "project");
    const recentProject = createRecentQuery(20).Clauses.find(clause => clause.$type === "project");
    expect(environmentProject.FieldList).toContain("displayName = tostring(properties.displayName)");
    expect(environmentProject.FieldList).toContain("isManagedEnvironment = tobool(properties.isManaged)");
    expect(recentProject.FieldList).toContain("environmentId = tostring(properties.environmentId)");
    expect(recentProject.FieldList).toContain("createdAt = tostring(properties.createdAt)");
    expect(createRecentQuery(20).Clauses.find(clause => clause.$type === "take").TakeCount).toBe(20);
  });

  it("sorts by simple aliases before projection to avoid tenant-side HTTP 400 errors", () => {
    const environmentClauses = createEnvironmentQuery().Clauses;
    const environmentOrderIndex = environmentClauses.findIndex(clause => clause.$type === "orderby");
    const environmentProjectIndex = environmentClauses.findIndex(clause => clause.$type === "project");
    expect(environmentClauses[environmentOrderIndex].FieldNamesAscDesc).toEqual({ displayNameSort: "asc" });
    expect(environmentOrderIndex).toBeLessThan(environmentProjectIndex);

    const recentClauses = createRecentQuery(20).Clauses;
    const recentOrderIndex = recentClauses.findIndex(clause => clause.$type === "orderby");
    const recentProjectIndex = recentClauses.findIndex(clause => clause.$type === "project");
    expect(recentClauses[recentOrderIndex].FieldNamesAscDesc).toEqual({ modifiedDate: "desc" });
    expect(recentOrderIndex).toBeLessThan(recentProjectIndex);

    const resourceClauses = createResourceTypeQuery("cloudFlows").Clauses;
    const resourceOrderIndex = resourceClauses.findIndex(clause => clause.$type === "orderby");
    const resourceProjectIndex = resourceClauses.findIndex(clause => clause.$type === "project");
    expect(resourceClauses[resourceOrderIndex].FieldNamesAscDesc).toEqual({ modifiedDate: "desc" });
    expect(resourceOrderIndex).toBeLessThan(resourceProjectIndex);
  });

  it("creates independent resource type and detail queries", () => {
    const list = createResourceTypeQuery("cloudFlows", "next", { environmentId: "env-real" });
    expect(list.Options.SkipToken).toBe("next");
    expect(list.Clauses[0].Values).toContain("'microsoft.powerautomate/cloudflows'");
    expect(list.Clauses.find(clause => clause.FieldName === "properties.environmentId").Values).toEqual(["'env-real'"]);

    const detail = createResourceDetailQuery("microsoft.powerautomate/cloudflows", "flow-id");
    expect(detail.Clauses.some(clause => clause.FieldName === "name")).toBe(true);
    expect(detail.Clauses.find(clause => clause.$type === "project").FieldList).toContain("powerPlatformConnectors = properties.powerPlatformConnectors");
  });

  it("keeps the official summary when the optional environment aggregation returns HTTP 400", async () => {
    const responses = [
      new Response(JSON.stringify({
        data: [{ type: "microsoft.powerapps/canvasapps", location: "europe", resourceCount: 4 }],
        count: 1,
        totalRecords: 1,
        resultTruncated: false,
        skipToken: ""
      }), { status: 200, headers: { "Content-Type": "application/json" } }),
      new Response(JSON.stringify({ error: { message: "Unsupported grouping expression" } }), {
        status: 400,
        headers: { "Content-Type": "application/json", "x-ms-correlation-request-id": "corr-400" }
      })
    ];
    vi.stubGlobal("fetch", vi.fn(async () => responses.shift()));

    const result = await queryBootstrapSummary("token");
    expect(result.items).toHaveLength(1);
    expect(result.environmentItems).toEqual([]);
    expect(result.environmentCountWarning?.status).toBe(400);
    expect(result.environmentCountWarning?.queryName).toBe("overview-summary-by-environment");
    expect(result.environmentCountWarning?.requestBody).toContain('"FieldList": [\n          "environmentId"');
  });
});

describe("summary normalisation and cache isolation", () => {
  it("aggregates type totals and accepts environment counts as an independent dataset", () => {
    const summary = normaliseSummaryRows([
      { type: "microsoft.powerapps/canvasapps", location: "europe", resourceCount: 7 },
      { type: "microsoft.powerautomate/cloudflows", location: "europe", resourceCount: 8 }
    ], [
      { environmentId: "env-1", resourceCount: 12 },
      { environmentId: "env-2", resourceCount: 3 }
    ]);
    expect(summary.total).toBe(15);
    expect(summary.byType.canvasApps).toBe(7);
    expect(summary.byEnvironment["env-1"]).toBe(12);
  });

  it("creates tenant and version scoped cache keys", () => {
    expect(datasetCacheKey("TENANT-A", "resources:cloudFlows")).toBe("tenant-a:resources:cloudFlows:v3");
  });
});
