import { csvCell, downloadBlob } from "./helpers.js";

function dateForFilename() {
  return new Date().toISOString().slice(0, 10);
}

export function exportCsv(items) {
  const headers = [
    "Name",
    "Resource Type",
    "Resource ID",
    "Environment",
    "Environment ID",
    "Environment Type",
    "Region",
    "Owner ID",
    "Created By",
    "Created At",
    "Last Modified At",
    "Managed Environment",
    "Quarantined",
    "Trigger",
    "Trigger Operation",
    "Connectors"
  ];
  const rows = items.map(item => [
    item.displayName,
    item.type,
    item.id,
    item.environmentName,
    item.environmentId,
    item.environmentType,
    item.location,
    item.ownerId,
    item.createdBy,
    item.createdAt,
    item.lastModifiedAt,
    item.isManagedEnvironment,
    item.isQuarantined,
    item.trigger,
    item.triggerOperation,
    item.connectorIds.join("; ")
  ]);
  const content = `\uFEFF${[headers, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n")}`;
  downloadBlob(`power-platform-inventory-${dateForFilename()}.csv`, content, "text/csv;charset=utf-8");
}

export function exportJson(items) {
  const cleanItems = items.map(({ raw, ...item }) => item);
  const content = JSON.stringify({
    exportedAt: new Date().toISOString(),
    recordCount: cleanItems.length,
    records: cleanItems
  }, null, 2);
  downloadBlob(`power-platform-inventory-${dateForFilename()}.json`, content, "application/json;charset=utf-8");
}
