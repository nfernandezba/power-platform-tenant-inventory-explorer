# Security model

This application is a browser-based public client. It must never contain a client secret, certificate, password, refresh token, or manually persisted access token.

## Authentication

- Microsoft Entra ID interactive authentication.
- OAuth 2.0 Authorization Code Flow with PKCE through `@azure/msal-browser`.
- Required delegated scope: `ResourceQuery.Resources.Read`.
- Optional delegated scopes: `EnvironmentManagement.Environments.Read` and `EnvironmentManagement.Settings.Read`.
- Optional Power Apps Service delegated scope: `https://service.powerapps.com//User`, requested only for live Tenant Governance and DLP queries.
- Optional Microsoft Graph delegated scope: `User.ReadBasic.All`, requested only to resolve owner, creator, and modifier user IDs to basic profile names.
- MSAL cache: `sessionStorage`.
- Client ID and Tenant ID may optionally be remembered because they are public identifiers.

## Query isolation

Summary, environments, recent activity, every resource type, tenant settings, DLP policies, and environment settings use independent application-state objects and request controllers. A timeout, cancellation, or error in one dataset does not replace another dataset.

Large resource queries execute sequentially. Page limits and repeated-token detection prevent uncontrolled loops. Partial results remain explicitly marked as partial.

## IndexedDB cache

The application can store retrieved tenant inventory in the browser's IndexedDB to reduce repeated downloads. Cache keys are scoped by Tenant ID and dataset. Access tokens are never stored in IndexedDB.

Cached inventory may contain internal resource names, owner object IDs, resolved basic user profile values (display name, user principal name, and mail), environment identifiers, connector identifiers, and timestamps. On shared or unmanaged devices, users should select **Clear cache** before leaving. Disconnecting the Microsoft account ends the authenticated session but does not silently delete previously cached inventory.

Cache operations fail closed: if IndexedDB is unavailable or quota is exceeded, the application continues without persistent caching.

## Data handling and export

- No proprietary backend is used.
- Export occurs only after a user action.
- Access tokens are never logged or included in CSV, JSON, or PDF files.
- PDF generation uses already loaded and normalised data.
- Aggregate counts and detailed rows are kept distinct so a partial detail load is not presented as a complete download.
- Tenant data in application memory is reset on disconnect or configuration change.
- Imported Tenant Governance JSON is parsed locally in the browser and is never uploaded by the application.
- Microsoft Graph requests only the basic user fields needed for identity labels; unresolved non-user objects remain as GUIDs.

## Endpoint controls

The application contains a fixed allowlist of hosts:

```text
login.microsoftonline.com
api.powerplatform.com
api.bap.microsoft.com
service.powerapps.com
graph.microsoft.com
```

Users cannot supply arbitrary token endpoints, API URLs, redirect URLs, or script URLs.

## Rendering controls

- API-provided values are escaped before HTML rendering.
- No API response is evaluated as code.
- The Content Security Policy limits scripts, connections, images, styles, and frames to the required sources.
- Tokens and full API responses are not written to the browser console.
- Query diagnostics may display the query name, fixed endpoint, correlation ID, service error, and submitted JSON body. They never include the access token or `Authorization` header.

## Preview and legacy surfaces

Tenant Governance is a Microsoft preview endpoint. DLP retrieval uses an administrative BAP endpoint and is labelled accordingly. Live calls use the delegated Power Apps Service `User` permission and remain read-only. Both can change, reject browser CORS, or require additional privileges. The application reports such failures transparently and must not weaken CSP or embed credentials as a workaround.

## Reporting a vulnerability

Do not include tenant data, tokens, secrets, or personal information in a public issue. Contact the repository owner privately through the channel listed on the repository profile.
## Export readiness and local image assets

Before generating a PDF, the application checks whether required, detailed, or optional datasets remain pending or partial and requires explicit user confirmation. This prevents an incomplete report from being exported silently. The generated report is still created locally in the browser.

Book covers are served as same-origin static assets and converted to image data before PDF generation. No tenant data is sent to the book retailer or to an external document-generation service.

## Cache schema compatibility

The current build uses IndexedDB cache schema v3. The schema change invalidates earlier cached resource rows that could contain GUID-only labels or missing projected metadata. Users should still select **Clear cache** after replacing an older deployment on a shared device.



## Environment Management Settings eligibility

The SPA does not attempt to create or initialise Environment Management Settings. It queries this source only for environments explicitly marked as Managed. Not Managed environments are treated as not applicable, and a missing settings record on a Managed Environment is treated as not explicitly configured. This preserves the read-only security model and avoids requesting write permissions merely to initialise a settings object.
