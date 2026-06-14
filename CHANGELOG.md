# Changelog

All public releases remain identified as **v1.0** unless the repository owner explicitly requests a version change.

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
