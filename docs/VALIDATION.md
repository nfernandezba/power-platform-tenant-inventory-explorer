# Validation report

Validation performed on 14 June 2026 for public version **v1.0**.

## Automated checks

- JavaScript version-policy validation: passed.
- Unit test files: **6 passed**.
- Unit tests: **36 passed**.
- Vite production build: passed.
- Production dependency audit: **0 known vulnerabilities**.
- Public-version policy: **v1.0 / package 1.0.0**.

## Test coverage

The automated suite covers:

- Microsoft-documented lightweight summary construction by resource type and region.
- Optional environment-count aggregation isolation and non-fatal HTTP 400 fallback.
- Inventory Query Options clamped to a maximum of 1,000 records.
- HTTP 400 diagnostics including query name, endpoint, correlation ID, and safe request body.
- Environment, recent-resource, per-resource-type, and resource-detail query construction.
- Ordering through simple aliases before projection.
- Quoted environment filters.
- Stable projected aliases for display name, environment ID, owner, creator, created date, modified date, and connector details.
- Normalisation of nested `properties`, top-level projected aliases, `properties.field`, and `properties_field` response shapes.
- Canonical environment ID matching between full provider paths and bare GUIDs.
- Environment display-name resolution for tables, filters, dropdowns, and detail dialogs.
- Connector-detail detection and connector operation normalisation.
- Tenant-scoped and schema-versioned IndexedDB cache keys.
- Cache schema v3, which invalidates incompatible GUID-only cached datasets.
- Inventory pagination, timeout, retry, cancellation, and API error handling.
- DLP normalisation.
- Tenant-setting flattening and assessment.
- Environment-count and Environment Settings grouping logic.
- CSV and PDF export helpers.
- Local book-cover embedding in the executive PDF.
- Original A4 Copilot Studio cover filenames and 1414 × 2000 aspect ratios.
- Public-version policy fixed at v1.0.

## Production build

The production output is available in `dist/` with relative asset paths suitable for a GitHub Pages project site.

Build summary:

- `dist/index.html`: approximately **1.78 KB**.
- Main CSS: approximately **34.46 KB**.
- Main JavaScript: approximately **350.65 KB**.
- Lazy PDF bundle: approximately **416.11 KB**.
- Production source maps: disabled.
- Asset references in `index.html`: verified.
- Local NFBA logo: included.
- Four local book covers: included.
- Original Copilot Studio covers: included as `copilot-studio-coe-es-original-a4.jpg` and `copilot-studio-coe-en-original-a4.jpg`.

## PDF validation

A five-page Spanish sample report was generated from the production PDF code and rendered to PNG at 160 DPI.

The final page was visually inspected and confirmed to show:

- The Spanish Copilot Studio cover supplied by the repository owner.
- The complete title, subtitle, edition, and author area without cropping.
- The original portrait aspect ratio without stretching.
- Both book cards without overlap or missing-image placeholders.
- The LinkedIn call to action and page footer in the expected positions.

The sample report is included in the complete delivery package as `SAMPLE_REPORT.pdf`.

## Runtime behaviours requiring tenant validation

The build environment cannot access the repository owner's tenant. Validate the following after deployment:

1. The GitHub Pages URL is registered exactly as a SPA redirect URI.
2. `ResourceQuery.Resources.Read` is consented.
3. The mandatory summary, environment inventory, and recent-resource queries complete independently.
4. Environment rows show `properties.displayName` rather than the environment GUID.
5. The Environment Settings selector shows display names and submits the associated environment ID internally.
6. Resource rows show display name, environment display name, owner/creator, created date, and modified date when emitted by the schema.
7. A full provider environment path and a bare environment GUID both map to the same environment.
8. Selecting **Load** in the Connectors column runs a detail query and updates the connector count for supported resource types.
9. Unsupported connector-inventory resource types show **Not available**.
10. The PDF readiness dialog appears when core, resource, or optional administrative data remains pending or partial.
11. **Cancel export** produces no PDF.
12. **Continue and export** generates a PDF while preserving the incomplete-data warning decision made by the user.
13. A resource type can load the first page, next page, and all remaining pages.
14. Cancellation stops only the selected dataset.
15. Partial results remain visible and are labelled partial after a later-page failure.
16. IndexedDB restores compatible cache schema v3 datasets after a reload.
17. **Clear cache** removes persistent data for the current Tenant ID.
18. Environment Management, Tenant Governance, and DLP sources continue to fail independently without blocking inventory.
19. CSV, JSON, and PDF exports correctly distinguish aggregate totals from loaded detail.
20. The SPA and PDF both show the new Copilot Studio cover for the selected language after a hard refresh.

## Browser visual validation note

The PDF was rendered and visually inspected. Full SPA regression testing should also be performed from the deployed GitHub Pages URL using `?demo=1` and a real tenant, because browser cache, Conditional Access, CORS, and tenant-specific result shapes cannot be fully simulated in the build environment.
