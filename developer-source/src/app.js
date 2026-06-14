import {
  APP_NAME,
  APP_VERSION,
  BOOKS,
  LINKEDIN_URL,
  POWER_PLATFORM_SCOPES,
  RESOURCE_TYPES,
  RESOURCE_TYPE_BY_KEY,
  STORAGE_KEYS
} from "./constants.js";
import { translations } from "./i18n.js";
import {
  acquireBapToken,
  acquireInventoryToken,
  acquirePowerPlatformToken,
  clearStoredConfig,
  getActiveAccount,
  initialiseAuth,
  loadStoredConfig,
  saveConfig,
  signIn,
  signOut
} from "./auth.js";
import {
  InventoryApiError,
  queryBootstrapEnvironments,
  queryBootstrapRecent,
  queryBootstrapSummary,
  queryDlpPolicies,
  queryEnvironmentDetails,
  queryEnvironmentSettings,
  queryResourceDetail,
  queryResourceTypeAll,
  queryResourceTypePage,
  queryTenantSettings
} from "./api.js";
import {
  buildEnvironmentRowsFromSummary,
  calculateMetrics,
  filterInventory,
  flattenObject,
  getFilterOptions,
  getTenantGovernanceHighlights,
  groupEnvironmentSettings,
  mergeUniqueResources,
  normaliseDlpPolicies,
  normaliseEnvironmentDetails,
  normaliseInventory,
  normaliseSummaryRows,
  sortInventory
} from "./data.js";
import {
  demoDlpPolicies,
  demoEnvironmentDetails,
  demoEnvironmentSettings,
  demoRawItems,
  demoTenantSettings
} from "./demo-data.js";
import { clearTenantCache, deleteCachedDataset, getCachedDataset, setCachedDataset } from "./cache.js";
import { exportCsv, exportJson } from "./export.js";
import { escapeHtml, formatDate, getRedirectUri, isValidGuid, normaliseText, truncateMiddle } from "./helpers.js";

const root = document.getElementById("app");
const RESOURCE_TAB_KEYS = [
  "canvasApps", "modelDrivenApps", "codeApps", "appBuilderApps",
  "cloudFlows", "agentFlows", "workflowAgentFlows", "copilotAgents"
];
const BOOTSTRAP_KEYS = ["summary", "environments", "recent"];

function emptySourceState() {
  return { status: "idle", error: null, loadedAt: null, fromCache: false, controller: null, progress: null };
}
function emptyResourceState() {
  return {
    status: "idle",
    raw: [],
    items: [],
    totalRecords: null,
    skipToken: "",
    pageNumber: 0,
    complete: false,
    loadedAt: null,
    error: null,
    fromCache: false,
    controller: null
  };
}
function makeResourceStates() {
  return Object.fromEntries(RESOURCE_TAB_KEYS.map(key => [key, emptyResourceState()]));
}

const state = {
  language: "es",
  config: null,
  account: null,
  demo: false,
  activeTab: "overview",
  resourceTab: "all",
  bootstrap: {
    summary: { ...emptySourceState(), data: { total: 0, byType: {}, byRegion: {}, byEnvironment: {}, rows: [] } },
    environments: { ...emptySourceState(), raw: [], items: [] },
    recent: { ...emptySourceState(), raw: [], items: [] }
  },
  resources: makeResourceStates(),
  bulkLoad: { status: "idle", currentKey: "", completed: 0, total: 0, controller: null, error: null },
  detailCache: {},
  filters: { search: "", type: "", environment: "", region: "", owner: "", createdFrom: "", createdTo: "" },
  sort: { key: "displayName", direction: "asc" },
  page: 1,
  pageSize: 50,
  error: null,
  authInitialising: false,
  cacheRestoring: false,
  tenantGovernance: { ...emptySourceState(), data: null },
  dlp: { ...emptySourceState(), raw: [], policies: [] },
  environmentSettings: {
    ...emptySourceState(), selectedId: "", details: null, settings: null, groups: {}, detailsError: null, settingsError: null
  }
};

function t() { return translations[state.language]; }
function tenantId() { return state.demo ? "11111111-2222-4333-8444-555555555555" : state.account?.tenantId ?? state.config?.tenantId ?? ""; }
function environmentItems() { return state.bootstrap.environments.items ?? []; }
function loadedResources() { return mergeUniqueResources(...RESOURCE_TAB_KEYS.map(key => state.resources[key].items)); }
function knownResources() { return mergeUniqueResources(loadedResources(), state.bootstrap.recent.items ?? []); }
function summaryData() { return state.bootstrap.summary.data ?? { total: 0, byType: {}, byRegion: {}, byEnvironment: {}, rows: [] }; }
function expectedCount(key) { return Number(summaryData().byType?.[key] ?? 0); }
function latestRefresh() {
  const dates = [
    ...BOOTSTRAP_KEYS.map(key => state.bootstrap[key].loadedAt),
    ...RESOURCE_TAB_KEYS.map(key => state.resources[key].loadedAt)
  ].filter(Boolean).map(value => new Date(value));
  return dates.length ? new Date(Math.max(...dates.map(date => date.getTime()))) : null;
}
function hasBootstrapData() {
  return BOOTSTRAP_KEYS.some(key => state.bootstrap[key].status === "loaded" || state.bootstrap[key].status === "partial");
}
function loadedResourceCount() { return loadedResources().length; }

function loadLanguage() {
  const saved = localStorage.getItem(STORAGE_KEYS.language);
  if (saved === "es" || saved === "en") return saved;
  return navigator.language?.toLowerCase().startsWith("es") ? "es" : "en";
}
function setLanguage(language) {
  state.language = language;
  localStorage.setItem(STORAGE_KEYS.language, language);
  document.documentElement.lang = language;
  renderApp();
}

function linkedInIcon() {
  return `<svg class="linkedin-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="24" height="24" rx="4" fill="#0A66C2"/><path fill="#fff" d="M7.2 9.2H4.4V18h2.8V9.2ZM5.8 5a1.63 1.63 0 1 0 0 3.26A1.63 1.63 0 0 0 5.8 5Zm6 4.2H9.1V18h2.8v-4.35c0-1.15.22-2.26 1.64-2.26 1.4 0 1.42 1.31 1.42 2.34V18h2.8v-4.82c0-2.37-.51-4.2-3.28-4.2-1.33 0-2.22.73-2.58 1.42h-.04V9.2Z"/></svg>`;
}
function flagEs() { return `<svg class="flag-svg" viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="30" height="20" fill="#74ACDF"/><rect y="6.67" width="30" height="6.66" fill="#fff"/><circle cx="15" cy="10" r="2.1" fill="#F6B40E"/></svg>`; }
function flagEn() { return `<svg class="flag-svg" viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="30" height="20" fill="#fff"/><g fill="#B22234"><rect y="0" width="30" height="1.54"/><rect y="3.08" width="30" height="1.54"/><rect y="6.16" width="30" height="1.54"/><rect y="9.24" width="30" height="1.54"/><rect y="12.32" width="30" height="1.54"/><rect y="15.4" width="30" height="1.54"/><rect y="18.46" width="30" height="1.54"/></g><rect width="12.6" height="10.77" fill="#3C3B6E"/></svg>`; }

function renderHeader() {
  return `<header id="banner">
    <a class="logo-wrap" href="#top" aria-label="${escapeHtml(APP_NAME)}"><img class="brand-logo" src="./assets/nfba-logo.svg" alt="NFBA" /></a>
    <div class="brand-text"><div class="tool-name">${escapeHtml(APP_NAME)}</div><div class="tool-desc">${escapeHtml(t().bannerDesc)}</div></div>
    <span class="badge">v${APP_VERSION}</span>
    <a class="linkedin-profile" href="${LINKEDIN_URL}" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn · Nico Fernandez">${linkedInIcon()}<span>Nico Fernandez</span></a>
    <div class="lang-switch" role="group" aria-label="Idioma / Language">
      <button class="lang-btn ${state.language === "es" ? "active" : ""}" data-lang="es" type="button">${flagEs()}<span>ES</span></button>
      <button class="lang-btn ${state.language === "en" ? "active" : ""}" data-lang="en" type="button">${flagEn()}<span>EN</span></button>
    </div>
  </header>`;
}
function renderProgressNav() {
  const connected = Boolean(state.account || state.demo);
  const inventoryReady = hasBootstrapData();
  const detailLoaded = loadedResourceCount() > 0;
  const phases = [
    { label: t().connection, done: connected, active: !connected, target: "main" },
    { label: t().inventory, done: inventoryReady, active: connected && !inventoryReady, target: "workspace-tabs" },
    { label: t().insights, done: detailLoaded, active: inventoryReady, target: "workspace" }
  ];
  return `<nav id="bpf-wrap" aria-label="Progress"><div id="bpf">${phases.map((phase, index) => `<button class="bpf-phase ${phase.done ? "done" : ""} ${phase.active ? "active" : ""}" data-scroll="${phase.target}" type="button"><span class="bpf-circle">${phase.done ? "✓" : index + 1}</span><span class="bpf-label">${escapeHtml(phase.label)}</span></button>`).join("")}</div></nav>`;
}
function renderFooter() {
  return `<footer id="footer"><div>${escapeHtml(t().footer)}</div><a class="linkedin-profile footer-linkedin" href="${LINKEDIN_URL}" target="_blank" rel="noopener noreferrer">${linkedInIcon()}<span>Nico Fernandez</span></a><div>${escapeHtml(t().sourceCode)}</div></footer>`;
}

