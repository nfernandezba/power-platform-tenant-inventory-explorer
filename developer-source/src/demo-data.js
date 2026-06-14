const TENANT_ID = "11111111-2222-4333-8444-555555555555";
const ENV = {
  default: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
  dev: "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
  test: "cccccccc-3333-4333-8333-cccccccccccc",
  prod: "dddddddd-4444-4444-8444-dddddddddddd"
};
const OWNER = {
  ana: "10000000-0000-4000-8000-000000000001",
  bruno: "10000000-0000-4000-8000-000000000002",
  clara: "10000000-0000-4000-8000-000000000003"
};

function env(id, displayName, location, environmentType, isManaged) {
  return {
    tenantId: TENANT_ID,
    name: id,
    type: "microsoft.powerplatform/environments",
    location,
    properties: {
      displayName,
      environmentType,
      isManaged,
      createdAt: "2024-01-15T09:30:00Z",
      createdBy: OWNER.ana
    }
  };
}

function resource({ id, type, name, environmentId, location = "europe", ownerId = OWNER.ana, createdAt, modifiedAt, connectors = [], extra = {} }) {
  return {
    tenantId: TENANT_ID,
    name: id,
    type,
    location,
    environmentName: environmentId === ENV.default ? "Contoso (default)" : environmentId === ENV.dev ? "CoE Development" : environmentId === ENV.test ? "CoE Test" : "Business Production",
    environmentRegion: location,
    environmentType: environmentId === ENV.default ? "Default" : environmentId === ENV.prod ? "Production" : "Sandbox",
    isManagedEnvironment: environmentId !== ENV.default,
    properties: {
      displayName: name,
      environmentId,
      ownerId,
      createdBy: ownerId,
      createdAt,
      lastModifiedAt: modifiedAt,
      powerPlatformConnectors: connectors.map(connectorId => ({ connectorId, operations: [] })),
      ...extra
    }
  };
}

