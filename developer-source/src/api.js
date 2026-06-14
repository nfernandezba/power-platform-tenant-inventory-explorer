import {
  ENDPOINTS,
  INVENTORY_QUERY,
  QUERY_RESOURCE_TYPES,
  RESOURCE_TYPE_BY_KEY
} from "./constants.js";
import { sleep } from "./helpers.js";

export class InventoryApiError extends Error {
  constructor(message, {
    status = 0,
    code = "unknown",
    details = "",
    correlationId = "",
    endpoint = "",
    partial = null,
    queryName = "",
    requestBody = ""
  } = {}) {
    super(message);
    this.name = "InventoryApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.correlationId = correlationId;
    this.endpoint = endpoint;
    this.partial = partial;
    this.queryName = queryName;
    this.requestBody = requestBody;
  }
}

const quote = value => `'${String(value).replaceAll("'", "''")}'`;

const BASIC_RESOURCE_FIELDS = [
  "name",
  "tenantId",
  "type",
  "location",
  "properties.displayName",
  "properties.environmentId",
  "properties.ownerId",
  "properties.createdAt",
  "properties.createdBy",
  "properties.lastModifiedAt",
  "properties.lastModifiedBy",
  "properties.isQuarantined",
  "properties.subType",
  "properties.trigger",
  "properties.triggerOperation",
  "properties.createdIn"
];

const DETAIL_RESOURCE_FIELDS = [
  ...BASIC_RESOURCE_FIELDS,
  "properties.powerPlatformConnectors",
  "properties.appModuleId",
  "properties.logicalName",
  "properties.workflowEntityId"
];

const ENVIRONMENT_FIELDS = [
  "name",
  "tenantId",
  "type",
  "location",
  "properties.displayName",
  "properties.environmentType",
  "properties.isManaged",
  "properties.environmentGroup",
  "properties.environmentGroupId",
  "properties.lastModifiedAt",
  "properties.description"
];

function options(skipToken = "", top = INVENTORY_QUERY.pageSize) {
  const numericTop = Number(top);
  const safeTop = Math.min(1000, Math.max(1, Number.isFinite(numericTop) ? Math.trunc(numericTop) : INVENTORY_QUERY.pageSize));
  return { Top: safeTop, Skip: 0, SkipToken: skipToken };
}

export function createSummaryQuery(skipToken = "") {
  return {
    TableName: "PowerPlatformResources",
    Clauses: [
      { $type: "where", FieldName: "type", Operator: "in~", Values: QUERY_RESOURCE_TYPES.map(quote) },
      {
        $type: "summarize",
        SummarizeClauseExpression: {
          OperatorName: "count",
          OperatorFieldName: "resourceCount",
          FieldList: ["type", "location"]
        }
      },
      { $type: "orderby", FieldNamesAscDesc: { resourceCount: "desc" } }
    ],
    Options: options(skipToken)
  };
}

// Optional compatibility query. It is intentionally isolated from the main
// Overview summary so a tenant-specific rejection cannot prevent the app from
// loading its type and region totals.
export function createEnvironmentCountQuery(skipToken = "") {
  const resourceTypes = QUERY_RESOURCE_TYPES.filter(type => !type.startsWith("microsoft.powerplatform/"));
  return {
    TableName: "PowerPlatformResources",
    Clauses: [
      { $type: "where", FieldName: "type", Operator: "in~", Values: resourceTypes.map(quote) },
      { $type: "extend", FieldName: "environmentId", Expression: "tostring(properties.environmentId)" },
      {
        $type: "summarize",
        SummarizeClauseExpression: {
          OperatorName: "count",
          OperatorFieldName: "resourceCount",
          FieldList: ["environmentId"]
        }
      },
      { $type: "orderby", FieldNamesAscDesc: { resourceCount: "desc" } }
    ],
    Options: options(skipToken)
  };
}

export function createEnvironmentQuery(skipToken = "") {
  return {
    TableName: "PowerPlatformResources",
    Clauses: [
      {
        $type: "where",
        FieldName: "type",
        Operator: "in~",
        Values: [
          quote("microsoft.powerplatform/environments"),
          quote("microsoft.powerplatform/environmentgroups")
        ]
      },
      { $type: "project", FieldList: ENVIRONMENT_FIELDS },
      { $type: "orderby", FieldNamesAscDesc: { "properties.displayName": "asc" } }
    ],
    Options: options(skipToken)
  };
}