function renderApp() {
  root.innerHTML = `<div id="top"></div>${renderHeader()}${renderProgressNav()}<main id="main">${renderMain()}</main>${renderFooter()}<div id="toast" role="status" aria-live="polite"></div><div id="modal-root"></div>`;
  bindGlobalEvents();
  if (state.account || state.demo) bindWorkspaceEvents();
}
function renderMain() {
  if (state.authInitialising) return renderLoading(t().authInitialising ?? t().loadingTitle, t().loadingOptional, null);
  if (!state.account && !state.demo) return renderConnection();
  return renderDashboard();
}
function renderConnection() {
  const remembered = loadStoredConfig();
  const clientId = state.config?.clientId ?? remembered?.clientId ?? "";
  const directoryId = state.config?.tenantId ?? remembered?.tenantId ?? "";
  const rememberChecked = Boolean(localStorage.getItem(STORAGE_KEYS.rememberedConfig));
  const redirectUri = getRedirectUri();
  return `<section class="connection-hero">
    <div class="hero-logo-wrap"><img src="./assets/nfba-logo.svg" class="hero-logo" alt="" /></div>
    <p class="eyebrow">COE TOOLKIT</p><h1>${escapeHtml(t().connectTitle)}</h1><p class="hero-copy">${escapeHtml(t().connectBody)}</p>
    ${state.error ? renderInlineError(state.error) : ""}
    <form id="connection-form" class="connection-card" novalidate>
      <div class="form-grid">
        <label class="field"><span>${escapeHtml(t().clientId)}</span><input id="client-id" type="text" autocomplete="off" spellcheck="false" value="${escapeHtml(clientId)}" placeholder="00000000-0000-0000-0000-000000000000" /><small id="client-id-error" class="field-error" hidden>${escapeHtml(t().invalidGuid)}</small></label>
        <label class="field"><span>${escapeHtml(t().tenantId)}</span><input id="tenant-id" type="text" autocomplete="off" spellcheck="false" value="${escapeHtml(directoryId)}" placeholder="00000000-0000-0000-0000-000000000000" /><small id="tenant-id-error" class="field-error" hidden>${escapeHtml(t().invalidGuid)}</small></label>
      </div>
      <label class="remember-row"><input id="remember-config" type="checkbox" ${rememberChecked ? "checked" : ""} /><span>${escapeHtml(t().remember)}</span></label>
      <div class="redirect-box"><div><span class="redirect-label">${escapeHtml(t().redirectUri)}</span><code>${escapeHtml(redirectUri)}</code></div><button id="copy-redirect" type="button" class="btn btn-small btn-ghost">${escapeHtml(t().copy)}</button></div>
      <div class="connection-actions"><button class="btn btn-primary" type="submit">${escapeHtml(t().connect)}</button><button id="demo-button" class="btn btn-ghost" type="button">${escapeHtml(t().demo)}</button></div>
    </form>
    <details class="setup-guide"><summary>${escapeHtml(t().requiredSetup)}</summary><ol>${t().setupItems.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ol></details>
    <p class="privacy-note">${escapeHtml(t().privacy)}</p>
  </section>`;
}
function renderLoading(title, body, progress) {
  return `<section class="loading-screen"><div class="loader-orbit" aria-hidden="true"><span></span><span></span><span></span></div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(body)}</p>${progress ? `<div class="progress-card"><div><span>${escapeHtml(t().page)}</span><strong>${progress.pageNumber || 0}</strong></div><div><span>${escapeHtml(t().recordsLoaded)}</span><strong>${Number(progress.loadedRecords || 0).toLocaleString(t().locale)}</strong></div><div><span>${escapeHtml(t().totalExpected)}</span><strong>${progress.totalRecords ? Number(progress.totalRecords).toLocaleString(t().locale) : "—"}</strong></div></div>` : ""}</section>`;
}
function renderInlineError(error) {
  const diagnosticParts = [error?.details, error?.queryName ? `Query: ${error.queryName}` : "", error?.endpoint ? `Endpoint: ${error.endpoint}` : "", error?.requestBody ? `Request body:
${error.requestBody}` : ""].filter(Boolean);
  return `<div class="error-card" role="alert"><div class="error-icon">!</div><div><h2>${escapeHtml(t().errorTitle)}</h2><p>${escapeHtml(getErrorMessage(error))}</p>${diagnosticParts.length ? `<details><summary>${escapeHtml(t().rawDetails)}</summary><pre>${escapeHtml(diagnosticParts.join("\n\n"))}</pre></details>` : ""}${error?.correlationId ? `<small>Correlation ID: ${escapeHtml(error.correlationId)}</small>` : ""}</div></div>`;
}
function getErrorMessage(error) {
  if (!error) return t().loadFailed;
  if (error.status === 400) return t().error400;
  if (error.code === "unauthorised" || error.status === 401) return t().error401;
  if (error.code === "forbidden" || error.status === 403) return t().error403;
  if (error.code === "not-found" || error.status === 404) return t().error404;
  if (error.code === "throttled" || error.status === 429) return t().error429;
  if (error.code === "timeout") return t().errorTimeout;
  if (error.code === "page-limit") return t().errorPageLimit;
  if (error.code === "repeated-token") return t().errorRepeatedToken;
  if (error.code === "cors-or-network") return t().errorCors;
  if (error.code === "network") return t().errorNetwork;
  if (error.code === "redirect") return t().errorRedirect;
  return error.message ?? t().loadFailed;
}

function renderDashboard() {
  const accountName = state.demo ? "demo.admin@contoso.com" : state.account?.username ?? state.account?.name ?? "—";
  return `${state.demo ? `<div class="demo-banner"><span>${escapeHtml(t().demoBanner)}</span><button id="leave-demo" class="btn btn-small btn-ghost" type="button">${escapeHtml(t().leaveDemo)}</button></div>` : ""}
    <section class="session-card"><div class="session-status"><span class="status-dot"></span><div><strong>${escapeHtml(t().connected)}</strong><span>${escapeHtml(accountName)}</span></div></div><div class="session-meta"><div><span>${escapeHtml(t().tenant)}</span><code>${escapeHtml(truncateMiddle(tenantId()))}</code></div><div><span>${escapeHtml(t().lastRefresh)}</span><strong>${latestRefresh() ? escapeHtml(formatDate(latestRefresh(), t().locale, true)) : "—"}</strong></div></div><div class="session-actions"><button id="refresh-overview" class="btn btn-primary" type="button">${escapeHtml(t().refreshOverview)}</button><button id="load-full-inventory" class="btn btn-ghost" type="button" ${state.bulkLoad.status === "loading" ? "disabled" : ""}>${escapeHtml(t().loadFullInventory)}</button><button id="clear-cache" class="btn btn-ghost" type="button">${escapeHtml(t().clearCache)}</button><button id="change-config-button" class="btn btn-ghost" type="button">${escapeHtml(t().changeConfig)}</button><button id="disconnect-button" class="btn btn-ghost danger" type="button">${escapeHtml(t().disconnect)}</button></div></section>
    ${state.error ? renderInlineError(state.error) : ""}
    ${state.bulkLoad.status === "loading" ? renderBulkBanner() : ""}
    ${renderWorkspaceTabs()}
    <div id="workspace">${renderActiveTab()}</div>
    ${renderLimitations()}${renderBooks()}`;
}
function renderBulkBanner() {
  const current = state.bulkLoad.currentKey ? t()[state.bulkLoad.currentKey] : "—";
  return `<div class="bulk-banner"><div><strong>${escapeHtml(t().fullInventoryRunning)}</strong><span>${escapeHtml(current)} · ${state.bulkLoad.completed}/${state.bulkLoad.total}</span></div><button id="cancel-bulk" class="btn btn-small btn-ghost" type="button">${escapeHtml(t().cancel)}</button></div>`;
}
function renderWorkspaceTabs() {
  const tabs = [
    ["overview", t().overview], ["environments", t().environmentsTab], ["resources", t().resources],
    ["governance", t().tenantGovernance], ["dlp", t().dlpPolicies], ["env-settings", t().environmentSettings]
  ];
  return `<nav id="workspace-tabs" class="workspace-tabs" aria-label="Tenant inventory sections">${tabs.map(([key, label]) => `<button type="button" class="workspace-tab ${state.activeTab === key ? "active" : ""}" data-tab="${key}">${escapeHtml(label)}</button>`).join("")}</nav>${state.activeTab === "resources" ? renderResourceTabs() : ""}`;
}
function renderResourceTabs() {
  return `<nav class="resource-tabs" aria-label="Resource types"><button type="button" class="resource-tab ${state.resourceTab === "all" ? "active" : ""}" data-resource-tab="all">${escapeHtml(t().allResources)} <span>${loadedResourceCount().toLocaleString(t().locale)}</span></button>${RESOURCE_TAB_KEYS.map(key => {
    const dataset = state.resources[key];
    const statusClass = dataset.status === "loaded" ? "query-loaded" : dataset.status === "partial" ? "query-partial" : dataset.status === "loading" ? "query-loading" : dataset.status === "error" ? "query-error" : "query-idle";
    return `<button type="button" class="resource-tab ${state.resourceTab === key ? "active" : ""}" data-resource-tab="${key}">${escapeHtml(t()[key])} <span>${expectedCount(key).toLocaleString(t().locale)}</span><i class="query-dot ${statusClass}" aria-hidden="true"></i></button>`;
  }).join("")}</nav>`;
}
function renderActiveTab() {
  if (state.activeTab === "environments") return renderEnvironmentsTab();
  if (state.activeTab === "resources") return renderResourcesTab();
  if (state.activeTab === "governance") return renderTenantGovernanceTab();
  if (state.activeTab === "dlp") return renderDlpTab();
  if (state.activeTab === "env-settings") return renderEnvironmentSettingsTab();
  return renderOverviewTab();
}

