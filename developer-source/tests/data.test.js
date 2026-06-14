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