export function createRecentQuery(limit = INVENTORY_QUERY.recentLimit) {
  const resourceTypes = QUERY_RESOURCE_TYPES.filter(type => !type.startsWith("microsoft.powerplatform/"));
  return {
    TableName: "PowerPlatformResources",
    Clauses: [
      { $type: "where", FieldName: "type", Operator: "in~", Values: resourceTypes.map(quote) },
      { $type: "project", FieldList: BASIC_RESOURCE_FIELDS },
      { $type: "orderby", FieldNamesAscDesc: { "tostring(properties.lastModifiedAt)": "desc" } },
      { $type: "take", TakeCount: limit }
    ],
    Options: options("", limit)
  };
}

export function createResourceTypeQuery(resourceTypeOrKey, skipToken = "", { environmentId = "", includeDetails = false } = {}) {
  const resourceType = RESOURCE_TYPE_BY_KEY[resourceTypeOrKey] ?? resourceTypeOrKey;
  const clauses = [
    { $type: "where", FieldName: "type", Operator: "==", Values: [quote(resourceType)] }
  ];
  if (environmentId) {
    clauses.push({
      $type: "where",
      FieldName: "properties.environmentId",
      Operator: "==",
      Values: [String(environmentId)]
    });
  }
  clauses.push(
    { $type: "project", FieldList: includeDetails ? DETAIL_RESOURCE_FIELDS : BASIC_RESOURCE_FIELDS },
    { $type: "orderby", FieldNamesAscDesc: { "tostring(properties.lastModifiedAt)": "desc" } }
  );
  return {
    TableName: "PowerPlatformResources",
    Clauses: clauses,
    Options: options(skipToken)
  };
}

export function createResourceDetailQuery(resourceType, resourceId) {
  return {
    TableName: "PowerPlatformResources",
    Clauses: [
      { $type: "where", FieldName: "type", Operator: "==", Values: [quote(resourceType)] },
      { $type: "where", FieldName: "name", Operator: "==", Values: [quote(resourceId)] },
      { $type: "project", FieldList: DETAIL_RESOURCE_FIELDS },
      { $type: "take", TakeCount: 1 }
    ],
    Options: options("", 1)
  };
}

// Kept for backwards compatibility with existing tests and integrations.
export function createInventoryQuery(skipToken = "") {
  return {
    Options: options(skipToken),
    TableName: "PowerPlatformResources",
    Clauses: [
      { $type: "extend", FieldName: "joinKey", Expression: "tolower(tostring(properties.environmentId))" },
      {
        $type: "join",
        JoinKind: "leftouter",
        RightTable: {
          TableName: "PowerPlatformResources",
          Clauses: [
            { $type: "where", FieldName: "type", Operator: "==", Values: [quote("microsoft.powerplatform/environments")] },
            {
              $type: "project",
              FieldList: [
                "joinKey = tolower(name)",
                "environmentName = properties.displayName",
                "environmentRegion = location",
                "environmentType = properties.environmentType",
                "isManagedEnvironment = properties.isManaged"
              ]
            }
          ]
        },
        LeftColumnName: "joinKey",
        RightColumnName: "joinKey"
      },
      { $type: "where", FieldName: "type", Operator: "in~", Values: QUERY_RESOURCE_TYPES.map(quote) },
      { $type: "orderby", FieldNamesAscDesc: { "tostring(properties.createdAt)": "desc" } }
    ]
  };
}

function retryDelay(response, attempt) {
  const retryAfter = Number(response?.headers?.get?.("Retry-After"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) return retryAfter * 1000;
  return Math.min(16000, 1000 * 2 ** attempt) + Math.floor(Math.random() * 500);
}

async function parseErrorResponse(response) {
  const correlationId = response.headers.get("x-ms-correlation-request-id")
    ?? response.headers.get("x-ms-request-id")
    ?? "";
  let details = "";
  try {
    const json = await response.clone().json();
    details = json?.error?.message ?? json?.message ?? JSON.stringify(json);
  } catch {
    try { details = await response.text(); } catch { details = ""; }
  }
  return { correlationId, details };
}

function errorCode(status) {
  if (status === 401) return "unauthorised";
  if (status === 403) return "forbidden";
  if (status === 404) return "not-found";
  if (status === 429) return "throttled";
  return "http";
}

function createRequestSignal(externalSignal, timeoutMs) {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromExternal = () => controller.abort(externalSignal?.reason ?? new DOMException("Cancelled", "AbortError"));
  if (externalSignal?.aborted) abortFromExternal();
  else externalSignal?.addEventListener("abort", abortFromExternal, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException("Request timed out", "TimeoutError"));
  }, timeoutMs);
  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    clear: () => {
      clearTimeout(timer);
      externalSignal?.removeEventListener?.("abort", abortFromExternal);
    }
  };
}