function renderOverviewTab() {
  return `<section class="section-block"><div class="section-intro"><p class="eyebrow">TENANT INVENTORY</p><h1>${escapeHtml(t().overviewTitle)}</h1><p>${escapeHtml(t().overviewOptimisedBody)}</p></div>${renderKpis()}${renderBootstrapStatus()}${renderInsights()}${renderQueryCentre(true)}${renderDataSources()}${renderRecentResources()}${renderExportToolbar()}</section>`;
}
function renderKpis() {
  const summary = summaryData();
  const cards = [
    ["totalResources", summary.total, "spectrum"], ["environments", summary.byType.environments ?? 0, "indigo"],
    ["canvasApps", summary.byType.canvasApps ?? 0, "blue"], ["cloudFlows", summary.byType.cloudFlows ?? 0, "teal"],
    ["copilotAgents", summary.byType.copilotAgents ?? 0, "magenta"], ["agentFlows", summary.byType.agentFlows ?? 0, "gold"]
  ];
  return `<div class="kpi-grid">${cards.map(([label, value, accent]) => `<article class="kpi-card accent-${accent}"><span>${escapeHtml(t()[label])}</span><strong>${Number(value).toLocaleString(t().locale)}</strong></article>`).join("")}</div>`;
}
function renderBootstrapStatus() {
  const cards = BOOTSTRAP_KEYS.map(key => renderDatasetCard(key, state.bootstrap[key], key === "summary" ? summaryData().rows.length : state.bootstrap[key].items?.length ?? 0, null));
  return `<section class="panel query-status-panel"><div class="panel-heading"><div><h2>${escapeHtml(t().quickOverviewQueries)}</h2><p>${escapeHtml(t().quickOverviewHelp)}</p></div><button id="refresh-bootstrap" class="btn btn-small btn-ghost" type="button">${escapeHtml(t().refreshOverview)}</button></div><div class="query-grid bootstrap-grid">${cards.join("")}</div></section>`;
}
function renderInsights() {
  const summary = summaryData();
  const detailMetrics = calculateMetrics(loadedResources());
  const signals = [["defaultEnvironment", detailMetrics.defaultEnvironment, "gold"], ["missingOwner", detailMetrics.missingOwner, "magenta"], ["quarantined", detailMetrics.quarantined, "red"], ["stale", detailMetrics.stale, "blue"]];
  const typeCounts = Object.entries(summary.byType ?? {}).filter(([key]) => RESOURCE_TAB_KEYS.includes(key)).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
  const max = Math.max(1, ...typeCounts.map(item => item.count));
  return `<div class="insights-grid"><article class="panel"><div class="panel-heading"><div><h2>${escapeHtml(t().governanceSignals)}</h2><p>${escapeHtml(t().partialSignalsHelp.replace("{count}", loadedResourceCount().toLocaleString(t().locale)))}</p></div><span class="coverage-badge">${loadedResourceCount().toLocaleString(t().locale)} / ${summary.total.toLocaleString(t().locale)}</span></div><div class="signal-grid">${signals.map(([label, value, accent]) => `<div class="signal-card"><span class="signal-icon accent-bg-${accent}">${Number(value).toLocaleString(t().locale)}</span><strong>${escapeHtml(t()[label])}</strong></div>`).join("")}</div></article><article class="panel"><h2>${escapeHtml(t().distribution)}</h2><div class="bar-list">${typeCounts.map(item => `<div class="bar-row"><div class="bar-label"><span>${escapeHtml(t()[item.key] ?? t().resourceTypeUnknown)}</span><strong>${item.count.toLocaleString(t().locale)}</strong></div><div class="bar-track"><span style="width:${Math.max(3, Math.round(item.count / max * 100))}%"></span></div></div>`).join("") || `<p>${escapeHtml(t().noData)}</p>`}</div></article></div>`;
}
function queryStatusLabel(dataset) {
  if (dataset.status === "loading") return t().loading;
  if (dataset.status === "loaded") return dataset.fromCache ? t().loadedFromCache : t().loaded;
  if (dataset.status === "partial") return t().partial;
  if (dataset.status === "error") return t().unavailable;
  return t().notLoaded;
}
function renderDatasetCard(key, dataset, loaded, expected) {
  const percentage = expected ? Math.min(100, Math.round(loaded / expected * 100)) : dataset.status === "loaded" ? 100 : 0;
  const label = t()[key] ?? key;
  const diagnosticParts = [];
  if (dataset.error?.details) diagnosticParts.push(dataset.error.details);
  if (dataset.error?.queryName) diagnosticParts.push(`Query: ${dataset.error.queryName}`);
  if (dataset.error?.endpoint) diagnosticParts.push(`Endpoint: ${dataset.error.endpoint}`);
  if (dataset.error?.requestBody) diagnosticParts.push(`Request body:
${dataset.error.requestBody}`);
  const diagnostic = dataset.error && (diagnosticParts.length || dataset.error.correlationId)
    ? `<details class="query-error-details"><summary>${escapeHtml(t().rawDetails)}</summary>${diagnosticParts.length ? `<pre>${escapeHtml(diagnosticParts.join("\n\n"))}</pre>` : ""}${dataset.error.correlationId ? `<small>Correlation ID: ${escapeHtml(dataset.error.correlationId)}</small>` : ""}</details>`
    : "";
  return `<article class="query-card"><div class="query-card-head"><div><strong>${escapeHtml(label)}</strong><span class="query-state state-${dataset.status}">${escapeHtml(queryStatusLabel(dataset))}</span></div>${dataset.loadedAt ? `<time>${escapeHtml(formatDate(dataset.loadedAt, t().locale, true))}</time>` : ""}</div><div class="query-numbers"><span><b>${Number(loaded || 0).toLocaleString(t().locale)}</b>${expected !== null ? ` / ${Number(expected || 0).toLocaleString(t().locale)}` : ""}</span>${dataset.pageNumber ? `<small>${escapeHtml(t().pages)}: ${dataset.pageNumber}</small>` : ""}</div><div class="query-progress"><span style="width:${percentage}%"></span></div>${dataset.error ? `<small class="query-error-text">${escapeHtml(getErrorMessage(dataset.error))}</small>` : ""}${diagnostic}</article>`;
}
function renderQueryCentre(compact = false) {
  const cards = RESOURCE_TAB_KEYS.map(key => renderResourceQueryCard(key));
  return `<section class="panel query-centre ${compact ? "query-centre-compact" : ""}"><div class="panel-heading"><div><h2>${escapeHtml(t().queryCentre)}</h2><p>${escapeHtml(t().queryCentreHelp)}</p></div><div class="query-centre-actions"><button id="load-all-types" class="btn btn-small btn-primary" type="button" ${state.bulkLoad.status === "loading" ? "disabled" : ""}>${escapeHtml(t().loadAllRemaining)}</button>${state.bulkLoad.status === "loading" ? `<button id="cancel-bulk-query" class="btn btn-small btn-ghost" type="button">${escapeHtml(t().cancel)}</button>` : ""}</div></div><div class="query-grid">${cards.join("")}</div></section>`;
}
function renderResourceQueryCard(key) {
  const dataset = state.resources[key];
  const loaded = dataset.items.length;
  const expected = expectedCount(key);
  const primaryAction = dataset.status === "loading"
    ? `<button class="btn btn-small btn-ghost" data-query-action="cancel" data-query-key="${key}" type="button">${escapeHtml(t().cancel)}</button>`
    : dataset.complete
      ? `<button class="btn btn-small btn-ghost" data-query-action="reload" data-query-key="${key}" type="button">${escapeHtml(t().reload)}</button>`
      : loaded
        ? `<button class="btn btn-small btn-primary" data-query-action="next" data-query-key="${key}" type="button">${escapeHtml(t().loadNextPage)}</button>`
        : `<button class="btn btn-small btn-primary" data-query-action="first" data-query-key="${key}" type="button">${escapeHtml(t().loadFirstPage)}</button>`;
  const diagnosticParts = [dataset.error?.details, dataset.error?.queryName ? `Query: ${dataset.error.queryName}` : "", dataset.error?.endpoint ? `Endpoint: ${dataset.error.endpoint}` : "", dataset.error?.requestBody ? `Request body:
${dataset.error.requestBody}` : ""].filter(Boolean);
  const diagnostic = dataset.error && (diagnosticParts.length || dataset.error.correlationId)
    ? `<details class="query-error-details"><summary>${escapeHtml(t().rawDetails)}</summary>${diagnosticParts.length ? `<pre>${escapeHtml(diagnosticParts.join("\n\n"))}</pre>` : ""}${dataset.error.correlationId ? `<small>Correlation ID: ${escapeHtml(dataset.error.correlationId)}</small>` : ""}</details>`
    : "";
  return `<article class="query-card resource-query-card"><div class="query-card-head"><div><strong>${escapeHtml(t()[key])}</strong><span class="query-state state-${dataset.status}">${escapeHtml(queryStatusLabel(dataset))}</span></div><span class="expected-count">${expected.toLocaleString(t().locale)}</span></div><div class="query-numbers"><span><b>${loaded.toLocaleString(t().locale)}</b> / ${expected.toLocaleString(t().locale)}</span><small>${dataset.complete ? escapeHtml(t().complete) : dataset.skipToken ? escapeHtml(t().moreAvailable) : ""}</small></div><div class="query-progress"><span style="width:${expected ? Math.min(100, Math.round(loaded / expected * 100)) : dataset.complete ? 100 : 0}%"></span></div>${dataset.error ? `<small class="query-error-text">${escapeHtml(getErrorMessage(dataset.error))}</small>` : ""}${diagnostic}<div class="query-card-actions">${primaryAction}${!dataset.complete && loaded && dataset.status !== "loading" ? `<button class="btn btn-small btn-ghost" data-query-action="all" data-query-key="${key}" type="button">${escapeHtml(t().loadAllRemaining)}</button>` : ""}${loaded && dataset.status !== "loading" ? `<button class="text-button" data-query-action="clear" data-query-key="${key}" type="button">${escapeHtml(t().clear)}</button>` : ""}</div></article>`;
}
function sourceCard(label, source, badge = "") {
  return `<article class="source-card"><div><strong>${escapeHtml(label)}</strong>${badge ? `<span class="preview-badge">${escapeHtml(badge)}</span>` : ""}</div><span class="source-status source-${source.status}">${escapeHtml(queryStatusLabel(source))}</span></article>`;
}
function renderDataSources() {
  return `<section class="panel source-panel"><h2>${escapeHtml(t().dataSources)}</h2><div class="source-grid">${sourceCard("PowerPlatformResources · Summary", state.bootstrap.summary)}${sourceCard("PowerPlatformResources · Environments", state.bootstrap.environments)}${sourceCard("PowerPlatformResources · Resources", { status: loadedResourceCount() ? "partial" : "idle" })}${sourceCard(t().tenantGovernance, state.tenantGovernance, t().preview)}${sourceCard(t().dlpPolicies, state.dlp, t().legacy)}${sourceCard(t().environmentSettings, state.environmentSettings)}</div></section>`;
}
function renderRecentResources() {
  const recent = state.bootstrap.recent.items ?? [];
  return `<section class="panel"><div class="panel-heading"><div><h2>${escapeHtml(t().recentResources)}</h2><p>${escapeHtml(t().recentResourcesHelp)}</p></div></div><div class="compact-list">${recent.slice(0, 12).map(item => `<button type="button" class="compact-resource" data-detail="${escapeHtml(item.rowId)}"><span><strong>${escapeHtml(item.displayName || item.id)}</strong><small>${escapeHtml(t()[item.typeKey] ?? t().resourceTypeUnknown)} · ${escapeHtml(item.environmentName || "—")}</small></span><time>${escapeHtml(formatDate(item.lastModifiedAt ?? item.createdAt, t().locale))}</time></button>`).join("") || `<p>${escapeHtml(t().noData)}</p>`}</div></section>`;
}
function renderExportToolbar() {
  const loaded = loadedResourceCount();
  return `<div class="export-toolbar"><button id="export-pdf" class="btn btn-pdf" type="button"><span aria-hidden="true">▣</span><span>${escapeHtml(t().exportPdf)}</span></button><button id="export-csv" class="btn btn-ghost" type="button" ${!loaded ? "disabled" : ""}>${escapeHtml(t().exportCsv)}</button><button id="export-json" class="btn btn-ghost" type="button" ${!loaded ? "disabled" : ""}>${escapeHtml(t().exportJson)}</button><span class="export-scope">${escapeHtml(t().exportLoadedOnly.replace("{count}", loaded.toLocaleString(t().locale)))}</span></div>`;
}

