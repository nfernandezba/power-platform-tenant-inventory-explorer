# Power Platform Tenant Inventory Explorer

![Version](https://img.shields.io/badge/version-v1.0-5552B4)
![Deployment](https://img.shields.io/badge/deployment-GitHub%20Pages-3895FF)
![Authentication](https://img.shields.io/badge/authentication-Microsoft%20Entra%20ID-27B8C6)
![Licence](https://img.shields.io/badge/licence-MIT-FFC000)

A browser-based, read-only exploration and reporting tool for Microsoft Power Platform tenant inventory, governance information, data policies, and environment settings.

The solution is designed as a static Single-Page Application (SPA) that can be hosted on GitHub Pages. It authenticates users interactively through Microsoft Entra ID and calls Microsoft administrative APIs directly from the browser. It does not require a proprietary application server, database, client secret, certificate, stored username, or stored password.

> **Public version policy:** the public version is fixed at **v1.0**. It must not be changed in the interface, code, documentation, packages, or reports unless the repository owner explicitly requests a version change.

---

## Table of contents

- [Purpose](#purpose)
- [What the solution provides](#what-the-solution-provides)
- [Navigation model](#navigation-model)
- [Supported inventory resources](#supported-inventory-resources)
- [How the modular query model works](#how-the-modular-query-model-works)
- [Query centre and dataset states](#query-centre-and-dataset-states)
- [Performance, timeout, and throttling controls](#performance-timeout-and-throttling-controls)
- [Data sources and endpoints](#data-sources-and-endpoints)
- [Authentication and permissions](#authentication-and-permissions)
- [Microsoft Entra App Registration](#microsoft-entra-app-registration)
- [Using the application](#using-the-application)
- [Exports and executive PDF report](#exports-and-executive-pdf-report)
- [Browser cache and data lifecycle](#browser-cache-and-data-lifecycle)
- [Security model](#security-model)
- [GitHub Pages deployment](#github-pages-deployment)
- [Local development](#local-development)
- [Testing and validation](#testing-and-validation)
- [Project structure](#project-structure)
- [Known limitations](#known-limitations)
- [Troubleshooting](#troubleshooting)
- [Operational recommendations](#operational-recommendations)
- [Official Microsoft references](#official-microsoft-references)
- [Author and further reading](#author-and-further-reading)
- [Licence](#licence)

---

## Purpose

Power Platform administrators often need to answer questions that span several administrative surfaces:

- How many apps, flows, and agents exist in the tenant?
- Which environments contain the largest concentration of resources?
- Which resource types are growing most quickly?
- Which resources are in the Default Environment?
- Which resources have no owner information or have not been modified recently?
- Which connectors and trigger operations are used by a flow or agent?
- Which tenant governance settings are enabled or disabled?
- Which Data Loss Prevention policies exist and how are their connector groups configured?
- Which environment management settings are configured for a selected environment?
- Can the findings be exported to CSV, JSON, or an executive PDF report?

Power Platform Tenant Inventory Explorer brings those questions into a single, browser-based experience while preserving an important distinction between:

1. **Tenant-wide aggregated information**, which can be retrieved quickly.
2. **Detailed resource records**, which can be large and are therefore loaded manually by resource type.
3. **Administrative data**, such as Tenant Governance, DLP Policies, and Environment Settings, which comes from separate endpoints and is loaded only after an explicit user action.

The application is an exploration and reporting tool. It does not modify tenant settings, resources, DLP policies, environments, or permissions.

---

## What the solution provides

### Tenant overview

The Overview uses lightweight queries to present:

- Total resource count.
- Environment count.
- Environment group count.
- Resource totals by type.
- Resource distribution by region.
- Resource distribution by environment.
- Recently created or modified resources.
- Data-source status.
- Query status and refresh information.
- Governance signals calculated from the detailed data currently loaded.

The aggregated totals do not require the complete detailed inventory to be downloaded first.

### Environment inventory

The Environments view includes:

- Environment display name as the primary table label, with the environment GUID retained only as technical detail.
- Canonical matching between full provider paths and bare environment GUIDs.
- Environment type.
- Region.
- Managed Environment indicator.
- Environment group context when returned by the API.
- Aggregated resource count.
- Direct actions to filter resources for the environment.
- Direct navigation to Environment Settings for the selected environment.

Environment records and environment groups are loaded independently from detailed resources.

### Modular resource inventory

The Resources view provides a second navigation row for individual resource types. Each type can be loaded, paged, cancelled, refreshed, and cleared independently.

The detailed inventory supports:

- Search.
- Filtering by resource type.
- Filtering by environment.
- Filtering by region.
- Filtering by owner identifier.
- Created-from and created-to date filters.
- Sorting.
- Browser-side table pagination.
- Resource details.
- Stable display-name, environment, owner/creator, created-date, and modified-date fields from projected aliases.
- An explicit **Load** action in the Connectors column for supported resources.
- Connector identifiers and operation IDs retrieved through a one-resource detail query.
- Trigger connector and trigger operation where available.
- Quarantine indicator where available.
- Owner, creator, creation date, and modification date where available.

### Tenant Governance

Tenant Governance is loaded manually and presents selected Power Platform tenant settings in a readable table.

The view can evaluate settings related to areas such as:

- Environment creation by non-administrators.
- Trial environment creation.
- Developer environment creation.
- Power Pages creation.
- Share with Everyone.
- Connection sharing with Everyone.
- Guest makers.
- Default Environment Routing.
- Desktop-flow DLP management.
- Capacity report access.
- Copilot-related controls when returned by the endpoint.

The assessment signal is advisory. The raw setting path and returned value remain visible so that administrators can distinguish Microsoft data from the application's interpretation.

### DLP Policies

DLP Policies are loaded manually from a separate administrative surface and can include:

- Policy name and identifier.
- Policy scope.
- Environment inclusion or exclusion information when returned.
- Business/Confidential connector count.
- Non-business/General connector count.
- Blocked connector count.
- Policy creation or modification information when returned.
- Connector-group details available in the response.

The application does not assume that an omitted connector is safe or blocked. DLP interpretation must take into account the default connector group and the exact policy scope.

### Environment Settings

Environment Settings are loaded for one selected environment at a time to avoid issuing hundreds of calls across a large tenant.

The application performs separate requests for:

- Environment details.
- Environment management settings.

The results are grouped into meaningful sections such as:

- Copilot Studio.
- Power Apps.
- Power Pages.
- Dynamics 365.
- Security.
- Storage and access controls.
- Other settings.

The two calls use `Promise.allSettled`, allowing available information to remain visible if one request succeeds and the other fails.

### Demonstration mode

A fictional dataset is included so that the interface, filters, tabs, reports, and exports can be evaluated without connecting to a tenant.

Demonstration mode can be opened from the interface or by adding:

```text
?demo=1
```

to the application URL.

Example:

```text
https://GITHUB-USER.github.io/REPOSITORY-NAME/?demo=1
```

Demonstration data does not represent a real Microsoft tenant.

### Bilingual experience

The interface supports:

- Spanish.
- English.

The selected language is remembered in browser storage.

---

## Navigation model

The application contains six primary tabs:

1. **Overview**
2. **Environments**
3. **Resources**
4. **Tenant Governance**
5. **DLP Policies**
6. **Environment Settings**

When **Resources** is selected, a second navigation row appears for:

- All loaded resources.
- Canvas apps.
- Model-driven apps.
- Code apps.
- App Builder apps.
- Cloud flows.
- Agent flows.
- Microsoft 365 workflow agent flows.
- Copilot Studio agents.

Each resource tab displays:

- The aggregated expected count from the Overview query.
- The number of detailed records currently loaded.
- The dataset status.
- Page progress.
- Last refresh time.
- Whether the dataset was restored from cache.
- Actions appropriate to the current state.

---

## Supported inventory resources

The application queries the `PowerPlatformResources` table for these resource types:

| Category | Resource | Inventory type |
|---|---|---|
| Apps | Canvas apps | `microsoft.powerapps/canvasapps` |
| Apps | Model-driven apps | `microsoft.powerapps/modeldrivenapps` |
| Apps | Code apps | `microsoft.powerapps/codeapps` |
| Apps | App Builder apps | `microsoft.powerapps/apps` |
| Flows | Cloud flows | `microsoft.powerautomate/cloudflows` |
| Flows | Agent flows | `microsoft.powerautomate/agentflows` |
| Flows | Microsoft 365 workflow agent flows | `microsoft.powerautomate/m365agentflows` |
| Agents | Copilot Studio and supported Agent Builder agents | `microsoft.copilotstudio/agents` |
| Platform | Environments | `microsoft.powerplatform/environments` |
| Platform | Environment groups | `microsoft.powerplatform/environmentgroups` |

The exact fields returned vary by resource type and Microsoft inventory schema availability.

---

## How the modular query model works

The application deliberately avoids a monolithic "download everything" operation during sign-in.

### Phase 1: lightweight bootstrap

After authentication, three independent queries run:

#### 1. Aggregated summary

The mandatory summary uses the Microsoft-documented compatibility pattern and groups resources by:

- Resource type.
- Region.

A second, optional aggregation groups resources by Environment ID. It is isolated from the mandatory summary: if a tenant rejects that extra grouping with HTTP 400, the Overview still loads its type and region totals. Environment resource counts are then shown when the optional aggregation is accepted or when detailed resources have been loaded.

This design supplies the Overview KPIs and expected counts without retrieving every detailed record, while preventing a tenant-specific rejection of the environment aggregation from blocking the whole application.

#### 2. Environments and environment groups

A dedicated query retrieves only environment-related fields, including display name, region, type, Managed Environment status, environment-group context, description, and last-modified information where available.

#### Stable aliases for real-tenant responses

Azure Resource Graph can return projected nested properties as top-level columns. The application therefore projects stable aliases such as `displayName`, `environmentId`, `createdAt`, `lastModifiedAt`, `ownerId`, and `createdBy`, and its normalisation layer accepts both nested and projected response shapes.

Environment identifiers are canonicalised so values such as `/providers/Microsoft.PowerPlatform/environments/<guid>` and `<guid>` resolve to the same environment. Tables and selectors display the environment name while retaining the GUID internally for API calls.

#### 3. Recent activity

A limited query retrieves the most recently modified resource records. The default limit is 40 records.

These three datasets are isolated. A failure in one does not automatically remove the other two.

### Phase 2: manual detailed queries

Detailed records are loaded separately for each resource type.

Available actions include:

- **Load first 1,000** — retrieves the first page.
- **Load next 1,000** — retrieves the next page using the returned `skipToken`.
- **Load all remaining** — continues paging until the dataset is complete or a controlled stop occurs.
- **Cancel** — aborts only the selected dataset request.
- **Reload** — clears the current in-memory result and starts the dataset again.
- **Clear** — removes the dataset from memory and IndexedDB.
- **Load full inventory** — places incomplete resource types in a sequential queue.

### Phase 3: optional administrative queries

The following datasets are never required for the main inventory and are loaded only after an explicit action:

- Tenant Governance.
- DLP Policies.
- Environment Details.
- Environment Settings.

This reduces consent prompts, request volume, page-load time, and the effect of preview or legacy endpoints being unavailable.

### Sequential full-inventory queue

The **Load full inventory** action does not start all resource types in parallel. It processes them sequentially.

This design:

- Reduces the likelihood of throttling.
- Avoids excessive browser memory growth at the same instant.
- Makes progress easier to understand.
- Allows the queue to be cancelled.
- Preserves completed datasets if a later type fails.

---

## Query centre and dataset states

The Query Centre provides a consolidated view of each dataset.

A dataset can be in one of these states:

| State | Meaning |
|---|---|
| Not loaded | No detailed records have been retrieved. |
| Loading | A request or page sequence is running. |
| Partially loaded | Some records are available, but more pages exist or a later page failed. |
| Loaded | The dataset has reached the final page. |
| Loaded from cache | Records were restored from IndexedDB. |
| Cancelled | The user cancelled the current operation. Existing records remain available. |
| Error | The operation failed. Partial records may still be retained. |
| Unavailable | An optional administrative source could not be used. |

For paged resource datasets, the state includes:

- Page number.
- Detailed record count.
- Expected aggregated count where available.
- Current `skipToken` state.
- Completion indicator.
- Last-loaded timestamp.
- Error details and correlation ID when available.
- Query name, endpoint, and the submitted JSON query body for HTTP diagnostics. Access tokens and authorisation headers are never included.

A partial dataset is never presented as a complete detailed inventory.

---

## Performance, timeout, and throttling controls

The solution includes several controls for large tenants and unstable network conditions.

### Default controls

| Control | Default |
|---|---:|
| Inventory page size | 1,000 records maximum |
| Inventory request timeout | 45 seconds |
| Administrative request timeout | 30 seconds |
| Maximum inventory pages per dataset | 2,000 |
| Maximum DLP pages | 500 |
| Recent-resource limit | 40 records |
| Full-inventory concurrency | Sequential |

### Retry policy

Every query option is clamped to the Azure Resource Graph maximum of 1,000 records. Values above 1,000 are never sent to the Inventory API.

The application retries transient responses for:

- HTTP 429.
- HTTP 502.
- HTTP 503.
- HTTP 504.
- Transient request timeout conditions.

When present, the Microsoft `Retry-After` header is respected. Otherwise, exponential backoff with jitter is used.

### Loop protection

The application detects:

- A repeated inventory `skipToken`.
- A repeated DLP `nextLink`.
- An excessive number of pages.

These controls prevent an unexpected API response from creating an unbounded loop.

### Partial-result preservation

If a later page fails after earlier pages were retrieved, the successful records remain available. The dataset is marked as partial and can still be:

- Reviewed.
- Filtered.
- Exported.
- Retried.
- Cleared.

### Cancellation

Each large query has an independent `AbortController`. Cancelling cloud flows, for example, does not cancel Canvas apps, environments, DLP, or Tenant Governance.

---

## Data sources and endpoints

The application visibly identifies which source supports each section.

| View | Data source | Endpoint or table | Loading model |
|---|---|---|---|
| Overview | Power Platform Inventory API | `PowerPlatformResources` | Automatic lightweight query |
| Environments | Power Platform Inventory API | `PowerPlatformResources` | Automatic lightweight query |
| Resources | Power Platform Inventory API | `PowerPlatformResources` | Manual by resource type |
| Tenant Governance | Business Application Platform API | `listtenantsettings` | Manual |
| DLP Policies | Business Application Platform administrative API | `apiPolicies` | Manual |
| Environment Settings | Power Platform Environment Management API | Environment details and settings | Manual per environment |

### Inventory endpoint

```http
POST https://api.powerplatform.com/resourcequery/resources/query?api-version=2024-10-01
```

The request body contains a structured query specification that Microsoft translates for execution against Azure Resource Graph.

### Environment endpoints

```http
GET https://api.powerplatform.com/environmentmanagement/environments/{environmentId}?api-version=2024-10-01
```

```http
GET https://api.powerplatform.com/environmentmanagement/environments/{environmentId}/settings?api-version=2024-10-01
```

### Tenant Governance endpoint

```http
POST https://api.bap.microsoft.com/providers/Microsoft.BusinessAppPlatform/listtenantsettings?api-version=2020-10-01
```

This Microsoft endpoint is documented as preview and can change.

### DLP endpoint

```http
GET https://api.bap.microsoft.com/providers/Microsoft.BusinessAppPlatform/scopes/admin/apiPolicies?api-version=2016-11-01
```

This surface is treated as legacy/best effort. Its availability, CORS behaviour, response schema, and permissions can differ between tenants.

### Fixed endpoint allowlist

The browser application only connects to the required Microsoft hosts:

```text
login.microsoftonline.com
api.powerplatform.com
api.bap.microsoft.com
```

Users cannot provide arbitrary API endpoints or token audiences through the interface.

---

## Authentication and permissions

### Authentication flow

The application uses:

- Microsoft Entra ID.
- `@azure/msal-browser`.
- OAuth 2.0 Authorization Code Flow with PKCE.
- Interactive user authentication.
- Delegated permissions.
- `sessionStorage` for the MSAL cache.

No client secret is required or supported.

### Power Platform API application ID

When adding Power Platform API permissions, confirm this Application ID:

```text
8578e004-a5c6-46e7-913e-12f58912df43
```

### Required delegated permission

The inventory requires:

```text
ResourceQuery.Resources.Read
```

Requested scope:

```text
https://api.powerplatform.com/ResourceQuery.Resources.Read
```

### Optional delegated permissions

Environment Settings require:

```text
EnvironmentManagement.Environments.Read
EnvironmentManagement.Settings.Read
```

Requested scopes:

```text
https://api.powerplatform.com/EnvironmentManagement.Environments.Read
https://api.powerplatform.com/EnvironmentManagement.Settings.Read
```

### Business Application Platform token

Tenant Governance and DLP request a token for:

```text
https://api.bap.microsoft.com/.default
```

The token is requested only when one of those tabs is loaded. An additional Microsoft consent or authentication prompt may therefore appear.

### Administrative roles

For tenant-wide Power Platform inventory, Microsoft requires one of these tenant-wide roles:

- Power Platform Administrator.
- Dynamics 365 Administrator.

DLP and environment-level operations can have different role requirements depending on policy scope and environment configuration. The signed-in user's role, environment security roles, tenant consent policy, Conditional Access, and API-specific authorisation all affect the final result.

---

## Microsoft Entra App Registration

### 1. Create the registration

1. Open Microsoft Entra admin centre.
2. Go to **Identity > Applications > App registrations**.
3. Select **New registration**.
4. Enter a name such as:

```text
Power Platform Tenant Inventory Explorer
```

5. Select **Accounts in this organisational directory only**.
6. Register the application.
7. Copy:
   - **Application (client) ID**.
   - **Directory (tenant) ID**.

These are public identifiers, not passwords.

Do not create:

- A client secret.
- A certificate credential.
- A password credential.

### 2. Register the SPA redirect URI

The GitHub Pages project URL normally follows this format:

```text
https://GITHUB-USER.github.io/REPOSITORY-NAME/
```

In the App Registration:

1. Open **Authentication**.
2. Select **Add a platform**.
3. Select **Single-page application**.
4. Add the exact GitHub Pages URL.
5. Include the trailing `/`.
6. Save the configuration.

For local development, optionally add:

```text
http://localhost:5173/
```

The application displays the exact redirect URI detected by the browser so it can be copied.

Do not register the GitHub Pages URL as a traditional **Web** redirect URI.

### 3. Add the inventory permission

1. Open **API permissions**.
2. Select **Add a permission**.
3. Select **APIs my organisation uses**.
4. Search for **Power Platform API**.
5. Confirm Application ID `8578e004-a5c6-46e7-913e-12f58912df43`.
6. Select **Delegated permissions**.
7. Add `ResourceQuery.Resources.Read`.
8. Grant administrative consent if required by organisational policy.

### 4. Add optional Environment Settings permissions

Add:

```text
EnvironmentManagement.Environments.Read
EnvironmentManagement.Settings.Read
```

These permissions are not required to use the core inventory.

### 5. Review consent and Conditional Access

Validate:

- Whether users may grant delegated consent.
- Whether administrative consent is required.
- Whether MFA applies to the application or Microsoft resource APIs.
- Whether browser access to the APIs is allowed from the GitHub Pages origin.
- Whether corporate proxies or secure web gateways alter CORS responses.

---

## Using the application

### 1. Open the site

Open the GitHub Pages URL in a modern browser.

### 2. Enter the public identifiers

Enter:

- Application Client ID.
- Directory Tenant ID.

Optionally select **Remember configuration**. This stores only the two public identifiers in local browser storage.

### 3. Sign in

Select **Connect to tenant** and complete Microsoft authentication, including MFA when required.

### 4. Review the Overview

The three bootstrap queries run independently. Review their status in the Query Centre.

The Overview can be refreshed without clearing manually loaded detailed resource datasets.

### 5. Load detailed resources

Open **Resources**, select a resource-type tab, and choose one of the load actions.

For an initial assessment, a practical sequence is:

1. Load the first page of Canvas apps.
2. Load the first page of cloud flows.
3. Load the first page of Copilot Studio agents.
4. Review counts and governance signals.
5. Load all remaining pages only for the types needed for the report.

### 6. Review an environment

Open **Environments** and choose:

- **Filter resources** to move to the Resources view for that environment.
- **Open settings** to load details and settings for that environment.

### 7. Load optional governance sources

Open:

- **Tenant Governance** and select the load action.
- **DLP Policies** and select the load action.
- **Environment Settings**, select an environment, and load it.

These actions may request additional consent.

### 8. Export results

Use CSV, JSON, or PDF after loading the datasets required for the assessment.

### 9. Clear local data on shared devices

Select **Clear cache** before leaving a shared or unmanaged computer.

Signing out ends the authenticated session, but intentionally does not silently delete all previously cached inventory.

---

## Exports and executive PDF report

### CSV

CSV export contains the detailed resource rows currently loaded and matching the active filters.

Columns include:

- Name.
- Resource type.
- Resource ID.
- Environment.
- Environment ID.
- Environment type.
- Region.
- Owner ID.
- Created by.
- Created at.
- Last modified at.
- Managed Environment indicator.
- Quarantine indicator.
- Trigger.
- Trigger operation.
- Connector identifiers.

The file includes a UTF-8 byte-order mark for improved compatibility with Microsoft Excel.

### JSON

JSON export contains normalised resource records without the internal raw-response object.

The export includes:

- Export timestamp.
- Record count.
- Record array.

### PDF

The executive PDF is generated locally in the browser. No tenant data is sent to an external PDF service.

Before generation, the application evaluates report readiness. When any bootstrap query, detailed resource dataset, or optional administrative source remains pending or partial, a modal lists the incomplete areas and requires an explicit decision:

- **Continue and export** generates the report using the data currently available.
- **Cancel export** returns to the application without creating a file.

This validation prevents an incomplete report from being exported silently while preserving the administrator's ability to produce a deliberate point-in-time report.

Depending on which datasets have been loaded, the report can include:

- Branded cover page.
- Tenant and user context.
- Report-generation date.
- Aggregated KPIs.
- Resource distribution by type.
- Resource distribution by region.
- Leading environments.
- Governance signals.
- Tenant Governance summary.
- DLP Policy summary.
- Environment Settings summary.
- Detailed inventory appendix.
- Data-source and completeness notes.
- Known limitations.
- LinkedIn link.
- Book calls to action.

The appendix includes up to 250 rows from the filtered and sorted detailed view. CSV should be used when the complete loaded detail is required.

### Book-cover handling

Book covers are packaged as local assets under:

```text
public/assets/book-covers/
```

They are converted to image data and embedded in the PDF. The report does not depend on Amazon image hosting or cross-origin canvas access for the covers.

The Copilot Studio covers supplied by the repository owner use unique filenames:

```text
copilot-studio-coe-es-original-a4.jpg
copilot-studio-coe-en-original-a4.jpg
```

Their original 1414 × 2000 portrait ratio is preserved in both the SPA and PDF. Unique filenames also prevent a browser or GitHub Pages edge cache from reusing an earlier incorrect thumbnail.

### Completeness labelling

The PDF distinguishes between:

- Aggregated tenant totals.
- Detailed datasets loaded manually.
- Data restored from cache.
- Optional administrative sources not loaded.
- Partial datasets.

A report should not be interpreted as a complete tenant assessment when the relevant detailed resource types or administrative sources were not loaded. The pre-export readiness dialog makes that condition visible before the user confirms the export.

---

## Browser cache and data lifecycle

### Storage locations

| Browser storage | Purpose |
|---|---|
| `sessionStorage` | MSAL token cache and current public App Registration configuration |
| `localStorage` | Optional remembered Client ID/Tenant ID and selected language |
| `IndexedDB` | Tenant inventory and query datasets |

### IndexedDB design

Cached dataset keys include:

- Tenant ID.
- Dataset name.
- Resource type where applicable.
- Cache-schema version.

The current cache schema is **v3**. This revision invalidates earlier cached rows that could contain GUID-only labels or missing projected metadata after the real-tenant field-mapping update.

Examples of cached datasets include:

- Summary.
- Environments.
- Recent resources.
- Canvas apps.
- Cloud flows.
- Copilot Studio agents.

### Data that can be cached

The cache can contain administrative information such as:

- Resource names.
- Environment identifiers.
- Owner and creator object identifiers.
- Connector identifiers.
- Dates.
- Regions.
- Resource status.

### Data never stored in IndexedDB

- Access tokens.
- Refresh tokens.
- Passwords.
- Client secrets.
- Certificates.

### Cache behaviour

- Cached datasets are scoped to the Tenant ID.
- Changing tenant configuration resets active application state.
- The application can continue without IndexedDB if the browser blocks it or quota is unavailable.
- **Clear cache** removes cached data for the current tenant.
- Individual resource datasets can also be cleared separately.

---

## Security model

### Public-client design

This is a public browser client. A browser application cannot protect an embedded secret, so the solution intentionally uses no secret-based authentication.

### Token handling

- MSAL manages tokens.
- Tokens remain in `sessionStorage`.
- Tokens are not included in URL parameters.
- Tokens are not written to exports.
- Full tokens are not logged to the console.
- Optional API tokens are requested only when required.

### Input validation

- Client ID and Tenant ID must be valid GUIDs.
- The Entra authority is constructed internally from the validated Tenant ID.
- Redirect URIs are derived from the current site URL.
- API endpoints are fixed in source code.

### Output encoding

- API-sourced strings are escaped before HTML rendering.
- API responses are never evaluated as JavaScript.
- Raw tenant values are treated as untrusted input.

### Content Security Policy

The production page contains a restrictive Content Security Policy covering:

- Scripts.
- Styles.
- Images.
- Connections.
- Frames.
- Object embedding.

The policy permits only the origins required by the application and its Microsoft authentication/API flows.

### No write operations

The solution does not contain actions to:

- Change Tenant Governance settings.
- Create or modify DLP policies.
- Update Environment Settings.
- Delete resources.
- Reassign owners.
- Change licences.
- Create environments.

All administrative views are read-only.

### CORS validation gate

A successful Entra sign-in does not guarantee that every API permits direct browser access from every tenant, network, and GitHub Pages origin.

The final deployment must validate each API from the production URL.

When CORS or corporate network controls block an endpoint:

- Do not disable browser security.
- Do not add credentials to the SPA.
- Do not use an unrestricted public proxy.
- Use a separately reviewed API façade or proxy.
- Validate incoming user tokens.
- Restrict outbound destinations with an allowlist.
- Apply an On-Behalf-Of pattern where supported.

See [SECURITY.md](./SECURITY.md) for the focused security model.

---

## GitHub Pages deployment

The repository supports two deployment approaches.

### Option A: GitHub Actions from source

Use this approach when the repository contains the complete source project.

The included workflow is:

```text
.github/workflows/deploy-pages.yml
```

On a push to `main`, the workflow:

1. Checks out the repository.
2. Uses Node.js 22.
3. Installs dependencies.
4. Runs the version-policy check.
5. Runs automated tests.
6. Builds the production application.
7. Uploads `dist/` as the Pages artifact.
8. Deploys to GitHub Pages.

Configure the repository:

```text
Settings
→ Pages
→ Source
→ GitHub Actions
```

### Option B: manual upload of the compiled package

Use this approach when Git and Node.js are not installed.

The precompiled package contains:

```text
index.html
.nojekyll
assets/
```

Upload those items directly to the repository root.

The final repository structure must be:

```text
REPOSITORY-NAME/
├── index.html
├── .nojekyll
└── assets/
    ├── book-covers/
    ├── nfba-logo.svg
    ├── index-*.js
    ├── index-*.css
    └── pdf-export-*.js
```

Configure:

```text
Settings
→ Pages
→ Deploy from a branch
→ main
→ /(root)
```

Do not upload the ZIP itself. Upload its extracted contents.

### Updating a manual deployment

1. Extract the new compiled package.
2. Open the repository in GitHub.
3. Select **Add file > Upload files**.
4. Upload the new `index.html`.
5. Upload the complete new `assets` folder.
6. Upload `.nojekyll`.
7. Commit directly to `main`.
8. Wait for Pages deployment to finish.
9. Refresh the browser with `Ctrl + F5` or `Cmd + Shift + R`.

Old hashed assets can remain temporarily because the new `index.html` references only the current filenames. They can be deleted later for housekeeping.

See [ACTUALIZAR_GITHUB_PAGES_MANUALMENTE.md](./ACTUALIZAR_GITHUB_PAGES_MANUALMENTE.md) for the Spanish step-by-step guide.

---

## Local development

### Prerequisites

- Node.js 22.12.0 or later.
- npm.
- A Microsoft Entra App Registration.
- An allowed SPA redirect URI for `http://localhost:5173/`.

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

Open:

```text
http://localhost:5173/
```

### Run tests

```bash
npm test
```

### Create a production build

```bash
npm run build
```

Output:

```text
dist/
```

### Preview the production build

```bash
npm run preview
```

### Version-policy check

The build and test commands run:

```bash
npm run check:version
```

This verifies that:

- `package.json` remains `1.0.0`.
- `APP_VERSION` remains `1.0`.
- Public documentation does not contain an unintended higher public version.

Do not change the version unless the repository owner explicitly requests it.

---

## Testing and validation

The project uses Vitest for automated tests.

The test suite covers:

- Inventory query construction.
- Lightweight summary query construction.
- Environment query construction.
- Recent-resource query construction.
- Per-resource-type and one-resource detail query construction.
- Stable top-level aliases for nested inventory properties.
- Canonical environment-ID matching and display-name resolution.
- Connector-detail detection and operation normalisation.
- PDF readiness confirmation behaviour and local cover-asset rules.
- Pagination.
- Retry and API error handling.
- Repeated-token protection.
- Data normalisation.
- Environment mapping.
- Filtering and sorting.
- Metric calculation.
- DLP policy normalisation.
- Tenant-setting flattening and assessment.
- Environment-setting grouping.
- Cache-key scoping and schema versioning.
- CSV helper behaviour.
- PDF helper behaviour.
- Local book-cover asset handling.
- Public version-policy enforcement.

Current validation includes:

- JavaScript syntax validation.
- Automated unit tests.
- Production Vite build.
- Production dependency audit.
- PDF generation.
- PDF rendering and visual review of book covers.

Tenant-dependent behaviour still requires validation after deployment because the build environment does not have access to the target Microsoft tenant.

See [VALIDATION.md](./VALIDATION.md) for the detailed validation record.

Additional repository documentation:

- [App Registration and tenant setup — English and Spanish](./APP_REGISTRATION_AND_TENANT_SETUP.md)
- [Troubleshooting guide](./TROUBLESHOOTING.md)
- [Security model](./SECURITY.md)
- [Canonical MIT licence](./LICENSE)
- [Bilingual licence information](./LICENSE.md)
- [Changelog](./CHANGELOG.md)
- [Manual GitHub Pages update guide](./ACTUALIZAR_GITHUB_PAGES_MANUALMENTE.md)

---

## Project structure

```text
power-platform-tenant-inventory-explorer/
├── .github/
│   └── workflows/
│       └── deploy-pages.yml
├── public/
│   ├── .nojekyll
│   └── assets/
│       ├── book-covers/
│       │   ├── coe-power-platform-en.jpg
│       │   ├── coe-power-platform-es.jpg
│       │   ├── copilot-studio-coe-en.jpg
│       │   └── copilot-studio-coe-es.jpg
│       └── nfba-logo.svg
├── scripts/
│   └── check-version.mjs
├── src/
│   ├── api.js
│   ├── app.js
│   ├── auth.js
│   ├── cache.js
│   ├── constants.js
│   ├── data.js
│   ├── demo-data.js
│   ├── export.js
│   ├── helpers.js
│   ├── i18n.js
│   ├── main.js
│   ├── pdf-export.js
│   └── styles.css
├── tests/
│   ├── api.test.js
│   ├── data.test.js
│   ├── export.test.js
│   ├── governance.test.js
│   ├── helpers.test.js
│   └── query-refactor.test.js
├── ACTUALIZAR_GITHUB_PAGES_MANUALMENTE.md
├── APP_REGISTRATION_AND_TENANT_SETUP.md
├── CHANGELOG.md
├── LICENSE
├── LICENSE.md
├── README.md
├── SECURITY.md
├── TROUBLESHOOTING.md
├── VALIDATION.md
├── index.html
├── package-lock.json
├── package.json
└── vite.config.js
```

### Main source responsibilities

| File | Responsibility |
|---|---|
| `src/auth.js` | MSAL configuration, sign-in, token acquisition, and sign-out |
| `src/api.js` | Query construction, HTTP calls, pagination, timeout, retry, and errors |
| `src/cache.js` | Tenant-scoped IndexedDB persistence |
| `src/constants.js` | App metadata, endpoints, scopes, resource types, limits, and books |
| `src/data.js` | Normalisation, aggregation, filters, sorting, governance analysis |
| `src/app.js` | Application state, rendering, events, query orchestration, and UI |
| `src/export.js` | CSV and JSON export |
| `src/pdf-export.js` | Executive PDF generation and local book-cover embedding |
| `src/demo-data.js` | Fictional demonstration datasets |
| `src/i18n.js` | Spanish and English interface strings |
| `src/styles.css` | Responsive CoE Toolkit visual identity |
| `scripts/check-version.mjs` | Fixed v1.0 policy enforcement |

---

## Known limitations

### Microsoft inventory limitations

Microsoft currently documents limitations that can affect interpretation, including:

- Inventory changes can take approximately 15 minutes to appear.
- Connector inventory is a preview capability and can be incomplete. It is emitted only for the resource types documented by Microsoft; unsupported types show **Not available**.
- Modified date and last-modified-by information can be unavailable for agents.
- The owner shown for cloud flows and agent flows can represent the creator rather than a later owner change.
- Only published model-driven apps are included.
- Some preinstalled model-driven apps in the Default Environment may not appear until edited and republished.
- Classic chatbots are not included in the new inventory.
- Resource-detail pages can require permissions beyond tenant-wide inventory access.
- Power Platform inventory represents agents built on Power Platform; it is not a catalogue of every agent available in Microsoft 365.
- Power Platform inventory is not available in every sovereign or air-gapped cloud.

### Application limitations

- The SPA depends on browser CORS access to Microsoft endpoints.
- Tenant Governance uses a preview endpoint.
- DLP retrieval uses an administrative endpoint treated as legacy/best effort.
- DLP response shapes may vary.
- The application does not calculate authoritative DLP impact across every connector default-group rule.
- Detailed exports include only resource types loaded manually or restored from cache.
- Incremental deletion detection is not implemented because deleted-resource tombstones are not exposed through the current application model.
- The PDF appendix is limited to 250 detailed rows.
- The tool does not retrieve tenant licensing or storage-capacity reports.
- The tool does not modify any Microsoft configuration.

### Browser and device limitations

- Very large detailed inventories consume browser memory.
- IndexedDB quotas vary by browser and device.
- Private browsing can limit persistent storage.
- Corporate browsers can block pop-ups needed for optional consent.
- Secure web gateways can interfere with API responses or CORS headers.

---

## Troubleshooting

### Redirect URI mismatch

**Symptom:** Microsoft reports that the redirect URI does not match.

Check that Entra contains the exact URL:

```text
https://GITHUB-USER.github.io/REPOSITORY-NAME/
```

Verify:

- `https` is used.
- The GitHub username is correct.
- The repository name matches exactly.
- The trailing slash is present.
- The platform type is **Single-page application**.

### Access denied or forbidden

Check:

- `ResourceQuery.Resources.Read` is configured.
- Consent has been granted.
- The user has Power Platform Administrator or Dynamics 365 Administrator.
- The Client ID belongs to the Tenant ID entered.
- Conditional Access requirements were completed.

### Power Platform API returns HTTP 400

HTTP 400 normally means that the service rejected the submitted query specification. It is different from an authentication or role error.

The current v1.0 compatibility build uses the Microsoft-documented summary pattern (`count` grouped by `type` and `location`) as the mandatory Overview query. The additional Environment ID aggregation is executed separately and cannot prevent the mandatory summary from loading.

Open **Details** on the failed dataset. The application displays:

- The message returned by Power Platform API.
- The internal query name.
- The endpoint.
- The correlation ID, when supplied by Microsoft.
- The exact JSON request body, excluding the token and authorisation headers.

Use that information to determine which dataset failed. Typical examples are:

- `overview-summary-by-type-and-region`
- `overview-summary-by-environment`
- `overview-environments`
- `overview-recent-resources`
- `resources-cloudFlows`

If only `overview-summary-by-environment` fails, the application continues with the main summary and the tenant can still be explored. For any other HTTP 400, copy the service message, correlation ID, query name, and request body before opening an issue.

### Names appear as GUIDs or metadata columns are blank

After replacing an earlier deployment:

1. Upload the new `index.html` and complete `assets/` folder together.
2. Hard-refresh the browser.
3. Select **Clear cache**.
4. Reconnect and reload the affected dataset.

The current build uses stable projected aliases and cache schema v3. A GUID remains visible only as a fallback when Microsoft does not emit a display name.

### Loading connector details

For supported rows, select **Load** in the Connectors column. The application runs a one-resource detail query and updates the row after the modal receives connector data. Unsupported resource types display **Not available**.

### Overview loads but a detailed type fails

- Retry the selected dataset.
- Load only the first page.
- Review the correlation ID in the error.
- Check whether HTTP 429, 502, 503, or 504 was returned.
- Confirm that a corporate proxy is not terminating long requests.
- Use the partial records already retrieved when appropriate.

### Query remains in Loading

The application applies a request-level timeout. When an issue persists:

- Select **Cancel**.
- Retry the dataset.
- Clear that dataset.
- Refresh the Overview.
- Review browser developer tools for blocked network requests.

### Tenant Governance or DLP requests additional consent

This is expected because those views request the Business Application Platform token only when selected.

Ensure pop-ups are allowed for the site.

### Tenant Governance or DLP shows unavailable

Possible causes include:

- Insufficient role.
- Consent restrictions.
- Endpoint changes.
- Preview/legacy availability.
- Browser CORS restrictions.
- Corporate network controls.

The main inventory can continue to function independently.

### Environment Settings fails

Check that the App Registration has:

```text
EnvironmentManagement.Environments.Read
EnvironmentManagement.Settings.Read
```

Also verify that the user has access to the selected environment and that the Environment Management preview surface is available.

### Page displays without styling

Verify that:

- `index.html` is in the repository root.
- The complete `assets` folder was uploaded.
- Asset filenames were not renamed.
- GitHub Pages points to `main` and `/(root)` for a manual deployment.

### PDF reports pending data

The readiness dialog is expected when any query is idle, loading, partial, cancelled, or failed. Review the listed sources and choose **Continue and export** only when a partial report is acceptable.

### PDF does not show book covers

Verify that these files exist in the deployed site:

```text
assets/book-covers/coe-power-platform-es.jpg
assets/book-covers/copilot-studio-coe-es-original-a4.jpg
assets/book-covers/coe-power-platform-en.jpg
assets/book-covers/copilot-studio-coe-en-original-a4.jpg
```

Upload the complete `assets` folder rather than only the JavaScript and CSS files.

### Old version remains visible after deployment

Use a hard refresh:

```text
Windows: Ctrl + F5
macOS: Cmd + Shift + R
```

Alternatively, open a private browsing window.

### Cached tenant data remains on a shared computer

Use **Clear cache** before signing out.

---

## Operational recommendations

For a controlled tenant assessment:

1. Use a dedicated App Registration owned by the organisation.
2. Grant only delegated read permissions required by the selected features.
3. Restrict access to appropriate administrators.
4. Validate the production GitHub Pages origin.
5. Start with the lightweight Overview.
6. Load large resource types only when needed.
7. Avoid starting multiple browser sessions against the same large tenant unnecessarily.
8. Clear cache on shared devices.
9. Store exported files according to organisational data-classification rules.
10. Treat preview and legacy administrative endpoints as optional evidence sources.
11. Record which datasets were loaded when distributing a PDF.
12. Use a reviewed backend proxy if direct browser API access is not permitted.

---

## Official Microsoft references

- Power Platform inventory:  
  https://learn.microsoft.com/en-us/power-platform/admin/power-platform-inventory

- Power Platform inventory API:  
  https://learn.microsoft.com/en-us/power-platform/admin/inventory-api

- Power Platform inventory schema:  
  https://learn.microsoft.com/en-us/power-platform/admin/inventory-schema

- Power Platform API permission reference:  
  https://learn.microsoft.com/en-us/power-platform/admin/programmability-permission-reference

- Power Platform API authentication:  
  https://learn.microsoft.com/en-us/power-platform/admin/programmability-authentication-v2

- Environment Management Settings tutorial:  
  https://learn.microsoft.com/en-us/power-platform/admin/programmability-tutorial-environmentmanagement-settings

- List tenant settings preview API:  
  https://learn.microsoft.com/en-us/power-platform/admin/list-tenantsettings

- Power Platform data policies:  
  https://learn.microsoft.com/en-us/power-platform/admin/prevent-data-loss

- MSAL Browser:  
  https://learn.microsoft.com/en-us/entra/msal/javascript/browser/about-msal-browser

- OAuth 2.0 Authorization Code Flow with PKCE:  
  https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow

- GitHub Pages:  
  https://docs.github.com/en/pages

---

## Author and further reading

Created as part of the CoE Toolkit by **Nico Fernandez**.

LinkedIn:  
https://www.linkedin.com/in/nfernandezba

The application includes calls to action for the Spanish and English editions of:

- *Defining the Framework Structure for the Power Platform Center of Excellence*.
- *Copilot Studio and the Future of the Power Platform Center of Excellence*.

The corresponding Spanish editions are also presented when the interface language is Spanish.

---

## Licence

This project is licensed under the MIT Licence.

See [LICENSE](./LICENSE).