export async function requestJson(accessToken, url, {
  method = "GET",
  body,
  signal,
  maxRetries = 4,
  timeoutMs = INVENTORY_QUERY.requestTimeoutMs,
  headers = {}
} = {}) {
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const requestSignal = createRequestSignal(signal, timeoutMs);
    let response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...headers
        },
        ...(body !== undefined ? { body: typeof body === "string" ? body : JSON.stringify(body) } : {}),
        signal: requestSignal.signal
      });
    } catch (error) {
      const timedOut = requestSignal.timedOut();
      requestSignal.clear();
      if (signal?.aborted) throw signal.reason ?? error;
      if (timedOut && attempt < maxRetries) {
        await sleep(Math.min(8000, 1000 * 2 ** attempt), signal);
        continue;
      }
      if (timedOut) {
        throw new InventoryApiError("The request exceeded the configured timeout.", {
          code: "timeout",
          details: `${timeoutMs} ms`,
          endpoint: url
        });
      }
      if (error?.name === "AbortError") throw error;
      throw new InventoryApiError("The network request failed.", {
        code: error instanceof TypeError ? "cors-or-network" : "network",
        details: error?.message ?? "",
        endpoint: url
      });
    }
    requestSignal.clear();

    if (response.ok) {
      if (response.status === 204) return null;
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    }

    const retryable = response.status === 429 || [502, 503, 504].includes(response.status);
    if (retryable && attempt < maxRetries) {
      await sleep(retryDelay(response, attempt), signal);
      continue;
    }

    const { correlationId, details } = await parseErrorResponse(response);
    throw new InventoryApiError(`Power Platform API returned HTTP ${response.status}.`, {
      status: response.status,
      code: errorCode(response.status),
      details,
      correlationId,
      endpoint: url
    });
  }
  throw new InventoryApiError("The retry loop ended unexpectedly.", { endpoint: url });
}

export async function executeInventoryQuery(accessToken, query, { signal, queryName = "inventory-query" } = {}) {
  try {
    const response = await requestJson(accessToken, ENDPOINTS.inventory, {
      method: "POST",
      body: query,
      signal
    });
    return {
      data: Array.isArray(response?.data) ? response.data : [],
      skipToken: response?.skipToken || "",
      totalRecords: Number.isFinite(response?.totalRecords) ? response.totalRecords : null,
      count: Number.isFinite(response?.count) ? response.count : 0,
      resultTruncated: Boolean(response?.resultTruncated)
    };
  } catch (error) {
    if (error instanceof InventoryApiError) {
      error.queryName ||= queryName;
      error.requestBody ||= JSON.stringify(query, null, 2);
    }
    throw error;
  }
}

export async function queryInventoryPage(accessToken, query, { signal } = {}) {
  return executeInventoryQuery(accessToken, query, { signal });
}

export async function queryAllPages(accessToken, createQuery, {
  signal,
  onProgress,
  startSkipToken = "",
  maxPages = INVENTORY_QUERY.maxInventoryPages,
  initialItems = [],
  queryName = "inventory-query"
} = {}) {
  const items = [...initialItems];
  const seenTokens = new Set();
  let skipToken = startSkipToken;
  let pageNumber = 0;
  let totalRecords = null;

  do {
    if (pageNumber >= maxPages) {
      throw new InventoryApiError("The query reached the configured page limit.", {
        code: "page-limit",
        details: String(maxPages),
        partial: { items, skipToken, totalRecords, pageNumber, complete: false }
      });
    }
    if (skipToken && seenTokens.has(skipToken)) {
      throw new InventoryApiError("The API returned a repeated pagination token.", {
        code: "repeated-token",
        partial: { items, skipToken, totalRecords, pageNumber, complete: false }
      });
    }
    if (skipToken) seenTokens.add(skipToken);

    pageNumber += 1;
    let page;
    try {
      page = await executeInventoryQuery(accessToken, createQuery(skipToken), { signal, queryName });
    } catch (error) {
      if (error instanceof InventoryApiError) {
        error.partial = { items, skipToken, totalRecords, pageNumber: pageNumber - 1, complete: false };
      }
      throw error;
    }
    items.push(...page.data);
    skipToken = page.skipToken;
    totalRecords = page.totalRecords ?? totalRecords;
    onProgress?.({
      pageNumber,
      loadedRecords: items.length,
      totalRecords,
      hasNextPage: Boolean(skipToken),
      resultTruncated: page.resultTruncated
    });
  } while (skipToken);

  return { items, skipToken: "", totalRecords, pageNumber, complete: true };
}

export async function queryBootstrapSummary(accessToken, { signal, onProgress } = {}) {
  const primary = await queryAllPages(
    accessToken,
    token => createSummaryQuery(token),
    { signal, onProgress, maxPages: 100, queryName: "overview-summary-by-type-and-region" }
  );

  let environmentItems = [];
  let environmentCountWarning = null;
  try {
    const environmentCounts = await queryAllPages(
      accessToken,
      token => createEnvironmentCountQuery(token),
      { signal, maxPages: 100, queryName: "overview-summary-by-environment" }
    );
    environmentItems = environmentCounts.items;
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    environmentCountWarning = error instanceof InventoryApiError ? error : null;
  }

  return { ...primary, environmentItems, environmentCountWarning };
}

