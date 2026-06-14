import { describe, expect, it } from "vitest";
import {
  buildEnvironmentRows,
  flattenObject,
  getTenantGovernanceHighlights,
  groupEnvironmentSettings,
  normaliseDlpPolicies,
  normaliseInventory
} from "../src/data.js";
import {
  demoDlpPolicies,
  demoEnvironmentSettings,
  demoRawItems,
  demoTenantSettings
} from "../src/demo-data.js";

describe("administrative datasets", () => {
  it("normalises DLP policy groups and scopes", () => {
    const policies = normaliseDlpPolicies(demoDlpPolicies);
    expect(policies).toHaveLength(2);
    expect(policies[0].displayName).toBeTruthy();
    expect(policies.some(policy => policy.blockedCount === 2)).toBe(true);
    expect(policies.some(policy => policy.scope === "selectedEnvironments")).toBe(true);
  });

  it("flattens nested tenant settings", () => {
    const rows = flattenObject(demoTenantSettings);
    expect(rows.some(row => row.path === "powerPlatform.governance.enableDefaultEnvironmentRouting")).toBe(true);
  });

  it("creates governance highlights with health state", () => {
    const highlights = getTenantGovernanceHighlights(demoTenantSettings);
    const environmentCreation = highlights.find(item => item.labelKey === "restrictEnvironmentCreation");
    expect(environmentCreation.available).toBe(true);
    expect(environmentCreation.healthy).toBe(true);
  });

  it("groups environment settings by product area", () => {
    const groups = groupEnvironmentSettings(Object.values(demoEnvironmentSettings)[0]);
    expect(groups.copilotStudio.length).toBeGreaterThan(0);
    expect(groups.powerApps.length).toBeGreaterThan(0);
  });

  it("builds environment rows with resource counts", () => {
    const rows = buildEnvironmentRows(normaliseInventory(demoRawItems));
    expect(rows.length).toBe(4);
    expect(rows.some(row => row.resourceCount > 0)).toBe(true);
  });
});
