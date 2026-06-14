# Validation report

Validation performed on 14 June 2026 for public version 1.0.

## Automated checks

- JavaScript syntax validation: passed for all source and test files.
- Unit test files: 6 passed.
- Unit tests: 31 passed.
- Vite production build: passed.
- Production dependency audit: 0 known vulnerabilities in production dependencies.

## Test coverage

- Microsoft-documented lightweight summary query construction by type and region.
- Optional environment-count aggregation isolation and non-fatal HTTP 400 fallback.
- Inventory Query Options clamped to a maximum of 1,000 records.
- HTTP 400 diagnostics including query name, endpoint, correlation ID, and safe request body.
- Environment query construction.
- Recent-resource query construction.
- Per-resource-type query construction.
- Summary-row normalisation.
- Tenant-scoped and versioned cache keys.
- Existing inventory pagination and API error handling.
- DLP normalisation.
- Tenant-setting flattening and assessment.
- Environment-count and setting-group logic.
- CSV and PDF export helpers.
- Embedded local book-cover assets in the executive PDF.
- Public-version policy fixed at v1.0.

## Production build

The production output is available in `dist/` with relative asset paths suitable for a GitHub Pages project site. The build includes `.nojekyll`, `index.html`, the NFBA logo, all four local book-cover assets, the main JavaScript and CSS bundles, and the lazily loaded PDF bundle.

Production source maps are disabled. The complete source code is supplied separately and inside the complete delivery package under `developer-source/`.

Build summary:

- `dist/index.html`: approximately 1.78 KB.
- Main CSS: approximately 32.70 KB.
- Main JavaScript: approximately 342.78 KB.
- Lazy PDF bundle: approximately 416.06 KB.
- Asset references in `index.html`: verified against files in `dist/`.

## Runtime behaviours requiring tenant validation

No Microsoft tenant was available in the build environment. Validate the following after deployment:

1. GitHub Pages URL registered exactly as a SPA redirect URI.
2. `ResourceQuery.Resources.Read` consented.
3. The mandatory type-and-region summary, environment inventory, and recent-resource queries complete independently.
4. A rejected optional environment-count aggregation does not block the mandatory Overview summary.
5. A resource type can load the first page, next page, and all pages.
6. Cancellation stops only the selected dataset.
7. Timeouts and retries are presented without leaving the UI permanently in a loading state.
8. Partial results remain visible and are labelled partial after a later-page failure.
9. IndexedDB restores cached bootstrap and resource datasets after a reload.
10. **Clear cache** removes persistent data for the current Tenant ID.
11. Sequential full-inventory loading does not run all resource types concurrently.
12. Optional Environment Management permissions are consented and settings load for a selected environment.
13. Tenant Governance preview endpoint accepts a delegated BAP token.
14. DLP policy endpoint accepts the token and browser origin.
15. Conditional Access and MFA complete successfully.
16. CSV, JSON, and PDF exports correctly distinguish summary totals from loaded detail.

## PDF visual validation

A five-page Spanish sample report was generated from the production PDF code, rendered to PNG and inspected page by page. The final page shows both book-cover images as embedded graphics, with no clipping, overlap or missing-image placeholders. The cover files are served from the same GitHub Pages origin and converted to image data before PDF generation, so the export no longer depends on Amazon image delivery or cross-origin image permissions.

## SPA visual validation limitation

The production bundle was compiled and all automated tests passed. Full-browser visual regression of the SPA remains recommended in GitHub Actions or a developer workstation against `?demo=1`.
