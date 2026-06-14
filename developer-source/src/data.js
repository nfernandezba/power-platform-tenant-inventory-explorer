import { RESOURCE_TYPES } from "./constants.js";
import { asArray, normaliseText, parseProperties, safeDate, uniqueSorted } from "./helpers.js";

export function getResourceTypeKey(type) {
  return RESOURCE_TYPES[String(type ?? "").toLowerCase()]?.key ?? "resourceTypeUnknown";
}

function firstPresent(...values) {
  return values.find(value => value !== undefined && value !== null && value !== "");
}

function hasField(item, properties, name) {
  return Object.prototype.hasOwnProperty.call(item ?? {}, name)
    || Object.prototype.hasOwnProperty.call(item ?? {}, `properties.${name}`)
    || Object.prototype.hasOwnProperty.call(item ?? {}, `properties_${name}`)
    || Object.prototype.hasOwnProperty.call(properties ?? {}, name);
}

function projectedField(item, properties, name, ...aliases) {
  const keys = [name, ...aliases];
  for (const key of keys) {
    const value = firstPresent(
      item?.[key],
      item?.[`properties.${key}`],
      item?.[`properties_${key}`],
      properties?.[key]
    );
    if (value !== undefined) return value;
  }
  return undefined;
}

export function canonicalEnvironmentId(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const segments = text.split("/").filter(Boolean);
  return segments.length ? segments.at(-1) : text;
}

export function normaliseInventory(rawItems, environmentItems = []) {
  const items = rawItems.map((item, index) => {
    const properties = parseProperties(item?.properties);
    const rawConnectors = projectedField(item, properties, "powerPlatformConnectors");
    const connectors = asArray(rawConnectors).map(connector => ({
      connectorId: connector?.connectorId ?? connector?.id ?? "",
      operations: asArray(connector?.operations)
        .map(operation => operation?.operationId ?? operation?.id ?? "")
        .filter(Boolean)
    }));
    const rawEnvironmentId = projectedField(item, properties, "environmentId") ?? "";
    const environmentId = canonicalEnvironmentId(rawEnvironmentId);
    const type = String(item?.type ?? projectedField(item, properties, "type") ?? "").toLowerCase();
    const id = String(item?.name ?? projectedField(item, properties, "id") ?? "");
    const displayName = projectedField(item, properties, "displayName", "environmentName") ?? id;
    const isManaged = projectedField(item, properties, "isManagedEnvironment", "isManaged");
    const isQuarantined = projectedField(item, properties, "isQuarantined");

    return {
      rowId: `${type || "unknown"}:${id || "row"}:${index}`,
      id,
      tenantId: item?.tenantId ?? projectedField(item, properties, "tenantId") ?? "",
      displayName: String(displayName ?? ""),
      type,
      typeKey: getResourceTypeKey(type),
      category: RESOURCE_TYPES[type]?.category ?? "other",
      accent: RESOURCE_TYPES[type]?.accent ?? "indigo",
      location: String(firstPresent(item?.environmentRegion, item?.location, projectedField(item, properties, "environmentRegion"), projectedField(item, properties, "location")) ?? ""),
      resourceLocation: String(item?.location ?? projectedField(item, properties, "location") ?? ""),
      environmentId,
      environmentIdRaw: String(rawEnvironmentId ?? ""),
      environmentName: String(projectedField(item, properties, "environmentName") ?? ""),
      environmentType: String(projectedField(item, properties, "environmentType") ?? ""),
      isManagedEnvironment: typeof isManaged === "boolean" ? isManaged : isManaged === "true" ? true : isManaged === "false" ? false : null,
      environmentGroup: String(projectedField(item, properties, "environmentGroup") ?? ""),
      environmentGroupId: String(projectedField(item, properties, "environmentGroupId") ?? ""),
      createdAt: projectedField(item, properties, "createdAt") ?? null,
      createdBy: String(projectedField(item, properties, "createdBy") ?? ""),
      ownerId: String(projectedField(item, properties, "ownerId") ?? ""),
      lastModifiedAt: projectedField(item, properties, "lastModifiedAt") ?? null,
      lastModifiedBy: String(projectedField(item, properties, "lastModifiedBy") ?? ""),
      isQuarantined: isQuarantined === true || isQuarantined === "true",
      subtype: String(projectedField(item, properties, "subType", "subtype") ?? ""),
      trigger: String(projectedField(item, properties, "trigger") ?? ""),
      triggerOperation: String(projectedField(item, properties, "triggerOperation") ?? ""),
      createdIn: String(projectedField(item, properties, "createdIn") ?? ""),
      connectors,
      connectorIds: connectors.map(connector => connector.connectorId).filter(Boolean),
      connectorDataLoaded: hasField(item, properties, "powerPlatformConnectors"),
      appModuleId: String(projectedField(item, properties, "appModuleId") ?? ""),
      logicalName: String(projectedField(item, properties, "logicalName") ?? ""),
      workflowEntityId: String(projectedField(item, properties, "workflowEntityId") ?? ""),
      description: String(projectedField(item, properties, "description") ?? ""),
      raw: item
    };
  });

  const environmentMap = new Map();
  for (const item of [...items, ...environmentItems]) {
    if (item.type !== "microsoft.powerplatform/environments") continue;
    const label = item.displayName || item.id;
    const keys = [item.id, item.environmentId, item.environmentIdRaw]
      .map(canonicalEnvironmentId)
      .filter(Boolean);
    keys.forEach(key => environmentMap.set(normaliseText(key), label));
  }

  for (const item of items) {
    if (!item.environmentName && item.environmentId) {
      item.environmentName = environmentMap.get(normaliseText(canonicalEnvironmentId(item.environmentId))) ?? "";
    }
    if (item.type === "microsoft.powerplatform/environments" && !item.environmentName) {
      item.environmentName = item.displayName;
    }
  }

  return items;
}