export const demoRawItems = [
  env(ENV.default, "Contoso (default)", "europe", "Default", false),
  env(ENV.dev, "CoE Development", "europe", "Sandbox", true),
  env(ENV.test, "CoE Test", "europe", "Sandbox", true),
  env(ENV.prod, "Business Production", "europe", "Production", true),
  {
    tenantId: TENANT_ID,
    name: "eeeeeeee-5555-4555-8555-eeeeeeeeeeee",
    type: "microsoft.powerplatform/environmentgroups",
    location: "europe",
    properties: {
      displayName: "Managed Business Environments",
      createdAt: "2025-02-01T10:00:00Z",
      createdBy: OWNER.ana
    }
  },
  resource({ id: "20000000-0000-4000-8000-000000000001", type: "microsoft.powerapps/canvasapps", name: "Travel Request", environmentId: ENV.prod, ownerId: OWNER.ana, createdAt: "2025-01-14T08:00:00Z", modifiedAt: "2026-05-20T09:10:00Z", connectors: ["shared_sharepointonline", "shared_office365users"] }),
  resource({ id: "20000000-0000-4000-8000-000000000002", type: "microsoft.powerapps/canvasapps", name: "Team Ideas", environmentId: ENV.default, ownerId: OWNER.bruno, createdAt: "2024-03-10T08:00:00Z", modifiedAt: "2024-08-20T09:10:00Z", connectors: ["shared_sharepointonline"] }),
  resource({ id: "20000000-0000-4000-8000-000000000003", type: "microsoft.powerapps/modeldrivenapps", name: "Supplier Management", environmentId: ENV.prod, ownerId: OWNER.clara, createdAt: "2025-06-01T08:00:00Z", modifiedAt: "2026-06-01T10:00:00Z" }),
  resource({ id: "20000000-0000-4000-8000-000000000004", type: "microsoft.powerapps/codeapps", name: "Field Operations Portal", environmentId: ENV.dev, ownerId: OWNER.bruno, createdAt: "2026-02-01T08:00:00Z", modifiedAt: "2026-06-10T10:00:00Z" }),
  resource({ id: "20000000-0000-4000-8000-000000000005", type: "microsoft.powerapps/apps", name: "Project Status App", environmentId: ENV.default, ownerId: "", createdAt: "2026-03-01T08:00:00Z", modifiedAt: "2026-03-10T10:00:00Z" }),
  resource({ id: "30000000-0000-4000-8000-000000000001", type: "microsoft.powerautomate/cloudflows", name: "Notify travel approval", environmentId: ENV.prod, ownerId: OWNER.ana, createdAt: "2025-01-14T08:30:00Z", modifiedAt: "2026-05-20T09:15:00Z", connectors: ["shared_approvals", "shared_office365"], extra: { trigger: "shared_powerapps", triggerOperation: "PowerAppsButton" } }),
  resource({ id: "30000000-0000-4000-8000-000000000002", type: "microsoft.powerautomate/cloudflows", name: "Archive inactive documents", environmentId: ENV.default, ownerId: OWNER.bruno, createdAt: "2023-02-01T08:30:00Z", modifiedAt: "2024-01-20T09:15:00Z", connectors: ["shared_sharepointonline"], extra: { trigger: "shared_schedule", triggerOperation: "Recurrence" } }),
  resource({ id: "30000000-0000-4000-8000-000000000003", type: "microsoft.powerautomate/agentflows", name: "Resolve customer account", environmentId: ENV.test, ownerId: OWNER.clara, createdAt: "2026-04-11T08:30:00Z", modifiedAt: "2026-06-05T09:15:00Z", connectors: ["shared_commondataserviceforapps"] }),
  resource({ id: "30000000-0000-4000-8000-000000000004", type: "microsoft.powerautomate/m365agentflows", name: "Weekly project digest", environmentId: ENV.default, ownerId: OWNER.bruno, createdAt: "2026-05-01T08:30:00Z", modifiedAt: "2026-06-11T09:15:00Z", connectors: ["shared_office365", "shared_teams"] }),
  resource({ id: "40000000-0000-4000-8000-000000000001", type: "microsoft.copilotstudio/agents", name: "HR Policy Assistant", environmentId: ENV.prod, ownerId: OWNER.ana, createdAt: "2025-09-10T08:30:00Z", modifiedAt: null, connectors: ["shared_sharepointonline"], extra: { createdIn: "Copilot Studio", isQuarantined: false } }),
  resource({ id: "40000000-0000-4000-8000-000000000002", type: "microsoft.copilotstudio/agents", name: "Procurement Helper", environmentId: ENV.test, ownerId: OWNER.clara, createdAt: "2026-01-12T08:30:00Z", modifiedAt: null, connectors: ["shared_commondataserviceforapps"], extra: { createdIn: "Copilot Studio", isQuarantined: true } }),
  resource({ id: "40000000-0000-4000-8000-000000000003", type: "microsoft.copilotstudio/agents", name: "Personal Meeting Assistant", environmentId: ENV.default, ownerId: "", createdAt: "2026-05-15T08:30:00Z", modifiedAt: null, connectors: ["shared_office365"], extra: { createdIn: "Microsoft 365 Copilot Agent Builder", isQuarantined: false } })
];

export const demoTenantSettings = {
  disableEnvironmentCreationByNonAdminUsers: true,
  disableTrialEnvironmentCreationByNonAdminUsers: true,
  disablePortalsCreationByNonAdminUsers: false,
  powerPlatform: {
    powerApps: {
      disableShareWithEveryone: true,
      DisableConnectionSharingWithEveryone: false,
      enableCanvasAppInsights: true,
      enableGuestsToMake: false
    },
    powerAutomate: {
      disableCopilot: false,
      disableFlowRunResubmission: true
    },
    governance: {
      disableDeveloperEnvironmentCreationByNonAdminusers: false,
      enableDefaultEnvironmentRouting: true,
      policy: { enableDesktopFlowDataPolicyManagement: true }
    },
    licensing: {
      enableTenantCapacityReportForEnvironmentAdmins: false,
      EnableTenantLicensingReportForEnvironmentAdmins: false
    },
    intelligence: {
      disableCopilot: false,
      disableCopilotFeedback: true
    }
  }
};