function renderEnvironmentsTab() {
  const environments = buildEnvironmentRowsFromSummary(environmentItems(), summaryData());
  const source = state.bootstrap.environments;
  return `<section class="section-block"><div class="section-heading-row"><div><p class="eyebrow">ENVIRONMENT LEVEL</p><h1>${escapeHtml(t().environmentInventory)}</h1><p>${escapeHtml(t().environmentInventoryOptimisedBody)}</p></div><button id="refresh-environments" class="btn btn-primary" type="button">${escapeHtml(t().refreshEnvironments)}</button></div>${source.error ? renderInlineError(source.error) : ""}<div class="table-wrap environment-table"><table><thead><tr><th>${escapeHtml(t().environment)}</th><th>${escapeHtml(t().type)}</th><th>${escapeHtml(t().managed)}</th><th>${escapeHtml(t().region)}</th><th>${escapeHtml(t().resourceCount)}</th><th></th></tr></thead><tbody>${environments.map(environment => `<tr><td class="name-cell"><strong>${escapeHtml(environment.displayName || environment.id)}</strong><small>${escapeHtml(environment.id)}</small></td><td>${escapeHtml(environment.environmentType || "—")}</td><td><span class="status-pill ${environment.isManagedEnvironment ? "status-green" : "status-amber"}">${escapeHtml(environment.isManagedEnvironment ? t().managed : t().notManaged)}</span></td><td>${escapeHtml(environment.location || "—")}</td><td class="number-cell">${environment.resourceCount.toLocaleString(t().locale)}</td><td><div class="row-actions"><button type="button" class="btn btn-small btn-ghost" data-env-resource="${escapeHtml(environment.id)}">${escapeHtml(t().loadEnvironmentResources)}</button><button type="button" class="btn btn-small btn-ghost" data-env-settings="${escapeHtml(environment.id)}">${escapeHtml(t().openSettings)}</button></div></td></tr>`).join("") || `<tr><td colspan="6" class="empty-table">${escapeHtml(t().noData)}</td></tr>`}</tbody></table></div></section>`;
}

