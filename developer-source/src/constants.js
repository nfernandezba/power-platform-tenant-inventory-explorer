export const APP_NAME = "Power Platform Tenant Inventory Explorer";
export const APP_VERSION = "1.0";
export const LINKEDIN_URL = "https://www.linkedin.com/in/nfernandezba";
export const POWER_PLATFORM_API_APP_ID = "8578e004-a5c6-46e7-913e-12f58912df43";

export const POWER_PLATFORM_SCOPES = Object.freeze({
  inventory: "https://api.powerplatform.com/ResourceQuery.Resources.Read",
  environments: "https://api.powerplatform.com/EnvironmentManagement.Environments.Read",
  environmentSettings: "https://api.powerplatform.com/EnvironmentManagement.Settings.Read"
});

// The legacy Business Application Platform resource is still used by the
// published tenant-settings preview endpoint and the admin DLP surface.
export const BAP_SCOPE = "https://api.bap.microsoft.com/.default";

export const ENDPOINTS = Object.freeze({
  inventory: "https://api.powerplatform.com/resourcequery/resources/query?api-version=2024-10-01",
  environments: "https://api.powerplatform.com/environmentmanagement/environments?api-version=2024-10-01",
  environmentDetails: environmentId => `https://api.powerplatform.com/environmentmanagement/environments/${encodeURIComponent(environmentId)}?api-version=2024-10-01`,
  environmentSettings: environmentId => `https://api.powerplatform.com/environmentmanagement/environments/${encodeURIComponent(environmentId)}/settings?api-version=2024-10-01`,
  tenantSettings: "https://api.bap.microsoft.com/providers/Microsoft.BusinessAppPlatform/listtenantsettings?api-version=2020-10-01",
  dlpPolicies: "https://api.bap.microsoft.com/providers/Microsoft.BusinessAppPlatform/scopes/admin/apiPolicies?api-version=2016-11-01"
});

export const INVENTORY_SCOPE = POWER_PLATFORM_SCOPES.inventory;
export const INVENTORY_ENDPOINT = ENDPOINTS.inventory;

export const STORAGE_KEYS = {
  sessionConfig: "pp-inventory.session-config",
  rememberedConfig: "pp-inventory.remembered-config",
  language: "pp-inventory.language"
};

export const RESOURCE_TYPES = Object.freeze({
  "microsoft.powerapps/canvasapps": { key: "canvasApps", category: "apps", accent: "blue" },
  "microsoft.powerapps/modeldrivenapps": { key: "modelDrivenApps", category: "apps", accent: "indigo" },
  "microsoft.powerapps/codeapps": { key: "codeApps", category: "apps", accent: "teal" },
  "microsoft.powerapps/apps": { key: "appBuilderApps", category: "apps", accent: "magenta" },
  "microsoft.powerautomate/cloudflows": { key: "cloudFlows", category: "flows", accent: "blue" },
  "microsoft.powerautomate/agentflows": { key: "agentFlows", category: "flows", accent: "teal" },
  "microsoft.powerautomate/m365agentflows": { key: "workflowAgentFlows", category: "flows", accent: "gold" },
  "microsoft.copilotstudio/agents": { key: "copilotAgents", category: "agents", accent: "magenta" },
  "microsoft.powerplatform/environments": { key: "environments", category: "platform", accent: "indigo" },
  "microsoft.powerplatform/environmentgroups": { key: "environmentGroups", category: "platform", accent: "gold" }
});

export const QUERY_RESOURCE_TYPES = Object.keys(RESOURCE_TYPES);

export const INVENTORY_QUERY = Object.freeze({
  pageSize: 1000,
  requestTimeoutMs: 45000,
  adminTimeoutMs: 30000,
  maxInventoryPages: 2000,
  maxDlpPages: 500,
  recentLimit: 40,
  cacheMaxAgeMs: 24 * 60 * 60 * 1000
});

export const RESOURCE_TYPE_BY_KEY = Object.freeze(
  Object.fromEntries(Object.entries(RESOURCE_TYPES).map(([type, definition]) => [definition.key, type]))
);


export const BOOKS = {
  es: [
    {
      title: "Definiendo la estructura marco para el Centro de Excelencia de Power Platform",
      author: "Nicolás Andrés Fernández",
      url: "https://www.amazon.com/-/es/Definiendo-estructura-Centro-Excelencia-Platform/dp/B0FSDWQMHW/ref=tmm_pap_swatch_0",
      cover: "./assets/book-covers/coe-power-platform-es.jpg"
    },
    {
      title: "Copilot Studio y el futuro del Centro de Excelencia de Power Platform",
      author: "Nicolás Andrés Fernández",
      url: "https://www.amazon.com/-/es/Nicol%C3%A1s-Andr%C3%A9s-Fern%C3%A1ndez/dp/B0GZGL3T1K/ref=tmm_pap_swatch_0",
      cover: "./assets/book-covers/copilot-studio-coe-es.jpg"
    }
  ],
  en: [
    {
      title: "Defining the Framework Structure for the Power Platform Center of Excellence",
      author: "Nicolás Andrés Fernández",
      url: "https://www.amazon.com/-/es/Defining-Framework-Structure-Platform-Excellence/dp/B0GDDRCD2C/ref=tmm_pap_swatch_0",
      cover: "./assets/book-covers/coe-power-platform-en.jpg"
    },
    {
      title: "Copilot Studio and the Future of the Power Platform Center of Excellence",
      author: "Nicolás Andrés Fernández",
      url: "https://www.amazon.com/-/es/Nicol%C3%A1s-Andr%C3%A9s-Fern%C3%A1ndez/dp/B0H2VTJZGR/ref=tmm_pap_swatch_0",
      cover: "./assets/book-covers/copilot-studio-coe-en.jpg"
    }
  ]
};