export async function queryBootstrapEnvironments(accessToken, { signal, onProgress } = {}) {
  return queryAllPages(accessToken, token => createEnvironmentQuery(token), { signal, onProgress, maxPages: 100, queryName: "overview-environments" });
}

export async function queryBootstrapRecent(accessToken, { signal } = {}) {
  return executeInventoryQuery(accessToken, createRecentQuery(), { signal, queryName: "overview-recent-resources" });
}

export async function queryResourceTypePage(accessToken, resourceTypeOrKey, {
  signal,
  skipToken = "",
  environmentId = ""
} = {}) {
  return executeInventoryQuery(accessToken, createResourceTypeQuery(resourceTypeOrKey, skipToken, { environmentId }), { signal, queryName: `resources-${resourceTypeOrKey}` });
}

export async function queryResourceTypeAll(accessToken, resourceTypeOrKey, {
  signal,
  startSkipToken = "",
  initialItems = [],
  environmentId = "",
  onProgress
} = {}) {
  return queryAllPages(
    accessToken,
    token => createResourceTypeQuery(resourceTypeOrKey, token, { environmentId }),
    { signal, startSkipToken, initialItems, onProgress, queryName: `resources-${resourceTypeOrKey}` }
  );
}

export async function queryResourceDetail(accessToken, resourceType, resourceId, { signal } = {}) {
  const result = await executeInventoryQuery(accessToken, createResourceDetailQuery(resourceType, resourceId), { signal, queryName: "resource-detail" });
  return result.data[0] ?? null;
}

export async function queryAllInventory(accessToken, { signal, onProgress } = {}) {
  const result = await queryAllPages(accessToken, token => createInventoryQuery(token), { signal, onProgress, queryName: "legacy-full-inventory" });
  return result.items;
}

export async function queryTenantSettings(accessToken, { signal } = {}) {
  return requestJson(accessToken, ENDPOINTS.tenantSettings, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    maxRetries: 2,
    timeoutMs: INVENTORY_QUERY.adminTimeoutMs
  });
}

export async function queryDlpPolicies(accessToken, { signal, onProgress } = {}) {
  const values = [];
  const seenLinks = new Set();
  let nextLink = ENDPOINTS.dlpPolicies;
  let pageNumber = 0;

  while (nextLink) {
    if (pageNumber >= INVENTORY_QUERY.maxDlpPages) {
      throw new InventoryApiError("The DLP query reached the configured page limit.", {
        code: "page-limit",
        partial: { items: values, pageNumber, complete: false }
      });
    }
    if (seenLinks.has(nextLink)) {
      throw new InventoryApiError("The DLP endpoint returned a repeated nextLink.", {
        code: "repeated-token",
        partial: { items: values, pageNumber, complete: false }
      });
    }
    seenLinks.add(nextLink);
    pageNumber += 1;

    let page;
    try {
      page = await requestJson(accessToken, nextLink, {
        signal,
        maxRetries: 2,
        timeoutMs: INVENTORY_QUERY.requestTimeoutMs
      });
    } catch (error) {
      if (error instanceof InventoryApiError) {
        error.partial = { items: values, pageNumber: pageNumber - 1, complete: false };
      }
      throw error;
    }

    const rows = Array.isArray(page?.value)
      ? page.value
      : Array.isArray(page)
        ? page
        : Array.isArray(page?.data)
          ? page.data
          : [];
    values.push(...rows);
    nextLink = page?.nextLink ?? page?.["@odata.nextLink"] ?? "";
    onProgress?.({ pageNumber, loadedRecords: values.length, hasNextPage: Boolean(nextLink) });
  }
  return values;
}

function unwrapObjectResult(response) {
  if (Array.isArray(response?.objectResult)) return response.objectResult[0] ?? {};
  if (response?.objectResult && typeof response.objectResult === "object") return response.objectResult;
  return response ?? {};
}

export async function queryEnvironmentDetails(accessToken, environmentId, { signal } = {}) {
  return unwrapObjectResult(await requestJson(accessToken, ENDPOINTS.environmentDetails(environmentId), {
    signal,
    timeoutMs: INVENTORY_QUERY.adminTimeoutMs
  }));
}

export async function queryEnvironmentSettings(accessToken, environmentId, { signal } = {}) {
  return unwrapObjectResult(await requestJson(accessToken, ENDPOINTS.environmentSettings(environmentId), {
    signal,
    timeoutMs: INVENTORY_QUERY.adminTimeoutMs
  }));
}