export function calculateMetrics(items) {
  const byType = {};
  for (const item of items) byType[item.typeKey] = (byType[item.typeKey] ?? 0) + 1;

  const now = Date.now();
  const staleThreshold = 365 * 24 * 60 * 60 * 1000;
  const isDefault = item => {
    const name = normaliseText(item.environmentName);
    const type = normaliseText(item.environmentType);
    return name === "default" || type === "default" || name.includes("default environment");
  };

  return {
    total: items.length,
    byType,
    defaultEnvironment: items.filter(item => item.environmentId && isDefault(item)).length,
    missingOwner: items.filter(item => item.category !== "platform" && !item.ownerId).length,
    quarantined: items.filter(item => item.isQuarantined).length,
    stale: items.filter(item => {
      const date = safeDate(item.lastModifiedAt ?? item.createdAt);
      return date && now - date.getTime() > staleThreshold;
    }).length
  };
}

export function getFilterOptions(items, locale) {
  return {
    types: uniqueSorted(items.map(item => item.typeKey), locale),
    environments: uniqueSorted(items.map(item => item.environmentName || item.environmentId), locale),
    regions: uniqueSorted(items.map(item => item.location), locale)
  };
}

export function filterInventory(items, filters) {
  const search = normaliseText(filters.search);
  const owner = normaliseText(filters.owner);
  const from = filters.createdFrom ? new Date(`${filters.createdFrom}T00:00:00`) : null;
  const to = filters.createdTo ? new Date(`${filters.createdTo}T23:59:59.999`) : null;

  return items.filter(item => {
    if (filters.type && item.typeKey !== filters.type) return false;
    if (filters.environment && (item.environmentName || item.environmentId) !== filters.environment) return false;
    if (filters.region && item.location !== filters.region) return false;
    if (owner && !normaliseText(item.ownerId).includes(owner)) return false;

    const created = safeDate(item.createdAt);
    if (from && (!created || created < from)) return false;
    if (to && (!created || created > to)) return false;

    if (!search) return true;
    const haystack = [
      item.displayName,
      item.id,
      item.type,
      item.environmentName,
      item.environmentId,
      item.location,
      item.ownerId,
      item.createdBy,
      item.connectorIds.join(" "),
      item.trigger,
      item.triggerOperation
    ].map(normaliseText).join(" ");
    return haystack.includes(search);
  });
}

