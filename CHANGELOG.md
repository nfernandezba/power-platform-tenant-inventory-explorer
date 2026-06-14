# Changelog

All public releases remain identified as **v1.0** unless the repository owner explicitly requests a version change.

## v1.0 — UX/UI, translations, and responsive mobile refinement

- Completed the Spanish and English navigation translations and aligned terminology across generic interface labels, filters, helper text, and status messages.
- Standardised the Spanish writing style and corrected inconsistent or ambiguous translations without changing official Microsoft product names.
- Added explicit, accessible language labels, restored the Spanish and English flag icons, and improved mobile language switching.
- Moved the overview PDF, CSV, and JSON download controls to the top of the page, before KPI and analytical content.
- Replaced horizontally hidden primary and resource navigation tabs with discoverable mobile selectors while preserving the desktop tab experience.
- Added a compact mobile progress indicator and stacked primary actions on narrow screens.
- Introduced a dedicated mobile resource-card view with mobile sorting, while retaining the full comparison table on larger screens.
- Increased mobile touch targets and secondary typography, and prevented page-level horizontal overflow.
- Added progressive disclosure for secondary dashboard, query, filter, activity, source, and promotional sections on mobile.
- Added guarded browser-storage access to improve resilience in restricted browsing contexts.
- Added automated translation parity and wording regression tests.
- Validated representative layouts at 320, 390, 768, 1,024, and 1,440 px.
- Kept the public and package versions fixed at v1.0 / 1.0.0.

## v1.0 — Managed Environment Settings eligibility and Spanish terminology

- Limited Environment Management Settings selection and API calls to environments explicitly marked as Managed.
- Replaced the settings action for Not Managed environments with a clear Not applicable state.
- Added a selector summary showing Managed environments available and Not Managed environments excluded.
- Treated `404 EnvironmentManagementSetting ... was not found` as Not configured for Managed Environments instead of a general error.
- Excluded non-applicable environment settings from the PDF readiness warning and recorded not-configured Managed Environment settings correctly in the PDF.
- Standardised Spanish terminology on **Gobernanza** across the SPA, PDF, and Spanish documentation.
- Kept the public and package versions fixed at v1.0 / 1.0.0.

## v1.0 — Tenant Governance and directory identity resolution

- Added live, read-only Tenant Governance loading through the delegated Power Apps Service `User` permission and runtime scope `https://service.powerapps.com//User`.
- Added a local JSON import fallback for tenant settings when the preview endpoint is blocked by CORS, Conditional Access, or tenant-specific service behaviour.
- Added Balanced governance, Restrictive enterprise, and Innovation-first local assessment baselines without introducing any tenant write operation.
- Added governance KPIs, categories, raw settings, source labels, local JSON export, caching, and PDF baseline/source metadata.
- Added Microsoft Graph delegated `User.ReadBasic.All` identity resolution for owner, creator, and last-modified-by user object IDs.
- Added JSON batching in groups of 20, local identity caching, explicit Resolve/Refresh actions, and GUID fallback for unresolved non-user objects.
- Updated resource tables, filters, CSV, details, and PDF appendices to prefer resolved full names and user principal names while retaining object IDs as technical references.
- Added tests for identity normalisation, Microsoft Graph batching, governance baseline assessment, and imported/live governance state.
- Kept the public and package versions fixed at v1.0 / 1.0.0.

## v1.0 — Real-tenant field mapping, PDF readiness, and connector detail update

- Replaced the Copilot Studio book-cover assets with the original Spanish and English A4 artwork supplied by the repository owner.
- Assigned unique `*-original-a4.jpg` filenames so browsers and GitHub Pages cannot reuse stale cover images from an earlier build.
- Preserved the original 1414 × 2000 aspect ratio in both the SPA and the generated PDF.
- Added a mandatory pre-export readiness dialog whenever bootstrap queries, detailed resource datasets, or optional administrative sources remain pending or partial.
- Added explicit **Continue and export** and **Cancel export** actions; the report is not generated until the user confirms.
- Added stable projected aliases for resource display name, environment ID, owner, creator, created date, modified date, managed status, and connector detail fields.
- Added compatibility with Azure Resource Graph responses that expose projected values as top-level columns instead of reconstructing the `properties` object.
- Canonicalised environment identifiers so full resource paths and bare GUIDs resolve to the same environment display name.
- Updated environment tables, resource tables, filters, and Environment Settings selectors to prefer display names while retaining GUIDs only as technical detail.
- Replaced the passive connector placeholder with an explicit **Load** action per supported resource. The action runs a detail query, opens the detail dialog, and updates the table with the connector count.
- Added a clear **Not available** state for resource types that do not emit connector inventory.
- Incremented the IndexedDB cache schema to invalidate older cached rows that contained GUID-only or incomplete field mappings.
- Added automated tests for top-level projected aliases, canonical environment IDs, detail connector data, quoted environment filters, original cover assets, and the fixed public version policy.
- Kept the public and package versions fixed at v1.0 / 1.0.0.

## v1.0 — Power Platform API HTTP 400 compatibility update

- Replaced the mandatory Overview aggregation with the Microsoft-documented summary pattern grouped by resource type and region.
- Moved the Environment ID aggregation into an optional, isolated query so its failure cannot block the main Overview.
- Clamped all Inventory API query-option page sizes to the Azure Resource Graph maximum of 1,000 records.
- Added query names to all Inventory API calls.
- Added safe diagnostics for failed queries: service message, endpoint, correlation ID, query name, and submitted JSON body.
- Confirmed that diagnostics never include access tokens or authorisation headers.
- Added automated tests covering HTTP 400 diagnostics, page-size clamping, and the non-fatal environment aggregation fallback.
- Kept the public and package versions fixed at v1.0 / 1.0.0.