function renderResourcesTab() {
  const detail = state.resourceTab === "all" ? renderQueryCentre(false) : renderSingleResourceQuery(state.resourceTab);
  return `<section class="section-block inventory-section"><div class="section-heading-row"><div><p class="eyebrow">POWERPLATFORMRESOURCES</p><h1>${escapeHtml(t().resources)}</h1><p>${escapeHtml(t().manualResourcesHelp)}</p></div>${renderExportToolbar()}</div>${detail}${loadedResourceCount() ? `${renderFilters()}<div id="inventory-results">${renderInventoryResults()}</div>` : `<div class="empty-source"><span>＋</span><p>${escapeHtml(t().loadResourcesToExplore)}</p></div>`}</section>`;
}
function renderSingleResourceQuery(key) {
  const dataset = state.resources[key];
  const expected = expectedCount(key);
  return `<section class="panel single-query-panel"><div class="panel-heading"><div><h2>${escapeHtml(t()[key])}</h2><p>${escapeHtml(t().resourceQueryHelp.replace("{expected}", expected.toLocaleString(t().locale)))}</p></div><span class="coverage-badge">${dataset.items.length.toLocaleString(t().locale)} / ${expected.toLocaleString(t().locale)}</span></div>${renderResourceQueryCard(key)}</section>`;
}
function renderFilters() {
  const items = loadedResources();
  const options = getFilterOptions(items, t().locale);
  return `<div class="filter-panel"><div class="filter-title"><h3>${escapeHtml(t().filters)}</h3><button id="clear-filters" class="text-button" type="button">${escapeHtml(t().clearFilters)}</button></div><div class="filters-grid"><label class="field search-field"><span>${escapeHtml(t().search)}</span><input id="filter-search" type="search" value="${escapeHtml(state.filters.search)}" /></label>${state.resourceTab === "all" ? `<label class="field"><span>${escapeHtml(t().type)}</span><select id="filter-type"><option value="">${escapeHtml(t().allTypes)}</option>${options.types.filter(key => !["environments", "environmentGroups"].includes(key)).map(key => `<option value="${escapeHtml(key)}" ${state.filters.type === key ? "selected" : ""}>${escapeHtml(t()[key] ?? t().resourceTypeUnknown)}</option>`).join("")}</select></label>` : ""}<label class="field"><span>${escapeHtml(t().environment)}</span><select id="filter-environment"><option value="">${escapeHtml(t().allEnvironments)}</option>${options.environments.map(value => `<option value="${escapeHtml(value)}" ${state.filters.environment === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}</select></label><label class="field"><span>${escapeHtml(t().region)}</span><select id="filter-region"><option value="">${escapeHtml(t().allRegions)}</option>${options.regions.map(value => `<option value="${escapeHtml(value)}" ${state.filters.region === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}</select></label><label class="field"><span>${escapeHtml(t().ownerContains)}</span><input id="filter-owner" type="text" value="${escapeHtml(state.filters.owner)}" /></label><label class="field"><span>${escapeHtml(t().createdFrom)}</span><input id="filter-from" type="date" value="${escapeHtml(state.filters.createdFrom)}" /></label><label class="field"><span>${escapeHtml(t().createdTo)}</span><input id="filter-to" type="date" value="${escapeHtml(state.filters.createdTo)}" /></label></div></div>`;
}
function getProcessedItems() {
  const effective = { ...state.filters };
  if (state.resourceTab !== "all") effective.type = state.resourceTab;
  return sortInventory(filterInventory(loadedResources(), effective), state.sort);
}
function sortIndicator(key) { return state.sort.key !== key ? "↕" : state.sort.direction === "asc" ? "↑" : "↓"; }
function renderInventoryResults() {
  const processed = getProcessedItems();
  const totalPages = Math.max(1, Math.ceil(processed.length / state.pageSize));
  if (state.page > totalPages) state.page = totalPages;
  const start = (state.page - 1) * state.pageSize;
  const pageItems = processed.slice(start, start + state.pageSize);
  const rows = pageItems.map(item => `<tr><td class="name-cell"><button class="resource-link" data-detail="${escapeHtml(item.rowId)}" type="button">${escapeHtml(item.displayName || item.id || t().unknown)}</button><small>${escapeHtml(truncateMiddle(item.id, 9, 7))}</small></td><td><span class="type-pill accent-border-${escapeHtml(item.accent)}">${escapeHtml(t()[item.typeKey] ?? t().resourceTypeUnknown)}</span></td><td><span>${escapeHtml(item.environmentName || "—")}</span><small>${escapeHtml(item.environmentType || truncateMiddle(item.environmentId) || "")}</small></td><td>${escapeHtml(item.location || "—")}</td><td><code title="${escapeHtml(item.ownerId)}">${escapeHtml(item.ownerId ? truncateMiddle(item.ownerId) : "—")}</code></td><td>${escapeHtml(formatDate(item.createdAt, t().locale))}</td><td>${escapeHtml(formatDate(item.lastModifiedAt, t().locale))}</td><td><span class="on-demand-pill">${escapeHtml(item.connectorIds.length ? `${item.connectorIds.length}` : t().onDemand)}</span></td><td>${item.isQuarantined ? `<span class="status-pill status-red">${escapeHtml(t().quarantinedLabel)}</span>` : `<span class="status-pill status-green">${escapeHtml(t().active)}</span>`}</td></tr>`).join("");
  const headers = [["displayName", t().name], ["typeKey", t().type], ["environmentName", t().environment], ["location", t().region], ["ownerId", t().owner], ["createdAt", t().created], ["lastModifiedAt", t().modified]];
  return `<div class="table-summary"><span>${escapeHtml(t().showing)} <strong>${processed.length ? start + 1 : 0}–${Math.min(start + state.pageSize, processed.length)}</strong> ${escapeHtml(t().of)} <strong>${processed.length.toLocaleString(t().locale)}</strong> ${escapeHtml(t().records)}</span><label>${escapeHtml(t().rowsPerPage)}<select id="page-size"><option value="25" ${state.pageSize === 25 ? "selected" : ""}>25</option><option value="50" ${state.pageSize === 50 ? "selected" : ""}>50</option><option value="100" ${state.pageSize === 100 ? "selected" : ""}>100</option><option value="250" ${state.pageSize === 250 ? "selected" : ""}>250</option></select></label></div><div class="table-wrap"><table><thead><tr>${headers.map(([key, label]) => `<th><button class="sort-button" data-sort="${key}" type="button">${escapeHtml(label)} <span>${sortIndicator(key)}</span></button></th>`).join("")}<th>${escapeHtml(t().connectors)} <span class="preview-badge">${escapeHtml(t().onDemand)}</span></th><th>${escapeHtml(t().status)}</th></tr></thead><tbody>${rows || `<tr><td class="empty-table" colspan="9">${escapeHtml(t().noData)}</td></tr>`}</tbody></table></div><div class="pagination"><button id="page-prev" class="btn btn-small btn-ghost" type="button" ${state.page <= 1 ? "disabled" : ""}>${escapeHtml(t().previous)}</button><span>${state.page} / ${totalPages}</span><button id="page-next" class="btn btn-small btn-ghost" type="button" ${state.page >= totalPages ? "disabled" : ""}>${escapeHtml(t().next)}</button></div>`;
}

function renderOptionalHeader(title, body, sourceState, buttonId, buttonLabel, badges = []) {
  const loading = sourceState.status === "loading";
  return `<div class="section-heading-row"><div><p class="eyebrow">ADMINISTRATIVE SOURCE ${badges.map(badge => `· ${escapeHtml(badge)}`).join("")}</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(body)}</p></div><button id="${buttonId}" class="btn ${loading ? "btn-ghost" : "btn-primary"}" type="button">${escapeHtml(loading ? t().cancel : sourceState.status === "loaded" || sourceState.status === "partial" ? t().reload : buttonLabel)}</button></div>${sourceState.progress ? `<div class="inline-progress">${escapeHtml(t().pages)}: ${sourceState.progress.pageNumber ?? 0} · ${escapeHtml(t().recordsLoaded)}: ${Number(sourceState.progress.loadedRecords ?? 0).toLocaleString(t().locale)}</div>` : ""}${sourceState.error ? renderInlineError(sourceState.error) : ""}<p class="optional-source-help">${escapeHtml(t().optionalSourceHelp)}</p>`;
}
function renderTenantGovernanceTab() {
  const source = state.tenantGovernance;
  const header = renderOptionalHeader(t().tenantGovernanceTitle, t().tenantGovernanceBody, source, "load-governance", t().loadTenantGovernance, [t().preview]);
  if (!source.data) return `<section class="section-block">${header}${renderEmptySource()}</section>`;
  const highlights = getTenantGovernanceHighlights(source.data);
  const all = flattenObject(source.data).filter(entry => !/\[\d+\]/.test(entry.path));
  return `<section class="section-block">${header}<div class="governance-grid">${highlights.map(item => `<article class="governance-card ${item.healthy === false ? `severity-${item.severity}` : "severity-good"}"><div><strong>${escapeHtml(t()[item.labelKey])}</strong><code>${escapeHtml(item.path)}</code></div><span>${escapeHtml(formatValue(item.value))}</span><small>${escapeHtml(!item.available ? t().unavailable : item.healthy ? t().healthy : t().review)}</small></article>`).join("")}</div><details class="settings-raw"><summary>${escapeHtml(t().fullSettings)} (${all.length})</summary>${renderKeyValueTable(all)}</details></section>`;
}
function renderDlpTab() {
  const source = state.dlp;
  const header = renderOptionalHeader(t().dlpTitle, t().dlpBody, source, "load-dlp", t().loadDlp, [t().legacy]);
  if (!source.policies.length && source.status !== "loaded") return `<section class="section-block">${header}${renderEmptySource()}</section>`;
  const withBlocked = source.policies.filter(policy => policy.blockedCount > 0).length;
  return `<section class="section-block">${header}<div class="kpi-grid compact-kpis"><article class="kpi-card accent-indigo"><span>${escapeHtml(t().dlpPoliciesCount)}</span><strong>${source.policies.length}</strong></article><article class="kpi-card accent-teal"><span>${escapeHtml(t().policiesWithBlocked)}</span><strong>${withBlocked}</strong></article><article class="kpi-card accent-gold"><span>${escapeHtml(t().policiesWithoutBlocked)}</span><strong>${Math.max(0, source.policies.length - withBlocked)}</strong></article></div><div class="callout callout-warning">${escapeHtml(t().dlpCaution)}</div><div class="table-wrap"><table><thead><tr><th>${escapeHtml(t().policy)}</th><th>${escapeHtml(t().scope)}</th><th>${escapeHtml(t().business)}</th><th>${escapeHtml(t().nonBusiness)}</th><th>${escapeHtml(t().blocked)}</th><th>${escapeHtml(t().defaultGroup)}</th><th>${escapeHtml(t().modified)}</th></tr></thead><tbody>${source.policies.map(policy => `<tr><td class="name-cell"><strong>${escapeHtml(policy.displayName)}</strong><small>${escapeHtml(policy.id)}</small></td><td>${escapeHtml(scopeLabel(policy.scope))}${policy.environments.length ? `<small>${escapeHtml(policy.environments.map(id => truncateMiddle(id)).join(", "))}</small>` : ""}</td><td class="number-cell">${policy.businessCount}</td><td class="number-cell">${policy.nonBusinessCount}</td><td class="number-cell"><span class="status-pill ${policy.blockedCount ? "status-green" : "status-amber"}">${policy.blockedCount}</span></td><td>${escapeHtml(policy.defaultClassification || "—")}</td><td>${escapeHtml(formatDate(policy.modifiedAt ?? policy.createdAt, t().locale))}</td></tr>`).join("") || `<tr><td colspan="7" class="empty-table">${escapeHtml(t().noData)}</td></tr>`}</tbody></table></div></section>`;
}
function scopeLabel(scope) {
  if (scope === "selectedEnvironments") return t().selectedEnvironments;
  if (scope === "allExceptSelected") return t().allExceptSelected;
  return t().allEnvironmentsScope;
}
function renderEnvironmentSettingsTab() {
  const source = state.environmentSettings;
  const environments = buildEnvironmentRowsFromSummary(environmentItems(), summaryData());
  const selector = `<div class="environment-selector"><label class="field"><span>${escapeHtml(t().selectEnvironment)}</span><select id="environment-settings-select"><option value="">${escapeHtml(t().selectEnvironment)}</option>${environments.map(env => `<option value="${escapeHtml(env.id)}" ${source.selectedId === env.id ? "selected" : ""}>${escapeHtml(env.displayName || env.id)}</option>`).join("")}</select></label><button id="load-environment-settings" class="btn ${source.status === "loading" ? "btn-ghost" : "btn-primary"}" type="button" ${!source.selectedId ? "disabled" : ""}>${escapeHtml(source.status === "loading" ? t().cancel : t().loadEnvironmentSettings)}</button></div>`;
  const header = `<div class="section-heading-row"><div><p class="eyebrow">ENVIRONMENT MANAGEMENT API</p><h1>${escapeHtml(t().environmentSettingsTitle)}</h1><p>${escapeHtml(t().environmentSettingsBody)}</p></div></div>${selector}${source.error ? renderInlineError(source.error) : ""}<p class="optional-source-help">${escapeHtml(t().optionalSourceHelp)}</p>`;
  if (!source.details && !source.settings) return `<section class="section-block">${header}${renderEmptySource()}</section>`;
  return `<section class="section-block">${header}${source.details ? renderEnvironmentDetails(source.details) : source.detailsError ? renderInlineError(source.detailsError) : ""}${source.settings ? renderSettingsGroups(source.groups) : source.settingsError ? renderInlineError(source.settingsError) : ""}</section>`;
}
function renderEnvironmentDetails(details) {
  const fields = [["environmentId", details.id], ["name", details.displayName], ["type", details.type], ["state", details.state], ["region", details.geo], ["url", details.url], ["domain", details.domainName], ["version", details.version], ["protectionLevel", details.protectionLevel], ["securityGroup", details.securityGroupId], ["environmentGroup", details.environmentGroupId], ["adminMode", details.adminMode], ["backgroundOperations", details.backgroundOperationsState]];
  return `<section class="panel"><h2>${escapeHtml(t().details)}</h2><div class="detail-grid environment-detail-grid">${fields.map(([key, value]) => `<div><span>${escapeHtml(t()[key] ?? key)}</span>${key === "url" && value ? `<a href="${escapeHtml(value)}" target="_blank" rel="noopener noreferrer">${escapeHtml(value)}</a>` : `<strong>${escapeHtml(formatValue(value))}</strong>`}</div>`).join("")}</div></section>`;
}
function renderSettingsGroups(groups) {
  const order = ["copilotStudio", "powerApps", "powerPages", "dynamics365", "security", "other"];
  return `<section class="settings-groups"><h2>${escapeHtml(t().settings)}</h2>${order.filter(group => groups[group]?.length).map(group => `<details class="settings-group" ${group === "copilotStudio" || group === "powerApps" ? "open" : ""}><summary>${escapeHtml(t()[group])} <span>${groups[group].length}</span></summary>${renderKeyValueTable(groups[group])}</details>`).join("") || `<p>${escapeHtml(t().noData)}</p>`}</section>`;
}
function renderKeyValueTable(entries) {
  return `<div class="table-wrap key-value-table"><table><thead><tr><th>${escapeHtml(t().path)}</th><th>${escapeHtml(t().value)}</th></tr></thead><tbody>${entries.map(entry => `<tr><td><code>${escapeHtml(entry.path)}</code></td><td>${escapeHtml(formatValue(entry.value))}</td></tr>`).join("")}</tbody></table></div>`;
}
function renderEmptySource() { return `<div class="empty-source"><span>＋</span><p>${escapeHtml(t().optionalSourceHelp)}</p></div>`; }
function formatValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
function renderLimitations() { return `<details class="limitations"><summary>${escapeHtml(t().dataLimitations)}</summary><ul>${t().limitations.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul></details>`; }
function renderBooks() {
  return `<section class="books-cta"><div class="books-cta-header"><h2>${escapeHtml(t().booksTitle)}</h2><p>${escapeHtml(t().booksCopy)}</p></div><div class="books-grid">${BOOKS[state.language].map(book => `<article class="book-card"><div class="book-cover-wrap"><img class="book-cover" src="${escapeHtml(book.cover)}" alt="${escapeHtml(book.title)}" loading="lazy" /><div class="book-cover-fallback">${escapeHtml(book.title)}</div></div><div><h3>${escapeHtml(book.title)}</h3><p>${escapeHtml(book.author)}</p><a href="${escapeHtml(book.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t().viewAmazon)} ↗</a></div></article>`).join("")}</div></section>`;
}

function bindGlobalEvents() {
  document.querySelectorAll("[data-lang]").forEach(button => button.addEventListener("click", () => setLanguage(button.dataset.lang)));
  document.querySelectorAll("[data-scroll]").forEach(button => button.addEventListener("click", () => document.getElementById(button.dataset.scroll)?.scrollIntoView({ behavior: "smooth" })));
  document.getElementById("connection-form")?.addEventListener("submit", handleConnect);
  document.getElementById("copy-redirect")?.addEventListener("click", copyRedirectUri);
  document.getElementById("demo-button")?.addEventListener("click", enterDemoMode);
  document.querySelectorAll("#change-config-button").forEach(button => button.addEventListener("click", changeConfiguration));
  document.getElementById("disconnect-button")?.addEventListener("click", disconnect);
  document.getElementById("leave-demo")?.addEventListener("click", leaveDemoMode);
  document.getElementById("refresh-overview")?.addEventListener("click", () => loadBootstrap({ force: true }));
  document.getElementById("load-full-inventory")?.addEventListener("click", loadAllResourceTypes);
  document.getElementById("clear-cache")?.addEventListener("click", clearCurrentTenantCache);
  document.getElementById("cancel-bulk")?.addEventListener("click", () => state.bulkLoad.controller?.abort());
  document.querySelectorAll(".book-cover").forEach(image => image.addEventListener("error", () => { image.style.display = "none"; image.nextElementSibling.style.display = "flex"; }, { once: true }));
}
function bindWorkspaceEvents() {
  document.querySelectorAll("[data-tab]").forEach(button => button.addEventListener("click", () => {
    state.activeTab = button.dataset.tab;
    state.page = 1;
    renderApp();
  }));
  document.querySelectorAll("[data-resource-tab]").forEach(button => button.addEventListener("click", () => {
    state.resourceTab = button.dataset.resourceTab;
    state.page = 1;
    renderApp();
  }));
  document.querySelectorAll("[data-detail]").forEach(button => button.addEventListener("click", () => showResourceDetails(button.dataset.detail)));
  document.querySelectorAll("[data-env-settings]").forEach(button => button.addEventListener("click", () => {
    state.environmentSettings.selectedId = button.dataset.envSettings;
    state.activeTab = "env-settings";
    renderApp();
  }));
  document.querySelectorAll("[data-env-resource]").forEach(button => button.addEventListener("click", () => {
    state.filters.environment = environmentItems().find(item => item.id === button.dataset.envResource)?.displayName ?? "";
    state.activeTab = "resources";
    state.resourceTab = "all";
    state.page = 1;
    renderApp();
  }));
  document.querySelectorAll("[data-query-action]").forEach(button => button.addEventListener("click", () => handleQueryAction(button.dataset.queryKey, button.dataset.queryAction)));
  document.getElementById("refresh-bootstrap")?.addEventListener("click", () => loadBootstrap({ force: true }));
  document.getElementById("refresh-environments")?.addEventListener("click", () => loadBootstrap({ force: true, only: ["environments", "summary"] }));
  document.getElementById("load-all-types")?.addEventListener("click", loadAllResourceTypes);
  document.getElementById("cancel-bulk-query")?.addEventListener("click", () => state.bulkLoad.controller?.abort());
  document.getElementById("load-governance")?.addEventListener("click", () => state.tenantGovernance.status === "loading" ? state.tenantGovernance.controller?.abort() : loadTenantGovernance());
  document.getElementById("load-dlp")?.addEventListener("click", () => state.dlp.status === "loading" ? state.dlp.controller?.abort() : loadDlp());
  document.getElementById("environment-settings-select")?.addEventListener("change", event => {
    state.environmentSettings = { ...emptySourceState(), selectedId: event.target.value, details: null, settings: null, groups: {}, detailsError: null, settingsError: null };
    renderApp();
  });
  document.getElementById("load-environment-settings")?.addEventListener("click", () => state.environmentSettings.status === "loading" ? state.environmentSettings.controller?.abort() : loadSelectedEnvironmentSettings());
  document.getElementById("export-pdf")?.addEventListener("click", handlePdfExport);
  document.getElementById("export-csv")?.addEventListener("click", () => { exportCsv(getProcessedItems()); showToast(t().downloadWarning); });
  document.getElementById("export-json")?.addEventListener("click", () => { exportJson(getProcessedItems()); showToast(t().downloadWarning); });
  bindResourceFilters();
  bindResultsEvents();
}
function bindResourceFilters() {
  const bindings = [["filter-search", "search", "input"], ["filter-type", "type", "change"], ["filter-environment", "environment", "change"], ["filter-region", "region", "change"], ["filter-owner", "owner", "input"], ["filter-from", "createdFrom", "change"], ["filter-to", "createdTo", "change"]];
  let debounce;
  bindings.forEach(([id, key, eventName]) => document.getElementById(id)?.addEventListener(eventName, event => {
    state.filters[key] = event.target.value;
    state.page = 1;
    if (eventName === "input") { clearTimeout(debounce); debounce = setTimeout(renderResultsOnly, 180); }
    else renderResultsOnly();
  }));
  document.getElementById("clear-filters")?.addEventListener("click", () => {
    Object.keys(state.filters).forEach(key => { state.filters[key] = ""; });
    state.page = 1;
    renderApp();
  });
}
function bindResultsEvents() {
  document.querySelectorAll("[data-sort]").forEach(button => button.addEventListener("click", () => {
    const key = button.dataset.sort;
    if (state.sort.key === key) state.sort.direction = state.sort.direction === "asc" ? "desc" : "asc";
    else state.sort = { key, direction: "asc" };
    renderResultsOnly();
  }));
  document.getElementById("page-prev")?.addEventListener("click", () => { state.page = Math.max(1, state.page - 1); renderResultsOnly(); });
  document.getElementById("page-next")?.addEventListener("click", () => { state.page += 1; renderResultsOnly(); });
  document.getElementById("page-size")?.addEventListener("change", event => { state.pageSize = Number(event.target.value); state.page = 1; renderResultsOnly(); });
}
function renderResultsOnly() {
  const container = document.getElementById("inventory-results");
  if (!container) return;
  container.innerHTML = renderInventoryResults();
  bindResultsEvents();
  document.querySelectorAll("[data-detail]").forEach(button => button.addEventListener("click", () => showResourceDetails(button.dataset.detail)));
}

async function handleConnect(event) {
  event.preventDefault();
  const clientIdInput = document.getElementById("client-id");
  const tenantIdInput = document.getElementById("tenant-id");
  const clientId = clientIdInput.value.trim();
  const directoryId = tenantIdInput.value.trim();
  const clientValid = isValidGuid(clientId);
  const tenantValid = isValidGuid(directoryId);
  document.getElementById("client-id-error").hidden = clientValid;
  document.getElementById("tenant-id-error").hidden = tenantValid;
  clientIdInput.classList.toggle("invalid", !clientValid);
  tenantIdInput.classList.toggle("invalid", !tenantValid);
  if (!clientValid || !tenantValid) return;
  state.error = null;
  state.config = { clientId, tenantId: directoryId };
  saveConfig(state.config, document.getElementById("remember-config").checked);
  try { await initialiseAuth(state.config); await signIn(); }
  catch (error) { state.error = normaliseError(error); renderApp(); }
}
async function copyRedirectUri() { await navigator.clipboard.writeText(getRedirectUri()); showToast(t().copied); }

function resetData() {
  state.bootstrap = {
    summary: { ...emptySourceState(), data: { total: 0, byType: {}, byRegion: {}, byEnvironment: {}, rows: [] } },
    environments: { ...emptySourceState(), raw: [], items: [] },
    recent: { ...emptySourceState(), raw: [], items: [] }
  };
  state.resources = makeResourceStates();
  state.detailCache = {};
  state.bulkLoad = { status: "idle", currentKey: "", completed: 0, total: 0, controller: null, error: null };
}
function resetOptionalSources() {
  state.tenantGovernance = { ...emptySourceState(), data: null };
  state.dlp = { ...emptySourceState(), raw: [], policies: [] };
  state.environmentSettings = { ...emptySourceState(), selectedId: "", details: null, settings: null, groups: {}, detailsError: null, settingsError: null };
}
function buildDemoSummary(items) {
  const byType = {};
  const byRegion = {};
  const byEnvironment = {};
  for (const item of items) {
    byType[item.typeKey] = (byType[item.typeKey] ?? 0) + 1;
    if (item.location) byRegion[item.location] = (byRegion[item.location] ?? 0) + 1;
    if (item.environmentId) byEnvironment[normaliseText(item.environmentId)] = (byEnvironment[normaliseText(item.environmentId)] ?? 0) + 1;
  }
  return { total: items.length, byType, byRegion, byEnvironment, rows: [] };
}
function enterDemoMode() {
  resetData();
  resetOptionalSources();
  state.demo = true;
  state.account = { username: "demo.admin@contoso.com", tenantId: "11111111-2222-4333-8444-555555555555" };
  const all = normaliseInventory(demoRawItems);
  const env = all.filter(item => item.category === "platform");
  const resources = all.filter(item => item.category !== "platform");
  state.bootstrap.summary = { ...emptySourceState(), status: "loaded", data: buildDemoSummary(all), loadedAt: new Date() };
  state.bootstrap.environments = { ...emptySourceState(), status: "loaded", raw: demoRawItems.filter(item => item.type?.startsWith("microsoft.powerplatform/")), items: env, loadedAt: new Date() };
  state.bootstrap.recent = { ...emptySourceState(), status: "loaded", raw: [], items: [...resources].sort((a, b) => new Date(b.lastModifiedAt ?? b.createdAt ?? 0) - new Date(a.lastModifiedAt ?? a.createdAt ?? 0)).slice(0, 40), loadedAt: new Date() };
  for (const key of RESOURCE_TAB_KEYS) {
    const subset = resources.filter(item => item.typeKey === key);
    state.resources[key] = { ...emptyResourceState(), status: "loaded", raw: subset.map(item => item.raw), items: subset, totalRecords: subset.length, complete: true, loadedAt: new Date() };
  }
  state.tenantGovernance = { ...emptySourceState(), status: "loaded", data: demoTenantSettings, loadedAt: new Date() };
  state.dlp = { ...emptySourceState(), status: "loaded", raw: demoDlpPolicies, policies: normaliseDlpPolicies(demoDlpPolicies), loadedAt: new Date() };
  state.error = null;
  renderApp();
}
function leaveDemoMode() { state.demo = false; state.account = null; resetData(); resetOptionalSources(); renderApp(); }
async function changeConfiguration() {
  if (state.demo) return leaveDemoMode();
  try { await signOut(); }
  catch (error) { clearStoredConfig(); state.account = null; resetData(); resetOptionalSources(); state.error = normaliseError(error); renderApp(); }
}
async function disconnect() {
  if (state.demo) return leaveDemoMode();
  resetData(); resetOptionalSources(); state.account = null;
  try { await signOut(); }
  catch (error) { clearStoredConfig(); state.error = normaliseError(error); renderApp(); }
}

async function restoreCache() {
  if (!tenantId() || state.demo) return;
  state.cacheRestoring = true;
  try {
    const [summaryCache, envCache, recentCache, ...resourceCaches] = await Promise.all([
      getCachedDataset(tenantId(), "summary"),
      getCachedDataset(tenantId(), "environments"),
      getCachedDataset(tenantId(), "recent"),
      ...RESOURCE_TAB_KEYS.map(key => getCachedDataset(tenantId(), `resources:${key}`))
    ]);
    if (summaryCache?.data) state.bootstrap.summary = { ...emptySourceState(), status: "loaded", data: summaryCache.data, loadedAt: summaryCache.loadedAt, fromCache: true };
    if (envCache?.raw) {
      const items = normaliseInventory(envCache.raw);
      state.bootstrap.environments = { ...emptySourceState(), status: "loaded", raw: envCache.raw, items, loadedAt: envCache.loadedAt, fromCache: true };
    }
    if (recentCache?.raw) {
      state.bootstrap.recent = { ...emptySourceState(), status: "loaded", raw: recentCache.raw, items: normaliseInventory(recentCache.raw, environmentItems()), loadedAt: recentCache.loadedAt, fromCache: true };
    }
    RESOURCE_TAB_KEYS.forEach((key, index) => {
      const cache = resourceCaches[index];
      if (!cache?.raw) return;
      state.resources[key] = {
        ...emptyResourceState(),
        status: cache.complete ? "loaded" : "partial",
        raw: cache.raw,
        items: normaliseInventory(cache.raw, environmentItems()),
        totalRecords: cache.totalRecords,
        skipToken: cache.skipToken ?? "",
        pageNumber: cache.pageNumber ?? 0,
        complete: Boolean(cache.complete),
        loadedAt: cache.loadedAt,
        fromCache: true
      };
    });
  } catch (error) {
    console.warn("Cache restore failed", error);
  } finally {
    state.cacheRestoring = false;
  }
}
async function cacheBootstrap(key) {
  if (state.demo || !tenantId()) return;
  const source = state.bootstrap[key];
  const payload = key === "summary"
    ? { data: source.data, loadedAt: source.loadedAt }
    : { raw: source.raw, loadedAt: source.loadedAt };
  await setCachedDataset(tenantId(), key, payload).catch(error => console.warn("Cache write failed", error));
}
async function cacheResource(key) {
  if (state.demo || !tenantId()) return;
  const source = state.resources[key];
  await setCachedDataset(tenantId(), `resources:${key}`, {
    raw: source.raw,
    totalRecords: source.totalRecords,
    skipToken: source.skipToken,
    pageNumber: source.pageNumber,
    complete: source.complete,
    loadedAt: source.loadedAt
  }).catch(error => console.warn("Cache write failed", error));
}
async function clearCurrentTenantCache() {
  if (!tenantId() || state.demo) return;
  await clearTenantCache(tenantId());
  for (const key of BOOTSTRAP_KEYS) state.bootstrap[key].fromCache = false;
  for (const key of RESOURCE_TAB_KEYS) state.resources[key].fromCache = false;
  showToast(t().cacheCleared);
  renderApp();
}

async function loadBootstrap({ force = false, only = BOOTSTRAP_KEYS } = {}) {
  if (state.demo) return;
  state.error = null;
  only.forEach(key => {
    const existing = state.bootstrap[key];
    state.bootstrap[key] = { ...existing, status: "loading", error: null, controller: null, progress: null, fromCache: force ? false : existing.fromCache };
  });
  const controller = new AbortController();
  only.forEach(key => { state.bootstrap[key].controller = controller; });
  renderApp();
  try {
    const token = await acquireInventoryToken();
    if (!token) return;
    const jobs = only.map(key => {
      if (key === "summary") return queryBootstrapSummary(token, { signal: controller.signal, onProgress: progress => { state.bootstrap.summary.progress = progress; } });
      if (key === "environments") return queryBootstrapEnvironments(token, { signal: controller.signal, onProgress: progress => { state.bootstrap.environments.progress = progress; } });
      return queryBootstrapRecent(token, { signal: controller.signal });
    });
    const results = await Promise.allSettled(jobs);
    for (let index = 0; index < only.length; index += 1) {
      const key = only[index];
      const result = results[index];
      if (result.status === "fulfilled") {
        const loadedAt = new Date();
        if (key === "summary") {
          state.bootstrap.summary = { ...emptySourceState(), status: "loaded", data: normaliseSummaryRows(result.value.items, result.value.environmentItems), loadedAt, pageNumber: result.value.pageNumber };
        } else if (key === "environments") {
          const raw = result.value.items;
          state.bootstrap.environments = { ...emptySourceState(), status: "loaded", raw, items: normaliseInventory(raw), loadedAt };
          // Re-resolve environment names in already loaded datasets.
          state.bootstrap.recent.items = normaliseInventory(state.bootstrap.recent.raw ?? [], environmentItems());
          for (const resourceKey of RESOURCE_TAB_KEYS) state.resources[resourceKey].items = normaliseInventory(state.resources[resourceKey].raw, environmentItems());
        } else {
          const raw = result.value.data;
          state.bootstrap.recent = { ...emptySourceState(), status: "loaded", raw, items: normaliseInventory(raw, environmentItems()), loadedAt };
        }
        await cacheBootstrap(key);
      } else {
        const error = normaliseError(result.reason);
        state.bootstrap[key] = { ...state.bootstrap[key], status: "error", error, controller: null };
      }
    }
  } catch (error) {
    if (error?.name !== "AbortError") state.error = normaliseError(error);
  } finally {
    only.forEach(key => { state.bootstrap[key].controller = null; if (state.bootstrap[key].status === "loading") state.bootstrap[key].status = "idle"; });
    renderApp();
  }
}

async function handleQueryAction(key, action) {
  if (action === "cancel") { state.resources[key].controller?.abort(); return; }
  if (action === "clear") { await clearResourceDataset(key); return; }
  if (action === "reload") return loadResourceDataset(key, "first", { replace: true });
  return loadResourceDataset(key, action);
}
async function loadResourceDataset(key, mode = "first", { token = null, externalController = null, replace = false, suppressRender = false } = {}) {
  if (!RESOURCE_TAB_KEYS.includes(key)) return;
  const dataset = state.resources[key];
  if (state.demo) return;
  if (expectedCount(key) === 0) {
    state.resources[key] = { ...emptyResourceState(), status: "loaded", totalRecords: 0, complete: true, loadedAt: new Date() };
    renderApp();
    return;
  }
  const controller = externalController ?? new AbortController();
  const shouldReplace = replace || mode === "first" && !dataset.raw.length;
  const baseRaw = shouldReplace ? [] : dataset.raw;
  const startSkipToken = shouldReplace ? "" : dataset.skipToken;
  state.resources[key] = { ...dataset, status: "loading", error: null, controller, fromCache: false, ...(shouldReplace ? { raw: [], items: [], skipToken: "", pageNumber: 0, complete: false } : {}) };
  if (!suppressRender) renderApp();
  try {
    const accessToken = token ?? await acquireInventoryToken();
    if (!accessToken) return;
    if (mode === "all") {
      const result = await queryResourceTypeAll(accessToken, key, {
        signal: controller.signal,
        startSkipToken,
        initialItems: baseRaw,
        onProgress: progress => {
          const current = state.resources[key];
          state.resources[key] = { ...current, pageNumber: (dataset.pageNumber || 0) + progress.pageNumber, totalRecords: progress.totalRecords ?? current.totalRecords };
          if (!suppressRender) updateVisibleQueryProgress(key, progress);
        }
      });
      const raw = result.items;
      state.resources[key] = { ...emptyResourceState(), status: "loaded", raw, items: normaliseInventory(raw, environmentItems()), totalRecords: result.totalRecords ?? expectedCount(key), pageNumber: (dataset.pageNumber || 0) + result.pageNumber, complete: true, loadedAt: new Date() };
    } else {
      const page = await queryResourceTypePage(accessToken, key, { signal: controller.signal, skipToken: mode === "next" ? dataset.skipToken : "" });
      const raw = mode === "next" ? [...dataset.raw, ...page.data] : page.data;
      const complete = !page.skipToken;
      state.resources[key] = { ...emptyResourceState(), status: complete ? "loaded" : "partial", raw, items: normaliseInventory(raw, environmentItems()), totalRecords: page.totalRecords ?? expectedCount(key), skipToken: page.skipToken, pageNumber: mode === "next" ? dataset.pageNumber + 1 : 1, complete, loadedAt: new Date() };
    }
    await cacheResource(key);
  } catch (error) {
    if (error?.name === "AbortError") {
      state.resources[key] = { ...state.resources[key], status: state.resources[key].raw.length ? "partial" : "idle", controller: null };
    } else {
      const partial = error?.partial;
      const raw = partial?.items ?? state.resources[key].raw;
      state.resources[key] = { ...state.resources[key], status: raw.length ? "partial" : "error", raw, items: normaliseInventory(raw, environmentItems()), skipToken: partial?.skipToken ?? state.resources[key].skipToken, totalRecords: partial?.totalRecords ?? state.resources[key].totalRecords, pageNumber: partial?.pageNumber ?? state.resources[key].pageNumber, error: normaliseError(error), controller: null, loadedAt: raw.length ? new Date() : state.resources[key].loadedAt };
      if (raw.length) await cacheResource(key);
    }
  } finally {
    state.resources[key].controller = null;
    if (!suppressRender) renderApp();
  }
}
function updateVisibleQueryProgress(key, progress) {
  const cards = document.querySelectorAll(`[data-query-key="${key}"]`);
  if (!cards.length) return;
  // The full render remains authoritative; this only keeps long loads visibly alive.
  const banner = document.querySelector(".bulk-banner span");
  if (banner) banner.textContent = `${t()[key]} · ${Number(progress.loadedRecords || 0).toLocaleString(t().locale)}`;
}
async function clearResourceDataset(key) {
  state.resources[key].controller?.abort();
  state.resources[key] = emptyResourceState();
  if (!state.demo && tenantId()) await deleteCachedDataset(tenantId(), `resources:${key}`).catch(() => {});
  renderApp();
}
async function loadAllResourceTypes() {
  if (state.bulkLoad.status === "loading" || state.demo) return;
  const keys = RESOURCE_TAB_KEYS.filter(key => !state.resources[key].complete && expectedCount(key) > 0);
  if (!keys.length) { showToast(t().allQueriesComplete); return; }
  const controller = new AbortController();
  state.bulkLoad = { status: "loading", currentKey: "", completed: 0, total: keys.length, controller, error: null };
  renderApp();
  try {
    const token = await acquireInventoryToken();
    if (!token) return;
    for (const key of keys) {
      if (controller.signal.aborted) break;
      state.bulkLoad.currentKey = key;
      renderApp();
      await loadResourceDataset(key, "all", { token, externalController: controller, suppressRender: true });
      state.bulkLoad.completed += 1;
      renderApp();
    }
    if (!controller.signal.aborted) showToast(t().fullInventoryComplete);
  } catch (error) {
    if (error?.name !== "AbortError") state.bulkLoad.error = normaliseError(error);
  } finally {
    state.bulkLoad = { ...state.bulkLoad, status: "idle", currentKey: "", controller: null };
    renderApp();
  }
}

async function loadTenantGovernance() {
  const controller = new AbortController();
  state.tenantGovernance = { ...state.tenantGovernance, status: "loading", error: null, controller, progress: null };
  renderApp();
  try {
    const data = state.demo ? demoTenantSettings : await queryTenantSettings(await acquireBapToken(), { signal: controller.signal });
    state.tenantGovernance = { ...emptySourceState(), status: "loaded", data, loadedAt: new Date() };
  } catch (error) {
    if (error?.name === "AbortError") state.tenantGovernance = { ...state.tenantGovernance, status: state.tenantGovernance.data ? "loaded" : "idle", controller: null };
    else state.tenantGovernance = { ...state.tenantGovernance, status: state.tenantGovernance.data ? "partial" : "error", error: normaliseError(error), controller: null };
  }
  renderApp();
}
async function loadDlp() {
  const controller = new AbortController();
  state.dlp = { ...state.dlp, status: "loading", error: null, controller, progress: null };
  renderApp();
  try {
    const raw = state.demo ? demoDlpPolicies : await queryDlpPolicies(await acquireBapToken(), { signal: controller.signal, onProgress: progress => { state.dlp.progress = progress; } });
    state.dlp = { ...emptySourceState(), status: "loaded", raw, policies: normaliseDlpPolicies(raw), loadedAt: new Date() };
  } catch (error) {
    const partialRaw = error?.partial?.items ?? state.dlp.raw;
    if (error?.name === "AbortError") state.dlp = { ...state.dlp, status: partialRaw.length ? "partial" : "idle", raw: partialRaw, policies: normaliseDlpPolicies(partialRaw), controller: null };
    else state.dlp = { ...state.dlp, status: partialRaw.length ? "partial" : "error", raw: partialRaw, policies: normaliseDlpPolicies(partialRaw), error: normaliseError(error), controller: null };
  }
  renderApp();
}
async function loadSelectedEnvironmentSettings() {
  const environmentId = state.environmentSettings.selectedId;
  if (!environmentId) return;
  const controller = new AbortController();
  state.environmentSettings = { ...state.environmentSettings, status: "loading", error: null, controller, detailsError: null, settingsError: null };
  renderApp();
  try {
    let detailResult;
    let settingsResult;
    if (state.demo) {
      detailResult = { status: "fulfilled", value: demoEnvironmentDetails[environmentId] ?? { name: environmentId, properties: { displayName: environmentItems().find(env => env.id === environmentId)?.displayName } } };
      settingsResult = { status: "fulfilled", value: demoEnvironmentSettings[environmentId] ?? { properties: {} } };
    } else {
      const token = await acquirePowerPlatformToken([POWER_PLATFORM_SCOPES.environments, POWER_PLATFORM_SCOPES.environmentSettings]);
      [detailResult, settingsResult] = await Promise.allSettled([
        queryEnvironmentDetails(token, environmentId, { signal: controller.signal }),
        queryEnvironmentSettings(token, environmentId, { signal: controller.signal })
      ]);
    }
    const details = detailResult.status === "fulfilled" ? normaliseEnvironmentDetails(detailResult.value, environmentId) : null;
    const settings = settingsResult.status === "fulfilled" ? settingsResult.value : null;
    state.environmentSettings = {
      ...emptySourceState(),
      status: details && settings ? "loaded" : details || settings ? "partial" : "error",
      selectedId: environmentId,
      details,
      settings,
      groups: settings ? groupEnvironmentSettings(settings) : {},
      detailsError: detailResult.status === "rejected" ? normaliseError(detailResult.reason) : null,
      settingsError: settingsResult.status === "rejected" ? normaliseError(settingsResult.reason) : null,
      error: !details && !settings ? normaliseError(detailResult.reason ?? settingsResult.reason) : null,
      loadedAt: details || settings ? new Date() : null
    };
  } catch (error) {
    if (error?.name === "AbortError") state.environmentSettings = { ...state.environmentSettings, status: state.environmentSettings.details || state.environmentSettings.settings ? "partial" : "idle", controller: null };
    else state.environmentSettings = { ...state.environmentSettings, status: "error", error: normaliseError(error), controller: null };
  }
  renderApp();
}
function normaliseError(error) {
  if (error instanceof InventoryApiError) return error;
  const message = String(error?.message ?? error ?? "Unknown error");
  return { message, code: /AADSTS50011|redirect_uri/i.test(message) ? "redirect" : /user_cancelled|popup_window_error|consent/i.test(message) ? "consent" : "unknown", details: error?.errorMessage ?? "" };
}

async function handlePdfExport() {
  const button = document.getElementById("export-pdf");
  if (!button || button.disabled) return;
  const label = button.querySelector("span:last-child");
  const originalLabel = label?.textContent ?? t().exportPdf;
  button.disabled = true; if (label) label.textContent = t().generatingPdf;
  try {
    const { exportPdf } = await import("./pdf-export.js");
    await exportPdf(getProcessedItems(), {
      language: state.language,
      strings: t(),
      allItemsCount: summaryData().total,
      summaryCounts: summaryData().byType,
      accountName: state.demo ? "demo.admin@contoso.com" : state.account?.username ?? state.account?.name ?? "—",
      tenantId: tenantId() || "—",
      lastRefreshAt: latestRefresh(),
      tenantSettings: state.tenantGovernance.data,
      dlpPolicies: state.dlp.policies,
      environmentSettings: state.environmentSettings.details || state.environmentSettings.settings ? state.environmentSettings : null
    });
    showToast(t().pdfGenerated);
  } catch (error) { console.error("PDF export failed", error); showToast(t().pdfError); }
  finally { button.disabled = false; if (label) label.textContent = originalLabel; }
}
function findResource(rowId) {
  const candidates = [
    ...loadedResources(),
    ...(state.bootstrap.recent.items ?? [])
  ];
  return candidates.find(resource => resource.rowId === rowId);
}
async function showResourceDetails(rowId) {
  const base = findResource(rowId);
  if (!base) return;
  const cacheKey = `${base.type}:${base.id}`;
  renderDetailModal(state.detailCache[cacheKey] ?? base, { loading: !state.detailCache[cacheKey] && !state.demo });
  if (state.detailCache[cacheKey] || state.demo) return;
  try {
    const token = await acquireInventoryToken();
    if (!token) return;
    const raw = await queryResourceDetail(token, base.type, base.id);
    const detail = raw ? normaliseInventory([raw], environmentItems())[0] : base;
    state.detailCache[cacheKey] = detail;
    renderDetailModal(detail, { loading: false });
  } catch (error) {
    renderDetailModal(base, { loading: false, error: normaliseError(error) });
  }
}
function renderDetailModal(item, { loading = false, error = null } = {}) {
  const connectorDetails = loading
    ? `<li>${escapeHtml(t().loadingDetail)}</li>`
    : item.connectors.length
      ? item.connectors.map(connector => `<li><strong>${escapeHtml(connector.connectorId)}</strong>${connector.operations.length ? `<span>${escapeHtml(connector.operations.join(", "))}</span>` : ""}</li>`).join("")
      : `<li>${escapeHtml(t().noConnectorData)}</li>`;
  document.getElementById("modal-root").innerHTML = `<div class="modal-backdrop" id="detail-modal"><div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="detail-title"><button id="close-modal" class="modal-close" type="button" aria-label="${escapeHtml(t().close)}">×</button><p class="eyebrow">${escapeHtml(t()[item.typeKey] ?? t().resourceTypeUnknown)}</p><h2 id="detail-title">${escapeHtml(item.displayName || item.id)}</h2>${error ? renderInlineError(error) : ""}<div class="detail-grid"><div><span>${escapeHtml(t().resourceId)}</span><code>${escapeHtml(item.id || "—")}</code></div><div><span>${escapeHtml(t().environment)}</span><strong>${escapeHtml(item.environmentName || "—")}</strong></div><div><span>${escapeHtml(t().environmentId)}</span><code>${escapeHtml(item.environmentId || "—")}</code></div><div><span>${escapeHtml(t().region)}</span><strong>${escapeHtml(item.location || "—")}</strong></div><div><span>${escapeHtml(t().owner)}</span><code>${escapeHtml(item.ownerId || "—")}</code></div><div><span>${escapeHtml(t().createdBy)}</span><code>${escapeHtml(item.createdBy || "—")}</code></div><div><span>${escapeHtml(t().created)}</span><strong>${escapeHtml(formatDate(item.createdAt, t().locale, true))}</strong></div><div><span>${escapeHtml(t().modified)}</span><strong>${escapeHtml(formatDate(item.lastModifiedAt, t().locale, true))}</strong></div></div><h3>${escapeHtml(t().connectors)} <span class="preview-badge">${escapeHtml(t().preview)}</span></h3><ul class="modal-connectors">${connectorDetails}</ul></div></div>`;
  const close = () => { document.getElementById("modal-root").innerHTML = ""; };
  document.getElementById("close-modal")?.addEventListener("click", close);
  document.getElementById("detail-modal")?.addEventListener("click", event => { if (event.target.id === "detail-modal") close(); });
}
function showToast(message) {
  const toast = document.getElementById("toast"); if (!toast) return;
  toast.textContent = message; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 2600);
}

export async function startApplication() {
  state.language = loadLanguage();
  document.documentElement.lang = state.language;
  state.config = loadStoredConfig();
  if (state.config && isValidGuid(state.config.clientId) && isValidGuid(state.config.tenantId)) {
    state.authInitialising = true;
    renderApp();
    try { const { account } = await initialiseAuth(state.config); state.account = account ?? getActiveAccount(); }
    catch (error) { state.error = normaliseError(error); }
    finally { state.authInitialising = false; }
  }
  const demoRequested = new URLSearchParams(window.location.search).get("demo") === "1";
  if (demoRequested && !state.account) {
    enterDemoMode();
    return;
  }
  if (state.account) {
    await restoreCache();
    renderApp();
    await loadBootstrap({ force: false });
  } else {
    renderApp();
  }
}