export const demoDlpPolicies = [
  {
    name: "policy-default-enterprise",
    properties: {
      displayName: "Enterprise baseline",
      environmentType: "AllEnvironments",
      defaultConnectorsClassification: "Blocked",
      createdTime: "2025-09-10T10:00:00Z",
      lastModifiedTime: "2026-05-20T11:30:00Z",
      connectorGroups: [
        { classification: "Business", connectors: [{ id: "shared_commondataserviceforapps" }, { id: "shared_sharepointonline" }, { id: "shared_sql" }] },
        { classification: "NonBusiness", connectors: [{ id: "shared_twitter" }, { id: "shared_dropbox" }] },
        { classification: "Blocked", connectors: [{ id: "shared_http" }, { id: "shared_customconnector" }] }
      ]
    }
  },
  {
    name: "policy-dev-exception",
    properties: {
      displayName: "Development exception",
      environmentType: "OnlyEnvironments",
      environments: [{ name: ENV.dev }],
      defaultConnectorsClassification: "NonBusiness",
      createdTime: "2026-01-12T08:00:00Z",
      lastModifiedTime: "2026-04-12T09:15:00Z",
      connectorGroups: [
        { classification: "Business", connectors: [{ id: "shared_commondataserviceforapps" }] },
        { classification: "NonBusiness", connectors: [{ id: "shared_github" }, { id: "shared_azuredevops" }] },
        { classification: "Blocked", connectors: [] }
      ]
    }
  }
];

export const demoEnvironmentDetails = {
  [ENV.default]: {
    name: ENV.default,
    properties: {
      displayName: "Contoso (default)", type: "Default", state: "Ready", geo: "Europe",
      url: "https://contoso.crm4.dynamics.com", domainName: "contoso", version: "9.2",
      protectionLevel: "Standard", securityGroupId: "", environmentGroupId: "",
      adminMode: false, backgroundOperationsState: "Enabled"
    }
  },
  [ENV.dev]: {
    name: ENV.dev,
    properties: {
      displayName: "CoE Development", type: "Sandbox", state: "Ready", geo: "Europe",
      url: "https://coe-dev.crm4.dynamics.com", domainName: "coe-dev", version: "9.2",
      protectionLevel: "Standard", securityGroupId: "20000000-0000-4000-8000-000000000010",
      environmentGroupId: "eeeeeeee-5555-4555-8555-eeeeeeeeeeee", adminMode: false,
      backgroundOperationsState: "Enabled"
    }
  }
};

export const demoEnvironmentSettings = {
  [ENV.default]: {
    properties: {
      copilotStudio_ConnectedAgents: false,
      copilotStudio_ConversationAuditLoggingEnabled: true,
      powerApps_AllowCodeApps: false,
      powerApps_CopilotChat: true,
      powerApps_EnableFormInsights: true,
      powerApps_NLSearch: true,
      powerPages_EnableAnonymousAccess: false,
      enableIpBasedStorageAccessSignatureRule: true,
      loggingEnabledForIpBasedStorageAccessSignature: true
    }
  },
  [ENV.dev]: {
    properties: {
      copilotStudio_CodeInterpreter: true,
      copilotStudio_ConnectedAgents: true,
      copilotStudio_ConversationAuditLoggingEnabled: true,
      powerApps_AllowCodeApps: true,
      powerApps_CopilotChat: true,
      powerApps_FormPredictSmartPaste: true,
      powerPages_EnableAnonymousAccess: false,
      enableIpBasedStorageAccessSignatureRule: false,
      loggingEnabledForIpBasedStorageAccessSignature: true
    }
  }
};
