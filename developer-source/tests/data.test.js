import { describe, expect, it } from "vitest";
import { calculateMetrics, filterInventory, normaliseInventory, sortInventory } from "../src/data.js";

const raw = [
  {
    name: "env-1",
    type: "microsoft.powerplatform/environments",
    location: "europe",
    properties: { displayName: "Development", environmentType: "Sandbox", isManaged: true }
  },
  {
    name: "app-1",
    type: "microsoft.powerapps/canvasapps",
    location: "europe",
    properties: {
      displayName: "Expense App",
      environmentId: "env-1",
      ownerId: "owner-1",
      createdAt: "2026-01-01T00:00:00Z",
      lastModifiedAt: "2026-05-01T00:00:00Z",
      powerPlatformConnectors: [{ connectorId: "shared_sharepointonline", operations: [] }]
    }
  }
];

describe("normaliseInventory", () => {
  it("resolves environment names and connectors", () => {
    const items = normaliseInventory(raw);
    const app = items.find(item => item.id === "app-1");
    expect(app.environmentName).toBe("Development");
    expect(app.connectorIds).toEqual(["shared_sharepointonline"]);
  });

  it("normalises projected top-level aliases returned by Azure Resource Graph", () => {
    const environments = normaliseInventory([{
      name: "env-real",
      type: "microsoft.powerplatform/environments",
      location: "europe",
      displayName: "Real Production",
      environmentType: "Production",
      isManagedEnvironment: true,
      lastModifiedAt: "2026-06-01T10:00:00Z"
    }]);
    const resources = normaliseInventory([{
      name: "flow-real",
      type: "microsoft.powerautomate/cloudflows",
      location: "europe",
      displayName: "Approval Flow",
      environmentId: "/providers/Microsoft.PowerPlatform/environments/env-real",
      ownerId: "owner-real",
      createdAt: "2026-01-02T00:00:00Z",
      lastModifiedAt: "2026-06-03T00:00:00Z"
    }], environments);
    expect(environments[0].displayName).toBe("Real Production");
    expect(resources[0].displayName).toBe("Approval Flow");
    expect(resources[0].environmentName).toBe("Real Production");
    expect(resources[0].environmentId).toBe("env-real");
    expect(resources[0].createdAt).toBe("2026-01-02T00:00:00Z");
    expect(resources[0].lastModifiedAt).toBe("2026-06-03T00:00:00Z");
    expect(resources[0].connectorDataLoaded).toBe(false);
  });

  it("marks connector detail as loaded when the projected connector field is returned", () => {
    const [resource] = normaliseInventory([{
      name: "flow-detail",
      type: "microsoft.powerautomate/cloudflows",
      displayName: "Detailed Flow",
      powerPlatformConnectors: [{ connectorId: "shared_teams", operations: [{ operationId: "PostMessage" }] }]
    }]);
    expect(resource.connectorDataLoaded).toBe(true);
    expect(resource.connectorIds).toEqual(["shared_teams"]);
    expect(resource.connectors[0].operations).toEqual(["PostMessage"]);
  });
});

describe("filterInventory", () => {
  it("searches across names and connectors", () => {
    const items = normaliseInventory(raw);
    expect(filterInventory(items, { search: "sharepoint", type: "", environment: "", region: "", owner: "", createdFrom: "", createdTo: "" })).toHaveLength(1);
  });
});

describe("sortInventory", () => {
  it("sorts text values", () => {
    const items = normaliseInventory(raw);
    const sorted = sortInventory(items, { key: "displayName", direction: "desc" });
    expect(sorted[0].displayName).toBe("Expense App");
  });
});

describe("calculateMetrics", () => {
  it("counts types", () => {
    const metrics = calculateMetrics(normaliseInventory(raw));
    expect(metrics.total).toBe(2);
    expect(metrics.byType.canvasApps).toBe(1);
    expect(metrics.byType.environments).toBe(1);
  });
});