export function sortInventory(items, sort) {
  const multiplier = sort.direction === "asc" ? 1 : -1;
  const key = sort.key;
  return [...items].sort((a, b) => {
    const left = a[key];
    const right = b[key];
    if (key.endsWith("At")) {
      return ((safeDate(left)?.getTime() ?? 0) - (safeDate(right)?.getTime() ?? 0)) * multiplier;
    }
    return String(left ?? "").localeCompare(String(right ?? ""), undefined, { numeric: true, sensitivity: "base" }) * multiplier;
  });
}

export function buildEnvironmentRows(items) {
  const environments = items.filter(item => item.type === "microsoft.powerplatform/environments");
  const counts = new Map();
  for (const item of items) {
    if (item.category === "platform" || !item.environmentId) continue;
    const key = normaliseText(item.environmentId);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return environments
    .map(environment => ({
      ...environment,
      resourceCount: counts.get(normaliseText(environment.id)) ?? 0,
      managedLabel: environment.isManagedEnvironment === true
        ? "managed"
        : environment.isManagedEnvironment === false
          ? "notManaged"
          : "unknown"
    }))
    .sort((a, b) => String(a.displayName).localeCompare(String(b.displayName), undefined, { sensitivity: "base" }));
}

export function flattenObject(input, prefix = "", output = []) {
  if (input === null || input === undefined) {
    if (prefix) output.push({ path: prefix, value: input });
    return output;
  }
  if (Array.isArray(input)) {
    if (!input.length && prefix) output.push({ path: prefix, value: [] });
    input.forEach((value, index) => flattenObject(value, `${prefix}[${index}]`, output));
    return output;
  }
  if (typeof input === "object") {
    const entries = Object.entries(input);
    if (!entries.length && prefix) output.push({ path: prefix, value: {} });
    entries.forEach(([key, value]) => flattenObject(value, prefix ? `${prefix}.${key}` : key, output));
    return output;
  }
  output.push({ path: prefix, value: input });
  return output;
}

function firstDefined(...values) {
  return values.find(value => value !== undefined && value !== null && value !== "");
}

function connectorGroup(policy, names) {
  const properties = parseProperties(policy?.properties);
  const groups = asArray(firstDefined(properties.connectorGroups, policy?.connectorGroups));
  const wanted = names.map(normaliseText);
  return groups.find(group => wanted.includes(normaliseText(group?.classification ?? group?.name ?? group?.type))) ?? null;
}

function connectorCount(group) {
  if (!group) return 0;
  const connectors = firstDefined(group.connectors, group.connectorIds, group.values, []);
  return Array.isArray(connectors) ? connectors.length : 0;
}

export function normaliseDlpPolicies(rawPolicies) {
  return asArray(rawPolicies).map((policy, index) => {
    const properties = parseProperties(policy?.properties);
    const business = connectorGroup(policy, ["business", "confidential", "businessdataonly"]);
    const nonBusiness = connectorGroup(policy, ["nonbusiness", "general", "nobusinessdataallowed"]);
    const blocked = connectorGroup(policy, ["blocked"]);
    const environments = asArray(firstDefined(
      properties.environments,
      policy?.environments,
      properties.environmentIds,
      policy?.environmentIds
    )).map(environment => typeof environment === "string"
      ? environment
      : firstDefined(environment?.name, environment?.id, environment?.environmentId, ""))
      .filter(Boolean);
    const environmentType = String(firstDefined(properties.environmentType, policy?.environmentType, properties.scope, ""));
    const type = String(firstDefined(properties.type, policy?.type, ""));
    const scope = environments.length
      ? "selectedEnvironments"
      : /except/i.test(environmentType) || /except/i.test(type)
        ? "allExceptSelected"
        : /single|environment/i.test(environmentType) && !/all/i.test(environmentType)
          ? "selectedEnvironments"
          : "allEnvironments";

    return {
      rowId: String(firstDefined(policy?.name, policy?.id, `dlp-${index}`)),
      id: String(firstDefined(policy?.name, policy?.id, "")),
      displayName: String(firstDefined(properties.displayName, policy?.displayName, policy?.name, `Policy ${index + 1}`)),
      scope,
      environmentType,
      environments,
      defaultClassification: String(firstDefined(
        properties.defaultConnectorsClassification,
        properties.defaultConnectorClassification,
        policy?.defaultConnectorsClassification,
        ""
      )),
      businessCount: connectorCount(business),
      nonBusinessCount: connectorCount(nonBusiness),
      blockedCount: connectorCount(blocked),
      businessConnectors: asArray(business?.connectors),
      nonBusinessConnectors: asArray(nonBusiness?.connectors),
      blockedConnectors: asArray(blocked?.connectors),
      createdAt: firstDefined(properties.createdTime, properties.createdAt, policy?.createdTime, policy?.createdAt, null),
      modifiedAt: firstDefined(properties.lastModifiedTime, properties.modifiedTime, properties.lastModifiedAt, policy?.lastModifiedTime, null),
      raw: policy
    };
  }).sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" }));
}

export function getTenantGovernanceHighlights(settings) {
  const flattened = flattenObject(settings);
  const byPath = new Map(flattened.map(item => [normaliseText(item.path), item]));
  const definitions = [
    ["disableEnvironmentCreationByNonAdminUsers", "restrictEnvironmentCreation", true, "critical"],
    ["disableTrialEnvironmentCreationByNonAdminUsers", "restrictTrialCreation", true, "critical"],
    ["powerPlatform.governance.disableDeveloperEnvironmentCreationByNonAdminusers", "restrictDeveloperCreation", true, "warning"],
    ["disablePortalsCreationByNonAdminUsers", "restrictPowerPagesCreation", true, "warning"],
    ["powerPlatform.powerApps.disableShareWithEveryone", "disableShareWithEveryone", true, "warning"],
    ["powerPlatform.powerApps.DisableConnectionSharingWithEveryone", "disableConnectionSharing", true, "warning"],
    ["powerPlatform.governance.enableDefaultEnvironmentRouting", "defaultEnvironmentRouting", true, "info"],
    ["powerPlatform.governance.policy.enableDesktopFlowDataPolicyManagement", "desktopFlowDlp", true, "info"],
    ["powerPlatform.powerApps.enableGuestsToMake", "guestMakers", false, "warning"],
    ["powerPlatform.licensing.enableTenantCapacityReportForEnvironmentAdmins", "capacityReportEnvironmentAdmins", true, "info"]
  ];

  return definitions.map(([path, labelKey, desired, severity]) => {
    const exact = byPath.get(normaliseText(path));
    const fallback = flattened.find(item => normaliseText(item.path).endsWith(normaliseText(path)));
    const entry = exact ?? fallback;
    const value = entry?.value;
    const available = entry !== undefined;
    return {
      path: entry?.path ?? path,
      labelKey,
      value,
      desired,
      available,
      healthy: available ? value === desired : null,
      severity
    };
  });
}

export function normaliseEnvironmentDetails(raw, environmentId = "") {
  const properties = parseProperties(raw?.properties);
  return {
    id: firstDefined(raw?.id, raw?.name, environmentId, ""),
    displayName: firstDefined(properties.displayName, raw?.displayName, raw?.name, environmentId, ""),
    type: firstDefined(properties.type, raw?.type, ""),
    state: firstDefined(properties.state, raw?.state, ""),
    geo: firstDefined(properties.geo, raw?.geo, raw?.location, ""),
    url: firstDefined(properties.url, raw?.url, ""),
    domainName: firstDefined(properties.domainName, raw?.domainName, ""),
    version: firstDefined(properties.version, raw?.version, ""),
    protectionLevel: firstDefined(properties.protectionLevel, raw?.protectionLevel, ""),
    securityGroupId: firstDefined(properties.securityGroupId, raw?.securityGroupId, ""),
    environmentGroupId: firstDefined(properties.environmentGroupId, raw?.environmentGroupId, ""),
    adminMode: firstDefined(properties.adminMode, raw?.adminMode, ""),
    backgroundOperationsState: firstDefined(properties.backgroundOperationsState, raw?.backgroundOperationsState, ""),
    raw
  };
}

export function groupEnvironmentSettings(rawSettings) {
  const root = rawSettings?.properties && typeof rawSettings.properties === "object"
    ? rawSettings.properties
    : rawSettings ?? {};
  const entries = flattenObject(root).map(item => {
    const head = item.path.includes("_") ? item.path.split("_")[0] : item.path.split(".")[0];
    const group = normaliseText(head).includes("copilotstudio")
      ? "copilotStudio"
      : normaliseText(head).includes("powerapps")
        ? "powerApps"
        : normaliseText(head).includes("powerpages")
          ? "powerPages"
          : normaliseText(head).includes("d365")
            ? "dynamics365"
            : normaliseText(item.path).includes("storageaccesssignature")
              ? "security"
              : "other";
    return { ...item, group };
  });
  return entries.reduce((groups, entry) => {
    (groups[entry.group] ??= []).push(entry);
    return groups;
  }, {});
}


export function normaliseSummaryRows(rows, environmentRows = []) {
  const byType = {};
  const byRegion = {};
  const byEnvironment = {};
  let total = 0;

  for (const row of rows ?? []) {
    const count = Number(row?.resourceCount ?? row?.count_ ?? row?.count ?? 0) || 0;
    const type = String(row?.type ?? "").toLowerCase();
    const typeKey = getResourceTypeKey(type);
    const region = String(row?.location ?? "");
    byType[typeKey] = (byType[typeKey] ?? 0) + count;
    if (region) byRegion[region] = (byRegion[region] ?? 0) + count;
    total += count;
  }

  for (const row of environmentRows ?? []) {
    const count = Number(row?.resourceCount ?? row?.count_ ?? row?.count ?? 0) || 0;
    const environmentId = canonicalEnvironmentId(row?.environmentId);
    if (environmentId) byEnvironment[normaliseText(environmentId)] = (byEnvironment[normaliseText(environmentId)] ?? 0) + count;
  }

  return { total, byType, byRegion, byEnvironment, rows: rows ?? [], environmentRows: environmentRows ?? [] };
}

export function buildEnvironmentRowsFromSummary(environmentItems, summary = null) {
  const counts = summary?.byEnvironment ?? {};
  return environmentItems
    .filter(item => item.type === "microsoft.powerplatform/environments")
    .map(item => ({ ...item, resourceCount: counts[normaliseText(item.id)] ?? 0 }))
    .sort((a, b) => (b.resourceCount - a.resourceCount)
      || String(a.displayName || a.id).localeCompare(String(b.displayName || b.id), undefined, { sensitivity: "base" }));
}

export function mergeUniqueResources(...datasets) {
  const byKey = new Map();
  for (const item of datasets.flat()) {
    if (!item) continue;
    const key = `${normaliseText(item.type)}:${normaliseText(item.id)}`;
    if (!byKey.has(key)) byKey.set(key, item);
  }
  return [...byKey.values()];
}
