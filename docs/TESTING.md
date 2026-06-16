# Testing

## Automated source tests

The source project was validated with Vitest: **7 files and 55 tests passed**. The public package contains the test evidence rather than the development source.

## Test mode

Use either query string:

```text
?test=1
?mode=test
```

Expected behaviour:

- Authentication is bypassed.
- Demonstration inventory and administrative datasets are loaded.
- Owners use demonstration display names.
- Tenant Governance, DLP and Managed Environment Settings are available.
- The page exposes the current-report export and packaged sample-report download.

## Evidence files

- `tests/static-validation.json`: structural, path and version checks.
- `tests/browser-flow-results.json`: headless browser flow and console results.
- `tests/sample-download-results.json`: packaged PDF availability and signature check.

## Browser execution note

The package includes a static browser-flow contract result. Chromium navigation could not be executed in the artifact sandbox because it is blocked by administrator policy. Repeat the documented test-mode flow after GitHub Pages deployment.
