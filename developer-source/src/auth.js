import {
  BrowserCacheLocation,
  InteractionRequiredAuthError,
  LogLevel,
  PublicClientApplication
} from "@azure/msal-browser";
import { BAP_SCOPE, INVENTORY_SCOPE, STORAGE_KEYS } from "./constants.js";
import { getRedirectUri } from "./helpers.js";

let msalInstance = null;

function buildConfig({ clientId, tenantId }) {
  return {
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      redirectUri: getRedirectUri(),
      postLogoutRedirectUri: getRedirectUri(),
      navigateToLoginRequestUrl: true
    },
    cache: {
      cacheLocation: BrowserCacheLocation.SessionStorage,
      storeAuthStateInCookie: false
    },
    system: {
      allowPlatformBroker: false,
      loggerOptions: {
        logLevel: LogLevel.Error,
        piiLoggingEnabled: false,
        loggerCallback: (level, message, containsPii) => {
          if (!containsPii && level === LogLevel.Error) console.error(`[MSAL] ${message}`);
        }
      }
    }
  };
}

export function loadStoredConfig() {
  const candidates = [
    sessionStorage.getItem(STORAGE_KEYS.sessionConfig),
    localStorage.getItem(STORAGE_KEYS.rememberedConfig)
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate);
      if (parsed?.clientId && parsed?.tenantId) return parsed;
    } catch {
      // Ignore malformed browser storage.
    }
  }
  return null;
}

export function saveConfig(config, remember) {
  const clean = {
    clientId: String(config.clientId).trim(),
    tenantId: String(config.tenantId).trim()
  };
  sessionStorage.setItem(STORAGE_KEYS.sessionConfig, JSON.stringify(clean));
  if (remember) localStorage.setItem(STORAGE_KEYS.rememberedConfig, JSON.stringify(clean));
  else localStorage.removeItem(STORAGE_KEYS.rememberedConfig);
}

export function clearStoredConfig({ preserveRemembered = false } = {}) {
  sessionStorage.removeItem(STORAGE_KEYS.sessionConfig);
  if (!preserveRemembered) localStorage.removeItem(STORAGE_KEYS.rememberedConfig);
}

export async function initialiseAuth(config) {
  msalInstance = new PublicClientApplication(buildConfig(config));
  await msalInstance.initialize();
  const redirectResponse = await msalInstance.handleRedirectPromise();

  if (redirectResponse?.account) {
    msalInstance.setActiveAccount(redirectResponse.account);
  } else {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length === 1) {
      msalInstance.setActiveAccount(accounts[0]);
    } else if (accounts.length > 1) {
      const tenantAccount = accounts.find(
        account => account.tenantId?.toLowerCase() === config.tenantId.toLowerCase()
      );
      if (tenantAccount) msalInstance.setActiveAccount(tenantAccount);
    }
  }

  return {
    instance: msalInstance,
    redirectResponse,
    account: msalInstance.getActiveAccount()
  };
}

export function getAuthInstance() {
  return msalInstance;
}

export function getActiveAccount() {
  return msalInstance?.getActiveAccount() ?? null;
}

export async function signIn() {
  if (!msalInstance) throw new Error("MSAL is not initialised.");
  await msalInstance.loginRedirect({
    scopes: ["openid", "profile", INVENTORY_SCOPE],
    prompt: "select_account"
  });
}

/**
 * Acquire a delegated token for one resource. Optional datasets use popup
 * interaction so an additional consent request does not discard loaded data.
 */
export async function acquireToken(scopes, { interaction = "popup" } = {}) {
  if (!msalInstance) throw new Error("MSAL is not initialised.");
  const account = msalInstance.getActiveAccount();
  if (!account) throw new Error("No active account.");

  const request = { account, scopes: Array.isArray(scopes) ? scopes : [scopes] };
  try {
    const response = await msalInstance.acquireTokenSilent(request);
    return response.accessToken;
  } catch (error) {
    const interactionRequired = error instanceof InteractionRequiredAuthError
      || /interaction_required|consent_required|login_required/i.test(String(error?.errorCode ?? error?.message ?? ""));
    if (!interactionRequired) throw error;

    if (interaction === "redirect") {
      await msalInstance.acquireTokenRedirect(request);
      return null;
    }
    const response = await msalInstance.acquireTokenPopup(request);
    return response.accessToken;
  }
}

export function acquireInventoryToken() {
  return acquireToken(INVENTORY_SCOPE, { interaction: "redirect" });
}

export function acquirePowerPlatformToken(scopes) {
  return acquireToken(scopes, { interaction: "popup" });
}

export function acquireBapToken() {
  return acquireToken(BAP_SCOPE, { interaction: "popup" });
}

export async function signOut() {
  if (!msalInstance) {
    clearStoredConfig();
    window.location.assign(getRedirectUri());
    return;
  }
  const account = msalInstance.getActiveAccount();
  clearStoredConfig();
  await msalInstance.logoutRedirect({ account: account ?? undefined });
}
